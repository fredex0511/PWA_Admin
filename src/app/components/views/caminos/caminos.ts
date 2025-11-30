import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

// Interfaces
interface RoutePosition {
  x: number;
  y: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface ActiveRoute {
  id: string;
  name: string;
  userName: string;
  status: 'active' | 'paused' | 'emergency' | 'completed';
  currentLocation: string;
  startTime: Date;
  lastUpdate: Date;
  progress: number;
  mapPosition: RoutePosition;
  destination?: RoutePosition; // percentage position for destination (legacy)
  mapLatLng?: LatLng; // optional real lat/lng for origin
  destinationLatLng?: LatLng; // optional real lat/lng for destination
}


@Component({
  selector: 'app-caminos',
  imports: [CommonModule, IonicModule],
  templateUrl: './caminos.html',
  styleUrl: './caminos.css'
})
export class Caminos implements OnInit, OnDestroy {
  activeRoutes: ActiveRoute[] = [];
  selectedRoute: ActiveRoute | null = null;
  isMapFullscreen: boolean = false;
  private updateInterval: any;
  private liveMap: any = null;
  private liveMarker: any = null;
  private destMarker: any = null;
  private routePolylines: Map<string, any> = new Map();
  private destMarkers: Map<string, any> = new Map();
  private geocoder: any = null;
  private mapsLoaded = false;
  private directionsService: any = null;
  private directionsRenderer: any = null;
  private lastDirectionsAt: number = 0;
  private directionsThrottleMs: number = 5000; // ms
  // Track last geocode time per route to avoid spamming API
  private lastGeocodeAt: WeakMap<ActiveRoute, number> = new WeakMap();

  constructor() { }

  ngOnInit() {
    this.loadActiveRoutes();
    this.startLiveUpdates();
    this.loadGoogleMapsSdk()
      .then(() => {
        this.mapsLoaded = true;
        setTimeout(() => this.initLiveMap(), 0);
      })
      .catch(err => console.error('Error loading Google Maps SDK', err));
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.liveMarker) {
      this.liveMarker.setMap(null);
    }
    if (this.liveMap) {
      // nothing specific to destroy for Google Maps API
    }
  }

  // Data loading
  loadActiveRoutes() {
    // Mock data - replace with actual service call
    this.activeRoutes = [
      {
        id: '1',
        name: 'Camino a Casa',
        userName: 'María González',
        status: 'active',
        currentLocation: 'Av. Principal 123',
        startTime: new Date(Date.now() - 1200000), // 20 min ago
        lastUpdate: new Date(),
        progress: 65,
        // Torreón (hardcoded) - origin and destination lat/lng
        mapLatLng: { lat: 25.5430, lng: -103.4235 },
        destinationLatLng: { lat: 25.5560, lng: -103.4250 },
        // keep legacy percentage for UI positioning fallback
        mapPosition: { x: 35, y: 45 },
        destination: { x: 80, y: 30 }
      },
      {
        id: '2',
        name: 'Ruta al Trabajo',
        userName: 'Carlos Rodríguez',
        status: 'paused',
        currentLocation: 'Plaza Central',
        startTime: new Date(Date.now() - 900000), // 15 min ago
        lastUpdate: new Date(Date.now() - 300000), // 5 min ago
        progress: 80,
        mapLatLng: { lat: 25.5485, lng: -103.4180 },
        destinationLatLng: { lat: 25.5300, lng: -103.4300 },
        mapPosition: { x: 60, y: 30 },
        destination: { x: 20, y: 70 }
      },
      {
        id: '3',
        name: 'Camino a Universidad',
        userName: 'Ana Martínez',
        status: 'active',
        currentLocation: 'Calle de la Paz 45',
        startTime: new Date(Date.now() - 600000), // 10 min ago
        lastUpdate: new Date(),
        progress: 45,
        mapLatLng: { lat: 25.5470, lng: -103.4120 },
        destinationLatLng: { lat: 25.5600, lng: -103.4000 },
        mapPosition: { x: 25, y: 70 },
        destination: { x: 90, y: 40 }
      },
      {
        id: '4',
        name: 'Ruta Nocturna',
        userName: 'José López',
        status: 'emergency',
        currentLocation: 'Zona Industrial',
        startTime: new Date(Date.now() - 1800000), // 30 min ago
        lastUpdate: new Date(Date.now() - 120000), // 2 min ago
        progress: 90,
        mapLatLng: { lat: 25.5350, lng: -103.4200 },
        destinationLatLng: { lat: 25.5250, lng: -103.4400 },
        mapPosition: { x: 75, y: 60 },
        destination: { x: 10, y: 20 }
      }
    ];

    // Auto-select first route
    if (this.activeRoutes.length > 0) {
      this.selectedRoute = this.activeRoutes[0];
    }
  }

  startLiveUpdates() {
    this.updateInterval = setInterval(() => {
      this.updateRoutesData();
    }, 10000); // Update every 10 seconds
  }

  updateRoutesData() {
    // Simulate live updates
    this.activeRoutes.forEach(route => {
      if (route.status === 'active') {
        route.lastUpdate = new Date();
        route.progress = Math.min(100, route.progress + Math.random() * 5);
        
        // Simulate position movement
        const oldX = route.mapPosition.x;
        const oldY = route.mapPosition.y;
        route.mapPosition.x += (Math.random() - 0.5) * 2;
        route.mapPosition.y += (Math.random() - 0.5) * 2;
        
        // Keep within bounds
        route.mapPosition.x = Math.max(5, Math.min(95, route.mapPosition.x));
        route.mapPosition.y = Math.max(5, Math.min(95, route.mapPosition.y));
        
        // update live marker if this is the selected route
        if (this.mapsLoaded && this.selectedRoute && this.selectedRoute.id === route.id) {
          this.updateLiveMarkerPosition(route);
        }

        // If position changed significantly, update its address (throttle to avoid spamming)
        const moved = Math.abs(route.mapPosition.x - oldX) > 0.01 || Math.abs(route.mapPosition.y - oldY) > 0.01;
        if (moved && this.geocoder) {
          const lastAt = this.lastGeocodeAt.get(route) || 0;
          const now = Date.now();
          // Only geocode if more than 10s since last geocode for this route
          if (now - lastAt > 10000) {
            const latLng = this.getRouteLatLng(route, 'mapPosition');
            if (latLng) {
              this.reverseGeocode(latLng).then(address => {
                route.currentLocation = address;
                this.lastGeocodeAt.set(route, now);
              }).catch(() => {});
            }
          }
        }
      }
    });
  }

  // Route selection
  selectRoute(route: ActiveRoute) {
    // Clear visuals from previous selection and render new route
    this.clearAllRouteVisuals();
    this.selectedRoute = route;
    if (this.mapsLoaded) {
      this.placeLiveMarker(route);
      // request directions immediately for street-level route
      try { this.requestDirectionsForRoute(route, true); } catch (e) { console.warn(e); }
    }
  }

  trackByRouteId(index: number, route: ActiveRoute): string {
    return route.id;
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'emergency':
        return 'danger';
      case 'completed':
        return 'medium';
      default:
        return 'medium';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'En camino';
      case 'paused':
        return 'Pausado';
      case 'emergency':
        return 'Emergencia';
      case 'completed':
        return 'Completado';
      default:
        return 'Desconocido';
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins === 0) {
      return 'Ahora mismo';
    } else if (diffMins === 1) {
      return 'Hace 1 minuto';
    } else if (diffMins < 60) {
      return `Hace ${diffMins} minutos`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`;
    }
  }

  // Action methods
  viewRouteDetails(route: ActiveRoute, event: Event) {
    event.stopPropagation();
    console.log('Ver detalles de:', route.name);
    // Implement route details modal
  }

  sendAlert(route: ActiveRoute, event: Event) {
    event.stopPropagation();
    console.log('Enviar alerta a:', route.userName);
    // Implement alert functionality
  }

  emergencyStop(route: ActiveRoute, event: Event) {
    event.stopPropagation();
    console.log('Parada de emergencia para:', route.userName);
    // Implement emergency stop
    route.status = 'emergency';
  }

  // Map controls
  refreshLocation() {
    console.log('Refrescando ubicación...');
    this.updateRoutesData();
  }

  toggleFullscreen() {
    this.isMapFullscreen = !this.isMapFullscreen;
  }

  // Google Maps helpers
  private loadGoogleMapsSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google && (window as any).google.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyD8RuH6sdDdoFwNygqmE8Osx0Uz9urpNM0&libraries=places';
      script.defer = true;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  private initLiveMap() {
    if (!(window as any).google || !(window as any).google.maps) return;
    const g = (window as any).google;
    const center = { lat: -34.6025, lng: -58.3795 };
    this.liveMap = new g.maps.Map(document.getElementById('liveGmap') as HTMLElement, {
      center,
      zoom: 15,
      disableDefaultUI: true
    });

    if (this.selectedRoute) {
      this.placeLiveMarker(this.selectedRoute);
    }
    // Initialize Directions service & renderer for route-by-street drawing
    try {
      this.initDirections();
    } catch (e) {
      console.warn('Directions init failed', e);
    }
    // Initialize Geocoder for reverse geocoding
    try {
      this.geocoder = new g.maps.Geocoder();
    } catch (e) {
      this.geocoder = null;
      console.warn('Geocoder not available', e);
    }

    // Seed addresses for active routes (small spacing to reduce rate of requests)
    if (this.geocoder && this.activeRoutes && this.activeRoutes.length > 0) {
      this.activeRoutes.forEach((route, idx) => {
        setTimeout(() => {
          const latLng = this.getRouteLatLng(route, 'mapPosition');
          if (latLng) {
            this.reverseGeocode(latLng).then(address => {
              route.currentLocation = address;
              this.lastGeocodeAt.set(route, Date.now());
            }).catch(() => {});
          }
        }, idx * 300); // 300ms spacing between initial calls
      });
    }
  }

  private initDirections() {
    if (!(window as any).google || !(window as any).google.maps) return;
    const g = (window as any).google;
    this.directionsService = new g.maps.DirectionsService();
    // Single renderer used for the currently selected route (we'll clear/reuse it)
    this.directionsRenderer = new g.maps.DirectionsRenderer({
      map: this.liveMap,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#92BEE0', strokeWeight: 4 }
    });
  }

  private clearAllRouteVisuals() {
    // remove any polylines and dest markers created earlier
    try {
      this.routePolylines.forEach(p => p.setMap(null));
      this.routePolylines.clear();
      this.destMarkers.forEach(m => m.setMap(null));
      this.destMarkers.clear();
    } catch (e) {
      console.warn('Error clearing visuals', e);
    }
    // clear directions renderer
    try {
      if (this.directionsRenderer) {
        this.directionsRenderer.setMap(null);
        // recreate renderer on demand in initDirections
      }
    } catch (e) {}
    this.directionsRenderer = null;
    // remove live marker too so placeLiveMarker recreates it for newly selected route
    try {
      if (this.liveMarker) {
        this.liveMarker.setMap(null);
        this.liveMarker = null;
      }
    } catch (e) {}
  }

  private requestDirectionsForRoute(route: ActiveRoute, force: boolean = false) {
    if (!this.directionsService) return;
    const now = Date.now();
    if (!force && now - this.lastDirectionsAt < this.directionsThrottleMs) return;
    this.lastDirectionsAt = now;
  // Ensure we have coordinates for origin/destination (use lat/lng fields or legacy percentages)
  const g = (window as any).google;
  const origin = this.getRouteLatLng(route, 'mapPosition');
  const destination = this.getRouteLatLng(route, 'destination');
  if (!origin || !destination) return;
    const request: any = {
      origin,
      destination,
      travelMode: g.maps.TravelMode.DRIVING
    };

    // ensure renderer exists and is attached
    if (!this.directionsRenderer) this.initDirections();
    if (!this.directionsRenderer) return;

    this.directionsService.route(request, (result: any, status: any) => {
      if (status === g.maps.DirectionsStatus.OK) {
        try {
          this.directionsRenderer.setDirections(result);
          // place/refresh custom markers: origin (liveMarker) and destination
          // destination marker from result's end_location
          const leg = result.routes[0].legs[0];
          const destPos = leg.end_location;
          // update or create dest marker for this route (we'll keep one global dest marker for selected route)
          // clear previous destMarkers map and recreate single dest marker
          this.destMarkers.forEach(m => m.setMap(null));
          this.destMarkers.clear();
          const dmark = new g.maps.Marker({
            position: destPos,
            map: this.liveMap,
            title: `${route.name} (Destino)`,
            icon: {
              path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#ffffff',
              fillOpacity: 1,
              strokeColor: '#ff6b35',
              strokeWeight: 2
            }
          });
          this.destMarkers.set(route.id, dmark);
        } catch (e) {
          console.warn('Failed to render directions', e);
        }
      } else {
        console.warn('Directions request failed:', status);
      }
    });
  }

  /**
   * Draw or update a polyline connecting the current position to the destination
   */
  private drawRoutePolyline(route: ActiveRoute) {
    if (!this.liveMap) return;
    const g = (window as any).google;
  const start = this.getRouteLatLng(route, 'mapPosition');
  const destPos = this.getRouteLatLng(route, 'destination');
    if (!destPos) return;

    // create or update polyline
    let poly = this.routePolylines.get(route.id);
    if (!poly) {
      poly = new g.maps.Polyline({
        path: [start, destPos],
        geodesic: true,
        strokeColor: '#92BEE0',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        icons: [{
          icon: { path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2, strokeColor: '#92BEE0' },
          offset: '100%'
        }]
      });
      poly.setMap(this.liveMap);
      this.routePolylines.set(route.id, poly);
    } else {
      poly.setPath([start, destPos]);
    }

    // destination marker
    let dmark = this.destMarkers.get(route.id);
    if (!dmark) {
      dmark = new g.maps.Marker({
        position: destPos,
        map: this.liveMap,
        title: `${route.name} (Destino)` ,
        icon: {
          path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#ffffff',
          fillOpacity: 1,
          strokeColor: '#ff6b35',
          strokeWeight: 2
        }
      });
      this.destMarkers.set(route.id, dmark);
    } else {
      dmark.setPosition(destPos);
    }
  }

  private placeLiveMarker(route: ActiveRoute) {
    if (!this.liveMap) return;
  const latLng = this.getRouteLatLng(route, 'mapPosition');

    if (this.liveMarker) {
      // update existing live marker position (do not return — we want to refresh directions)
      this.liveMarker.setPosition(latLng);
      this.liveMap.panTo(latLng);
    } else {
      const g = (window as any).google;
      this.liveMarker = new g.maps.Marker({
        position: latLng,
        map: this.liveMap,
        title: route.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ff6b35',
          fillOpacity: 1,
          strokeColor: '#92BEE0',
          strokeWeight: 2
        }
      });
      this.liveMap.panTo(latLng);
    }

    try { this.requestDirectionsForRoute(route, true); } catch (e) { console.warn(e); }

    if (latLng) {
      this.reverseGeocode(latLng)
        .then(address => {
          route.currentLocation = address;
          route.lastUpdate = new Date();
        })
        .catch(() => {
          // keep existing location if geocoding fails
        });
    }
  }

  private updateLiveMarkerPosition(route: ActiveRoute) {
    if (!this.liveMarker) return;
  const latLng = this.getRouteLatLng(route, 'mapPosition');
    this.liveMarker.setPosition(latLng);
    try { this.requestDirectionsForRoute(route, false); } catch (e) { console.warn(e); }
    if (latLng) {
      this.reverseGeocode(latLng)
        .then(address => {
          route.currentLocation = address;
          route.lastUpdate = new Date();
        })
        .catch(() => {});
    }
  }

  private reverseGeocode(latLng: { lat: number; lng: number }): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.geocoder) return reject('Geocoder not initialized');
      const g = (window as any).google;
      this.geocoder.geocode({ location: latLng }, (results: any, status: any) => {
        if (status === g.maps.GeocoderStatus.OK && results && results.length > 0) {
          resolve(results[0].formatted_address);
        } else if (results && results.length === 0) {
          resolve(`${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`);
        } else {
          reject(status);
        }
      });
    });
  }

  private percentageToLatLng(xPerc: number, yPerc: number) {
    const latSpan = 0.0036; // approx latitude span for mock area
    const lngSpan = 0.0051; // approx longitude span for mock area
    const topLat = -34.6001;
    const leftLng = -58.3816;

    const lat = topLat + (yPerc / 100) * latSpan;
    const lng = leftLng + (xPerc / 100) * lngSpan;
    return { lat, lng };
  }


  private getRouteLatLng(route: ActiveRoute, kind: 'mapPosition' | 'destination') {
    if (kind === 'mapPosition') {
      if (route.mapLatLng) return route.mapLatLng;
      return this.percentageToLatLng(route.mapPosition.x, route.mapPosition.y);
    } else {
      if (route.destinationLatLng) return route.destinationLatLng;
      if (route.destination) return this.percentageToLatLng(route.destination.x, route.destination.y);
      return null;
    }
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

// Interfaces
interface RoutePosition {
  x: number;
  y: number;
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
  private geocoder: any = null;
  private mapsLoaded = false;
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
        mapPosition: { x: 35, y: 45 }
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
        mapPosition: { x: 60, y: 30 }
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
        mapPosition: { x: 25, y: 70 }
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
        mapPosition: { x: 75, y: 60 }
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
            const latLng = this.percentageToLatLng(route.mapPosition.x, route.mapPosition.y);
            this.reverseGeocode(latLng).then(address => {
              route.currentLocation = address;
              this.lastGeocodeAt.set(route, now);
            }).catch(() => {});
          }
        }
      }
    });
  }

  // Route selection
  selectRoute(route: ActiveRoute) {
    this.selectedRoute = route;
    if (this.mapsLoaded) {
      this.placeLiveMarker(route);
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
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] }
      ],
      disableDefaultUI: true
    });

    if (this.selectedRoute) {
      this.placeLiveMarker(this.selectedRoute);
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
          const latLng = this.percentageToLatLng(route.mapPosition.x, route.mapPosition.y);
          this.reverseGeocode(latLng).then(address => {
            route.currentLocation = address;
            this.lastGeocodeAt.set(route, Date.now());
          }).catch(() => {});
        }, idx * 300); // 300ms spacing between initial calls
      });
    }
  }

  private placeLiveMarker(route: ActiveRoute) {
    if (!this.liveMap) return;
    const latLng = this.percentageToLatLng(route.mapPosition.x, route.mapPosition.y);

    if (this.liveMarker) {
      this.liveMarker.setPosition(latLng);
      this.liveMap.panTo(latLng);
      return;
    }

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

    // Reverse geocode to get a human-readable address and set currentLocation
    this.reverseGeocode(latLng)
      .then(address => {
        route.currentLocation = address;
        route.lastUpdate = new Date();
      })
      .catch(() => {
        // keep existing location if geocoding fails
      });
  }

  private updateLiveMarkerPosition(route: ActiveRoute) {
    if (!this.liveMarker) return;
    const latLng = this.percentageToLatLng(route.mapPosition.x, route.mapPosition.y);
    this.liveMarker.setPosition(latLng);
    // Update route current location by reverse geocoding
    this.reverseGeocode(latLng)
      .then(address => {
        route.currentLocation = address;
        route.lastUpdate = new Date();
      })
      .catch(() => {});
  }

  // Reverse geocoding helper
  private reverseGeocode(latLng: { lat: number; lng: number }): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.geocoder) return reject('Geocoder not initialized');
      const g = (window as any).google;
      this.geocoder.geocode({ location: latLng }, (results: any, status: any) => {
        if (status === g.maps.GeocoderStatus.OK && results && results.length > 0) {
          resolve(results[0].formatted_address);
        } else if (results && results.length === 0) {
          // No results, return a lat/lng fallback
          resolve(`${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`);
        } else {
          reject(status);
        }
      });
    });
  }

  private percentageToLatLng(xPerc: number, yPerc: number) {
    // Convert percentage-based mock positions to lat/lng within a small bounding box near the MAP center
    const latSpan = 0.0036; // approx latitude span for mock area
    const lngSpan = 0.0051; // approx longitude span for mock area
    const topLat = -34.6001;
    const leftLng = -58.3816;

    const lat = topLat + (yPerc / 100) * latSpan;
    const lng = leftLng + (xPerc / 100) * lngSpan;
    return { lat, lng };
  }
}

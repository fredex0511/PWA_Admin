import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RunroutesService } from 'src/app/services/runroutes';
import { RouteRun } from 'src/app/interfaces/route-run';
import { SocketService } from 'src/app/services/socket/socket';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
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
  user_id:number,
  id: number;
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
  private routePolylines: Map<number, any> = new Map();
  private destMarkers: Map<number, any> = new Map();
  private geocoder: any = null;
  private mapsLoaded = false;
  private directionsService: any = null;
  private directionsRenderer: any = null;
  private lastDirectionsAt: number = 0;
  private directionsThrottleMs: number = 5000; // ms
  // Track last geocode time per route to avoid spamming API
  private lastGeocodeAt: WeakMap<ActiveRoute, number> = new WeakMap();

  //socket 
  private audioContext: AudioContext | null = null;
  private scheduledTime = 0;
  private audioSub: Subscription | null = null;
  private collectedChunks: ArrayBuffer[] = [];
  isListening = false;
  downloadUrl: string | null = null;
  token: string | null = null;
  targetUserId: string | null = null;
  private listenControlSub: Subscription | null = null;
  private serverErrorSub: Subscription | null = null;
  listenPending = false;
  private remoteTarget: string | null = null;

  //
  constructor( private runRouteService: RunroutesService ,private socketService: SocketService) { }

  ngOnInit() {
     try { this.token = localStorage.getItem('walksafe_token'); } catch (e) { this.token = null; }
      // Inicializar socket con el token
    try { 
      this.socketService.init(this.token ?? undefined); 
    } catch (e) { 
      console.warn('[Auto Listen] socket init error', e); 
    }
        // Suscribirse a fin de rutas
    this.socketService.onRouteRunFinished().subscribe(() => {
      console.log('Suscribirse a fin de rutas')
      this.getRunRouters();
    });

    this.socketService.onRouteRunStarted().subscribe(({ run }) => { console.log(run)
      this.getRunRouters(); });

    this.getRunRouters();
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
     try { this.stopListening(); } catch (e) {}
    try { this.leaveRemote(); } catch (e) {}
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
        user_id:1,
        id: 1,
        name: 'Camino a Casa',
        userName: 'Admin',
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
    
    this.clearAllRouteVisuals();
    this.selectedRoute = route;
    if (this.mapsLoaded) {
      this.placeLiveMarker(route);
      // request directions immediately for street-level route
      try { this.requestDirectionsForRoute(route, true); } catch (e) { console.warn(e); }
    }
  }

  trackByRouteId(index: number, route: ActiveRoute): number {
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

  private async getRunRouters (){
    this.runRouteService
          .getRunroutes()
          .subscribe({
            next: async (resp) => {
              this.activeRoutes = []

              resp.data?.forEach((route: RouteRun) => {
                console.log(resp)
                console.log(route.end_time)
                          if(!route.end_time){
                                    this.activeRoutes.push({
                                    user_id:route.userId,
                                    id: route.id,
                                    name: route.route?.name ?? 'Sin nombre',
                                    userName: route.user?.name ?? 'Usuario desconocido',
                                    status:  'active',
                                    currentLocation: 'Av. Principal 123',
                                    startTime: new Date(route.start_time),
                                    lastUpdate: new Date(route.updatedAt),
                                    progress: 1,
                                    mapPosition: { x: 35, y: 45 },
                                    mapLatLng: { lat: route.route?.startPlace?.lat ?? 0, lng: route.route?.startPlace?.long ?? 0  },
                                    destinationLatLng: { lat: route.route?.endPlace?.lat ?? 0, lng: route.route?.endPlace?.long ?? 0 },
                                  })   
                          }
                                                 
                          });
              console.log(resp)
              
              // Auto-seleccionar la primera ruta y empezar a escuchar
              if (this.activeRoutes.length > 0) {
                const firstRoute = this.activeRoutes[0];
                this.selectRoute(firstRoute);
                
                // Obtener el ID del usuario de la primera ruta para escuchar
                if (resp.data && resp.data.length > 0) {
                  this.targetUserId = resp.data[0].user?.id?.toString() ?? null;
                  if (this.targetUserId) {
                    // Inicializar socket y empezar a escuchar automáticamente
                    await this.startAutoListen();
                  }
                }
              }
              },
              error: async (err) => {
              let message = 'Error al iniciar sesión';
              if (err.error.msg) {
                message = err.error.msg;
              } 
             
            },
          });
  }

  private async startAutoListen() {
    try { this.stopListening(); } catch (e) {}
    try { this.leaveRemote(); } catch (e) {}
    if (!this.token) {
      console.warn('[Auto Listen] No token available');
      return;
    }


    if (!this.targetUserId) {
      console.warn('[Auto Listen] No targetUserId available');
      return;
    }

    // Preparar para recibir confirmación
    this.listenPending = true;
    this.remoteTarget = this.targetUserId;

    // Limpiar suscripciones previas
    try { this.listenControlSub?.unsubscribe(); } catch (e) {}
    try { this.serverErrorSub?.unsubscribe(); } catch (e) {}

    // Suscribirse a la confirmación de inicio de escucha
    this.listenControlSub = this.socketService.onListeningStarted().subscribe((data: any) => {
      if (data && data.targetUserId === this.remoteTarget) {
        console.log('[Auto Listen] listening-started confirmed for', data.targetUserId);
        this.listenPending = false;
        this.startListening();
      }
    });

    // Vigilar errores del servidor
    this.serverErrorSub = this.socketService.onServerError().subscribe((err: any) => {
      console.warn('[Auto Listen] server error', err);
      this.listenPending = false;
    });

    // Solicitar al servidor que se une a la sala
    this.socketService.startListening(this.targetUserId);
        
    // Suscribirse a actualizaciones de ubicación
    this.socketService.onLocationUpdate().subscribe((data: any) => {
      console.log(data)
      if (this.targetUserId && data.fromUserId == this.targetUserId) {
        this.updateRouteLocationOnMap(data.location);
      }
    });

  }

    // (old toggleListening removed — UI uses toggleSelfListen)

  startListening() {
    // Do not re-init the socket here (that recreates connection and drops previous subs).
    // Require the socket to be initialized earlier (toggleSelfListen ensures init).
    if (!this.socketService.isInitialized()) {
      console.error('[Listen] socket not initialized. Call toggleSelfListen() first or provide token.');
      return;
    }

    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!this.audioContext) this.audioContext = new AudioCtx();
    const actx = this.audioContext;
    if (!actx) {
      console.error('AudioContext not available');
      return;
    }
    this.scheduledTime = actx.currentTime + 0.1;

    this.audioSub = this.socketService.getAudio().subscribe((arrayBuffer: ArrayBuffer) => {
      try {
        const float32 = new Float32Array(arrayBuffer);
        this.collectedChunks.push(arrayBuffer.slice(0));
        const buffer = actx.createBuffer(1, float32.length, actx.sampleRate);
        buffer.getChannelData(0).set(float32);
        const src = actx.createBufferSource();
        src.buffer = buffer;
        src.connect(actx.destination);
        if (this.scheduledTime < actx.currentTime) this.scheduledTime = actx.currentTime + 0.05;
        src.start(this.scheduledTime);
        this.scheduledTime += buffer.duration;
        src.onended = () => { try { src.disconnect(); } catch (e) {} };
      } catch (err) {
        console.error('Error playing PCM chunk', err);
      }
    });

    this.isListening = true;
  }

  stopListening() {
    if (this.audioSub) {
      this.audioSub.unsubscribe();
      this.audioSub = null;
    }
    this.isListening = false;
    this.scheduledTime = 0;
  }

  // --- Remote control: ask server to join room for a specific user ---
  // Single-button flow: toggle listening to a target user (asks for token/target if needed)
  async toggleSelfListen() {
    if (this.isListening) {
      // stop and leave
      this.leaveRemote();
      return;
    }

    // Ensure we have a token (try localStorage; if missing ask)
    try { this.token = this.token || localStorage.getItem('walksafe_token'); } catch (e) { this.token = this.token || null; }
    if (!this.token) {
      const provided = window.prompt('Token (admin) — introduce token para autenticar:');
      if (provided) {
        this.token = provided;
        try { localStorage.setItem('walksafe_token', provided); } catch (e) {}
      }
    }

    // Ensure socket initialized
    try { const tk = this.token || undefined; this.socketService.init(tk); } catch (e) { console.warn('[Listen] socket init error', e); }

    // Determine target user id to listen to
    try { this.targetUserId = this.selectedRoute?.user_id?.toString() ?? null; }
    catch{
      
    }
    if (!this.targetUserId) {
      const provided = window.prompt('Introduce el ID del usuario a escuchar:');
      if (!provided) { console.warn('[Listen] no targetUserId provided'); return; }
      this.targetUserId = provided;
      try { localStorage.setItem('listen_target', provided); } catch (e) {}
    }

    // Prepare to receive confirmation: subscribe BEFORE emitting to avoid race
    this.listenPending = true;
    this.remoteTarget = this.targetUserId;

    // cleanup previous subs
    try { this.listenControlSub?.unsubscribe(); } catch (e) {}
    try { this.serverErrorSub?.unsubscribe(); } catch (e) {}

    this.listenControlSub = this.socketService.onListeningStarted().subscribe((data: any) => {
      if (data && data.targetUserId === this.remoteTarget) {
        console.log('[Listen] listening-started confirmed for', data.targetUserId);
        this.listenPending = false;
        this.startListening();
      }
    });

    // Watch for server errors
    this.serverErrorSub = this.socketService.onServerError().subscribe((err: any) => {
      console.warn('[Listen] server error', err);
      this.listenPending = false;
    });

    // Now request server to join the room
    this.socketService.startListening(this.targetUserId);
  }

  leaveRemote() {
    if (!this.remoteTarget && !this.targetUserId) return;
    const t = this.remoteTarget || this.targetUserId!;
    try { this.socketService.stopListening(t); } catch (e) {}
    try { this.listenControlSub?.unsubscribe(); this.listenControlSub = null; } catch (e) {}
    try { this.serverErrorSub?.unsubscribe(); this.serverErrorSub = null; } catch (e) {}
    this.remoteTarget = null;
    this.listenPending = false;
    // stop local playback
    this.stopListening();
  }

  download() {
    if (!this.collectedChunks || this.collectedChunks.length === 0) return;
    const sampleRate = this.audioContext ? this.audioContext.sampleRate : 48000;
    const blob = this.mergeFloat32ToWav(this.collectedChunks, sampleRate);
    if (this.downloadUrl) try { URL.revokeObjectURL(this.downloadUrl); } catch (e) {}
    this.downloadUrl = URL.createObjectURL(blob);
  }

  // saveToken removed (token is stored during prompt flow)

  private mergeFloat32ToWav(buffers: ArrayBuffer[], sampleRate: number) {
    let totalSamples = 0;
    const floatArrays: Float32Array[] = [];
    for (const ab of buffers) {
      const f = new Float32Array(ab);
      floatArrays.push(f);
      totalSamples += f.length;
    }
    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);

    function writeString(dataview: DataView, offset: number, str: string) {
      for (let i = 0; i < str.length; i++) {
        dataview.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, totalSamples * 2, true);

    let offset = 44;
    for (const f of floatArrays) {
      for (let i = 0; i < f.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, f[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  // Actualizar ubicación del usuario en el mapa en tiempo real
  private updateRouteLocationOnMap(location: any) {
    if (!this.selectedRoute || !this.mapsLoaded || !this.liveMap) return;
    
    const latLng = { lat: location.lat, lng: location.long };
    
    if (this.liveMarker) {
      this.liveMarker.setPosition(latLng);
      this.liveMap.panTo(latLng);
    } else {
      const g = (window as any).google;
      if (g && g.maps) {
        this.liveMarker = new g.maps.Marker({
          position: latLng,
          map: this.liveMap,
          title: `${this.selectedRoute.userName} - En vivo`
        });
      }
    }
    
    this.selectedRoute.mapLatLng = latLng;
  }

  

}

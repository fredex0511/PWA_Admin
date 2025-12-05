import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { PathFormComponent } from '../path-form/path-form.component';
import { RouteService } from 'src/app/services/route';
import { Route } from 'src/app/interfaces/route';
import { RunroutesService } from 'src/app/services/runroutes';
import { RouteRun } from 'src/app/interfaces/route-run';
import { SocketService } from 'src/app/services/socket/socket';

interface UserPath {
  route_id?:number
  name: string;
  origin: string;
  destination: string;
  originLatLng?: any;
  destinationLatLng?: any;
}

@Component({
  selector: 'app-caminos-mobile',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, PathFormComponent],
  templateUrl: './caminos-mobile.component.html',
  styleUrls: ['./caminos-mobile.component.css']
})
export class CaminosMobileComponent implements OnInit, OnDestroy {
  userPaths: UserPath[] = [];
  addingPath = false;
  newPath: UserPath = { name: '', origin: '', destination: '' };
  activePath: UserPath | null = null;
  originSuggestions: any[] = [];
  destinationSuggestions: any[] = [];
  // Google Maps helpers eliminados: ahora se usa PathMapComponent

  private mobileMap: any = null;
  private mobileMarker: any = null;
  private mobileDestMarker: any = null;
  private directionsService: any = null;
  private directionsRenderer: any = null;
  private mapsLoaded = false;
  private autocompleteService: any = null;
  private runrouterActive : RouteRun | null = null
  private locationPollingInterval: any = null;

  //sokcet
   private streamingContext: AudioContext | null = null;
  private streamingProcessor: ScriptProcessorNode | null = null;
  private streamingSourceNode: MediaStreamAudioSourceNode | null = null;
  private streamingStream: MediaStream | null = null;
  isStreaming = false;
  // token to authenticate socket (can be left empty to use stored token)
  token: string | null = null;

  // Autocomplete handlers for PathFormComponent
  onSearchOrigin(event: any) {
    const input = event?.target?.value || '';
    if (!this.autocompleteService) {
      const g = (window as any).google;
      if (g && g.maps && g.maps.places) {
        this.autocompleteService = new g.maps.places.AutocompleteService();
      }
    }
    if (this.autocompleteService && input.length > 2) {
      this.autocompleteService.getPlacePredictions({ input }, (predictions: any[], status: any) => {
        this.ngZone.run(() => {
          this.originSuggestions = predictions || [];
        });
      });
    } else {
      this.originSuggestions = [];
    }
  }

  onSearchDestination(event: any) {
    const input = event?.target?.value || '';
    if (!this.autocompleteService) {
      const g = (window as any).google;
      if (g && g.maps && g.maps.places) {
        this.autocompleteService = new g.maps.places.AutocompleteService();
      }
    }
    if (this.autocompleteService && input.length > 2) {
      this.autocompleteService.getPlacePredictions({ input }, (predictions: any[], status: any) => {
        this.ngZone.run(() => {
          this.destinationSuggestions = predictions || [];
        });
      });
    } else {
      this.destinationSuggestions = [];
    }
  }

  onSelectOrigin(suggestion: any) {
    this.newPath.origin = suggestion.description;
    this.originSuggestions = [];
    
    // Obtener latitud y longitud del place_id
    const g = (window as any).google;
    if (g && g.maps && g.maps.places) {
      const service = new g.maps.places.PlacesService(document.createElement('div'));
      service.getDetails(
        { placeId: suggestion.place_id },
        (place: any, status: any) => {
          if (status === g.maps.places.PlacesServiceStatus.OK && place.geometry) {
            this.ngZone.run(() => {
              this.newPath.originLatLng = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              };
              console.log('Origin coordinates:', this.newPath.originLatLng);
            });
          }
        }
      );
    }
  }

  onSelectDestination(suggestion: any) {
    this.newPath.destination = suggestion.description;
    this.destinationSuggestions = [];
    
    // Obtener latitud y longitud del place_id
    const g = (window as any).google;
    if (g && g.maps && g.maps.places) {
      const service = new g.maps.places.PlacesService(document.createElement('div'));
      service.getDetails(
        { placeId: suggestion.place_id },
        (place: any, status: any) => {
          if (status === g.maps.places.PlacesServiceStatus.OK && place.geometry) {
            this.ngZone.run(() => {
              this.newPath.destinationLatLng = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              };
              console.log('Destination coordinates:', this.newPath.destinationLatLng);
            });
          }
        }
      );
    }
  }

  constructor(private alertController: AlertController, private ngZone: NgZone, private routeService : RouteService, private runRouteService: RunroutesService ,private socketService: SocketService) {}

  ngOnInit() {
    try { this.token = localStorage.getItem('walksafe_token'); } catch (e) { this.token = null; }
    this.getPaths()
    this.loadGoogleMapsSdk()
      .then(() => {
        this.mapsLoaded = true;
      })
      .catch(err => console.error('Error loading Google Maps SDK', err));
  }

  ngOnDestroy() {
    if (this.mobileMarker) {
      this.mobileMarker.setMap(null);
    }
    if (this.mobileMap) {
      // nothing specific to destroy for Google Maps API
    }
    if (this.locationPollingInterval) {
      clearInterval(this.locationPollingInterval);
      this.locationPollingInterval = null;
    }
  }

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

  private initMobileMap() {
    if (!(window as any).google || !(window as any).google.maps) return;
    const g = (window as any).google;
    const mapEl = document.getElementById('mobileGmap') as HTMLElement;
    if (!mapEl || !this.activePath) return;
    const center = this.activePath.originLatLng || { lat: 25.5430, lng: -103.4235 };
    this.mobileMap = new g.maps.Map(mapEl, {
      center,
      zoom: 15,
      disableDefaultUI: true
    });
    this.placeMobileMarker(this.activePath);
    this.initDirections();
    this.requestDirectionsForPath(this.activePath);
  }

  private placeMobileMarker(path: UserPath) {
    if (!this.mobileMap) return;
    const g = (window as any).google;
    const latLng = path.originLatLng;
    if (this.mobileMarker) {
      this.mobileMarker.setPosition(latLng);
      this.mobileMap.panTo(latLng);
    } else {
      this.mobileMarker = new g.maps.Marker({
        position: latLng,
        map: this.mobileMap,
        title: path.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ff6b35',
          fillOpacity: 1,
          strokeColor: '#92BEE0',
          strokeWeight: 2
        }
      });
      this.mobileMap.panTo(latLng);
    }
  }

  private initDirections() {
    if (!(window as any).google || !(window as any).google.maps) return;
    const g = (window as any).google;
    this.directionsService = new g.maps.DirectionsService();
    this.directionsRenderer = new g.maps.DirectionsRenderer({
      map: this.mobileMap,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#92BEE0', strokeWeight: 4 }
    });
  }

  private requestDirectionsForPath(path: UserPath) {
    if (!this.directionsService) return;
    const g = (window as any).google;
    const origin = path.originLatLng;
    const destination = path.destinationLatLng;
    if (!origin || !destination) return;
    const request: any = {
      origin,
      destination,
      travelMode: g.maps.TravelMode.WALKING
    };
    this.directionsService.route(request, (result: any, status: any) => {
      if (status === g.maps.DirectionsStatus.OK) {
        try {
          this.directionsRenderer.setDirections(result);
          // destination marker
          if (this.mobileDestMarker) this.mobileDestMarker.setMap(null);
          const leg = result.routes[0].legs[0];
          const destPos = leg.end_location;
          this.mobileDestMarker = new g.maps.Marker({
            position: destPos,
            map: this.mobileMap,
            title: `${path.name} (Destino)` ,
            icon: {
              path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#ffffff',
              fillOpacity: 1,
              strokeColor: '#ff6b35',
              strokeWeight: 2
            }
          });
        } catch (e) {
          console.warn('Failed to render directions', e);
        }
      } else {
        console.warn('Directions request failed:', status);
      }
    });
  }

  async confirmStartPath(path: UserPath) {
    const alert = await this.alertController.create({
      header: 'Iniciar camino',
      message: `¿Iniciar el camino "${path.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Iniciar', handler: () => {
          this.ngZone.run(() => {
            this.activePath = path;
            this.initRouterRun()
            setTimeout(() => this.initMobileMap(), 200);
          });
        } }
      ]
    });
    await alert.present();
  }

  saveNewPath() {
    if (this.newPath.name && this.newPath.origin && this.newPath.destination) {
       this.routeService
      .createRoute(this.newPath)
      .subscribe({
        next: async (resp) => {
          this.getPaths()
          this.newPath =  { name: '', origin: '', destination: '' }
          this.addingPath = false
        },
        error: async (err) => {
          let message = 'Error al iniciar sesión';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error de autenticación',
            message,
            buttons: ['OK'],
          });
          await alert.present();
        },
      });
    }
  }

  endActivePath() {
    // Detener transmisión de audio automáticamente
    if (this.isStreaming) {
      this.stopStreaming();
    }
    
    // Detener polling de ubicación
    if (this.locationPollingInterval) {
      clearInterval(this.locationPollingInterval);
      this.locationPollingInterval = null;
    }
    
    this.activePath = null;
    this.runRouteService
      .finishedRunRoute(this.runrouterActive!.id)
      .subscribe({
        next: async (resp) => {
          
            console.log(resp)
          },
          error: async (err) => {
          let message = 'Error al iniciar sesión';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error de autenticación',
            message,
            buttons: ['OK'],
          });
          await alert.present();
        },
      });
    if (this.mobileMarker) {
      this.mobileMarker.setMap(null);
      this.mobileMarker = null;
    }
    if (this.mobileDestMarker) {
      this.mobileDestMarker.setMap(null);
      this.mobileDestMarker = null;
    }
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
      this.directionsRenderer = null;
    }
  }

  private async getPaths(){
     this.routeService
      .getRoutes()
      .subscribe({
        next: async (resp) => {
          this.userPaths = []
            resp.data?.forEach((path: Route) => {
            this.userPaths.push({
            route_id:path.id,
            name: path.name,
            origin: path.startPlace?.name || 'Unknown Origin',
            destination: path.endPlace?.name || 'Unknown Destination',
            originLatLng: { lat: path.endPlace?.lat, lng: path.endPlace?.long },
            destinationLatLng: { lat: path.startPlace?.lat, lng: path.startPlace?.long }
              });
            });
            console.log(this.userPaths)
          },
          error: async (err) => {
          let message = 'Error al iniciar sesión';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error de autenticación',
            message,
            buttons: ['OK'],
          });
          await alert.present();
        },
      });
  }

  private async initRouterRun(){
     const datauser = localStorage.getItem('walksafe_user');
     let user
     if (datauser){
       user = JSON.parse(datauser)
     } 
    
this.runRouteService
      .createRunroute({route_id:this.activePath?.route_id, user_id:user.id})
      .subscribe({
        next: async (resp) => {
          
            this.runrouterActive = resp.data!
            // Iniciar transmisión de audio automáticamente
            await this.startStreaming();
            // Iniciar polling de ubicación
            this.startLocationPolling();
          },
          error: async (err) => {
          let message = 'Error al iniciar sesión';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error de autenticación',
            message,
            buttons: ['OK'],
          });
          await alert.present();
        },
      });
  }

 async toggleStream() {
    if (this.isStreaming) {
      this.stopStreaming();
    } else {
      await this.startStreaming();
    }
  }

  private async startStreaming() {
    // ensure socket initialized with token before streaming
    try {
      const tk = this.token || (localStorage.getItem('walksafe_token') ?? undefined);
      this.socketService.init(tk ?? undefined);
    } catch (e) { console.warn('[Send] socket init error', e); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.streamingStream = stream;
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.streamingContext = new AudioCtx();
      const ctx = this.streamingContext;
      if (!ctx) throw new Error('AudioContext unavailable');

      const source = ctx.createMediaStreamSource(stream);
      this.streamingSourceNode = source;

      const bufferSize = 4096;
      const processor = (ctx.createScriptProcessor as any)(bufferSize, 1, 1) as ScriptProcessorNode;
      this.streamingProcessor = processor;

      processor.onaudioprocess = (evt: AudioProcessingEvent) => {
        try {
          const input = evt.inputBuffer.getChannelData(0);
          const copy = new Float32Array(input.length);
          copy.set(input);
          // send Float32 PCM as ArrayBuffer
          this.socketService.sendAudioBuffer(copy.buffer);
        } catch (err) {
          console.error('Error in onaudioprocess', err);
        }
      };

      source.connect(processor);
      // Keep context alive; do not connect processor to destination to avoid echo
      processor.connect(ctx.destination);
      this.isStreaming = true;
      console.log('[Send] started streaming');
    } catch (err) {
      console.error('[Send] startStreaming error', err);
    }
  }

  saveToken() {
    if (this.token) {
      try { localStorage.setItem('api_token', this.token); console.log('[Send] token saved'); } catch (e) { console.warn('Could not save token', e); }
    }
  }

  private stopStreaming() {
    try {
      if (this.streamingProcessor) {
        this.streamingProcessor.disconnect();
        this.streamingProcessor.onaudioprocess = null;
        this.streamingProcessor = null;
      }
      if (this.streamingSourceNode) {
        try { this.streamingSourceNode.disconnect(); } catch (e) {}
        this.streamingSourceNode = null;
      }
      if (this.streamingStream) {
        this.streamingStream.getTracks().forEach(t => t.stop());
        this.streamingStream = null;
      }
      if (this.streamingContext) {
        try { this.streamingContext.close(); } catch (e) {}
        this.streamingContext = null;
      }
    } catch (e) { console.warn('[Send] stopStreaming error', e); }
    this.isStreaming = false;
    console.log('[Send] stopped streaming');
  }

  private startLocationPolling() {
    // Obtener ubicación inicial
    this.sendCurrentLocation();

    // Configurar polling cada segundo
    this.locationPollingInterval = setInterval(() => {
      this.sendCurrentLocation();
    }, 1000);
  }

  private sendCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Actualizar la ubicación del path activo
          if (this.activePath) {
            this.activePath.originLatLng = {
              lat: latitude,
              lng: longitude
            };
            
            // Actualizar el marcador en el mapa si está visible
            this.placeMobileMarker(this.activePath);
          }
          
          // Enviar ubicación por socket
          this.socketService.sendLocation({
            lat: latitude,
            long: longitude,
            timestamp: new Date().toISOString()
          });
          console.log('[Location] Enviada ubicación:', { lat: latitude, long: longitude });
        },
        (error) => {
          console.warn('[Location] Error obteniendo ubicación:', error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } else {
      console.warn('[Location] Geolocation no disponible');
    }
  }

}

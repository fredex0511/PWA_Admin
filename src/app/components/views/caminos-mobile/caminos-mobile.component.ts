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
import { IncidentsService } from 'src/app/services/incidents';
import { IncidentType } from 'src/app/services/incident-type';
import { IncidentTypes } from 'src/app/interfaces/incident-type';
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
  incidentType: IncidentTypes[] = []
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
  private currentUserLocation: { lat: number; lng: number } | null = null;

  //sokcet
   private streamingContext: AudioContext | null = null;
  private streamingProcessor: ScriptProcessorNode | null = null;
  private streamingSourceNode: MediaStreamAudioSourceNode | null = null;
  private streamingStream: MediaStream | null = null;
  isStreaming = false;
  // token to authenticate socket (can be left empty to use stored token)
  token: string | null = null;

  // Incident type management
  selectedIncidentType: string = '';
  canSaveIncident = false;
  isLoadingPaths = false;
  isSavingPath = false;
  isStartingRoute = false;
  isFinishingRoute = false;
  isLoadingIncidentTypes = false;
  isSavingIncident = false;

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

  constructor(
    private incidentsService:IncidentsService,
    private alertController: AlertController, 
    private ngZone: NgZone, 
    private routeService : RouteService, 
    private runRouteService: RunroutesService ,
    private socketService: SocketService,
    private incidentTypeService:IncidentType) {}

  ngOnInit() {
    try { this.token = localStorage.getItem('walksafe_token'); } catch (e) { this.token = null; }
    this.getPaths()
    this.getIncidentType()
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
    if (this.isStartingRoute) {
      return;
    }
    // Verificar si hay conexión a internet
    if (!navigator.onLine) {
      const offlineAlert = await this.alertController.create({
        header: 'Sin conexión',
        message: 'No puedes iniciar una ruta sin conexión a internet. Por favor, verifica tu conexión.',
        buttons: ['OK']
      });
      await offlineAlert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Iniciar camino',
      message: `¿Iniciar el camino "${path.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Iniciar', handler: () => {
          this.ngZone.run(async () => {
            // Solicitar permisos antes de iniciar
            const permissionsGranted = await this.requestPermissions();
            if (permissionsGranted) {
              this.activePath = path;
              this.initRouterRun()
              setTimeout(() => this.initMobileMap(), 200);
            }
          });
        } }
      ]
    });
    await alert.present();
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      let allGranted = true;

      // Pedir permiso de cámara
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        console.log('[Permissions] Cámara permitida');
      } catch (err) {
        console.warn('[Permissions] Cámara denegada:', err);
        allGranted = false;
      }

      // Pedir permiso de micrófono
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        console.log('[Permissions] Micrófono permitido');
      } catch (err) {
        console.warn('[Permissions] Micrófono denegado:', err);
        allGranted = false;
      }

      // Pedir permiso de geolocalización
      try {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              console.log('[Permissions] Geolocalización permitida');
              resolve();
            },
            (err) => {
              console.warn('[Permissions] Geolocalización denegada:', err);
              reject(err);
            }
          );
        });
      } catch (err) {
        allGranted = false;
      }

      if (!allGranted) {
        const permAlert = await this.alertController.create({
          header: 'Permisos Requeridos',
          message: 'Se requieren permisos de cámara, micrófono y geolocalización para usar esta funcionalidad.',
          buttons: ['OK']
        });
        await permAlert.present();
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Permissions] Error:', error);
      return false;
    }
  }

  saveNewPath() {
    // Verificar si hay conexión a internet
    if (!navigator.onLine) {
      this.showOfflineAlert('No puedes crear una ruta sin conexión a internet.');
      return;
    }

    if (!this.newPath.name || !this.newPath.origin || !this.newPath.destination) {
      this.presentAlert('Campos incompletos', 'Completa nombre, origen y destino para guardar el camino.');
      return;
    }

    this.isSavingPath = true;
    this.routeService
    .createRoute(this.newPath)
    .subscribe({
      next: async (resp) => {
        this.isSavingPath = false;
        await this.presentAlert('Camino guardado', 'Tu camino se guardó correctamente.');
        this.getPaths()
        this.newPath =  { name: '', origin: '', destination: '' }
        this.addingPath = false
      },
      error: async (err) => {
        this.isSavingPath = false;
        let message = 'No se pudo guardar el camino';
        if (err.error.msg) {
          message = err.error.msg;
        } 
        const alert = await this.alertController.create({
          header: 'Error',
          message,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  endActivePath() {
    if (this.isFinishingRoute) {
      return;
    }
    this.isFinishingRoute = true;
    if (!this.runrouterActive) {
      this.isFinishingRoute = false;
      return;
    }
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
            this.isFinishingRoute = false;
            console.log(resp)
          },
          error: async (err) => {
          this.isFinishingRoute = false;
          let message = 'No se pudo finalizar la ruta';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error',
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
     this.isLoadingPaths = true;
     this.routeService
      .getRoutes()
      .subscribe({
        next: async (resp) => {
          this.isLoadingPaths = false;
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
          this.isLoadingPaths = false;
          let message = 'No se pudieron cargar tus caminos';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error',
            message,
            buttons: ['OK'],
          });
          await alert.present();
        },
      });
  }

  private async initRouterRun(){
     const datauser = localStorage.getItem('walksafe_user');
     let user: any;
     if (datauser){
       user = JSON.parse(datauser)
     } 
    
    this.isStartingRoute = true;
    this.runRouteService
      .createRunroute({route_id:this.activePath?.route_id, user_id:user.id})
      .subscribe({
        next: async (resp) => {
            this.isStartingRoute = false;
            this.runrouterActive = resp.data!
            // Iniciar transmisión de audio automáticamente
            await this.startStreaming();
            // Iniciar polling de ubicación
            this.startLocationPolling();
          },
          error: async (err) => {
          this.isStartingRoute = false;
          let message = 'No se pudo iniciar la ruta';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error',
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


  // Incident management
  recordingIncident = false;
  incidentEvidence: any[] = [];
  incidentDescription = '';
  private incidentAudioChunks: Blob[] = [];
  private mediaRecorder: any = null;

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
          
          // Guardar la ubicación actual del usuario
          this.currentUserLocation = {
            lat: latitude,
            lng: longitude
          };
          
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
          console.log('[Location] Enviada ubicación:', { lat: latitude, lng: longitude });
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

  // Incident Methods
  startIncident() {
    this.recordingIncident = true;
    this.incidentEvidence = [];
    this.incidentDescription = '';
    this.selectedIncidentType = '';
    this.canSaveIncident = false;
    this.incidentAudioChunks = [];
    console.log('[Incident] Iniciando grabación de incidente');
    
    // Iniciar grabación de audio
    this.startAudioRecording();
  }

  private async startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new (window as any).MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          this.incidentAudioChunks.push(event.data);
        }
      };
      this.mediaRecorder.start();
      console.log('[Audio] Grabación iniciada');
    } catch (error) {
      console.error('[Audio] Error al iniciar grabación:', error);
    }
  }

  async capturePhoto() {
    try {
      // Usar input de file con capture para acceso directo a cámara
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          this.addEvidence(file, 'image');
          console.log('[Camera] Foto capturada desde cámara nativa');
        }
      };
      input.click();
    } catch (error) {
      console.error('[Camera] Error:', error);
      const errorAlert = await this.alertController.create({
        header: 'Error de Cámara',
        message: 'No se pudo acceder a la cámara',
        buttons: ['OK']
      });
      await errorAlert.present();
    }
  }

  openFile() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const type = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 
                    file.type.startsWith('audio/') ? 'audio' : 'file';
        this.addEvidence(file, type);
      }
    }
  }

  private addEvidence(file: File, type: string) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.ngZone.run(() => {
        this.incidentEvidence.push({
          file,
          type,
          url: e.target.result,
          name: file.name
        });
        console.log('[Evidence] Agregada evidencia:', file.name);
      });
    };
    reader.readAsDataURL(file);
  }

  removeEvidence(index: number) {
    this.incidentEvidence.splice(index, 1);
    console.log('[Evidence] Evidencia removida');
  }

  async closeIncident() {
    if (this.isSavingIncident) {
      return;
    }
    if (!this.canSaveIncident) {
      await this.presentAlert('Falta información', 'Selecciona un tipo de incidente para guardar.');
      return;
    }
    this.isSavingIncident = true;
    try {
      // Detener grabación de audio y esperar a que se procese
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          const onStop = () => {
            this.mediaRecorder.removeEventListener('stop', onStop);
            resolve();
          };
          this.mediaRecorder.addEventListener('stop', onStop);
          this.mediaRecorder.stop();
        });
      }

      // Crear blob de audio después de que mediaRecorder haya terminado
      let audioBlob: Blob | null = null;
      if (this.incidentAudioChunks.length > 0) {
        audioBlob = new Blob(this.incidentAudioChunks, { type: 'audio/webm' });
        this.incidentEvidence.push({
          file: new File([audioBlob], 'incident-audio.webm', { type: 'audio/webm' }),
          type: 'audio',
          url: URL.createObjectURL(audioBlob),
          name: 'incident-audio.webm'
        });
        console.log('[Audio] Audio del incidente agregado:', { size: audioBlob.size, type: audioBlob.type });
      }

      console.log('[Incident] Enviando incidente con evidencia:', this.incidentEvidence);
      console.log('[Incident] Descripción:', this.incidentDescription);
      
      const formData = new FormData();
      
      // Información del incidente
      formData.append('date', new Date().toISOString());
      formData.append('routeRunId', this.runrouterActive?.id?.toString() || '0');
      formData.append('description', this.incidentDescription || '');
      formData.append('incidentTypeId', this.selectedIncidentType);
      
      // Agregar ubicación del incidente (ubicación actual del usuario)
      if (this.currentUserLocation) {
        formData.append('lat', this.currentUserLocation.lat.toString())
        formData.append('lng', this.currentUserLocation.lng.toString())
        console.log('[Incident] Ubicación actual agregada:', this.currentUserLocation);
        
        // Obtener nombre de la calle usando geocodificación inversa de Google
        const locationName = await this.getLocationName(this.currentUserLocation.lat, this.currentUserLocation.lng);
        formData.append('ubicacion', locationName);
        console.log('[Incident] Nombre de ubicación agregado:', locationName);
      }

      // Agregar todos los archivos de evidencia con la clave "files"
      // El backend recibirá esto en req.files o req.file.files
      this.incidentEvidence.forEach((evidence) => {
        // Añadir con nombre de archivo preservado (ej: photo.jpg, audio.webm, video.mp4)
        formData.append('files', evidence.file, evidence.file.name);
        console.log(`[FormData] Agregado archivo: ${evidence.file.name} (${evidence.type})`);
      });

      console.log('[Incident] FormData preparado con', this.incidentEvidence.length, 'archivo(s)');

      // Enviar al servidor
      this.incidentsService.createIncident(formData).subscribe({
        next: async (resp) => {
          console.log('[Incident] Incidente creado exitosamente:', resp);
          this.isSavingIncident = false;
          
          // Mostrar confirmación
          const alert = await this.alertController.create({
            header: 'Incidente Guardado',
            message: `Se registró el incidente con ${this.incidentEvidence.length} archivo(s) de evidencia.`,
            buttons: ['OK']
          });
          await alert.present();

          // Resetear
          this.recordingIncident = false;
          this.incidentEvidence = [];
          this.incidentDescription = '';
          this.incidentAudioChunks = [];
          this.selectedIncidentType = '';
          this.canSaveIncident = false;
        },
        error: async (err) => {
          console.error('[Incident] Error al crear incidente:', err);
          this.isSavingIncident = false;
          let message = 'Error al guardar el incidente';
          if (err.error?.msg) {
            message = err.error.msg;
          }
          const errorAlert = await this.alertController.create({
            header: 'Error',
            message,
            buttons: ['OK']
          });
          await errorAlert.present();
        }
      });
    } catch (error) {
      console.error('[Incident] Error al cerrar:', error);
      this.isSavingIncident = false;
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Error procesando el incidente',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  private async getIncidentType(){
    this.isLoadingIncidentTypes = true;
    this.incidentTypeService
      .getIncidentType()
      .subscribe({
        next: async (resp) => {
          this.isLoadingIncidentTypes = false;
          if(resp.data){
            this.incidentType = resp.data
          }
          else{
            this.incidentType = []
          }
          },
          error: async (err) => {
          this.isLoadingIncidentTypes = false;
          let message = 'No se pudieron cargar los tipos de incidente';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error',
            message,
            buttons: ['OK'],
          });
          await alert.present();
        },
      });
  }

  onIncidentTypeChange(){
    this.canSaveIncident = this.selectedIncidentType !== '';
  }

  private async getLocationName(lat: number, lng: number): Promise<string> {
    try {
      const g = (window as any).google;
      if (!g || !g.maps || !g.maps.Geocoder) {
        console.warn('[Geocoding] Google Maps no disponible');
        return `${lat}, ${lng}`;
      }

      const geocoder = new g.maps.Geocoder();
      const latLng = { lat, lng };

      return new Promise<string>((resolve) => {
        geocoder.geocode({ location: latLng }, (results: any[], status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            // Intentar obtener la dirección más específica
            const result = results[0];
            const addressComponents = result.address_components;
            
            // Construir dirección con calle y número si están disponibles
            let street = '';
            let streetNumber = '';
            let neighborhood = '';
            let city = '';
            
            addressComponents.forEach((component: any) => {
              if (component.types.includes('route')) {
                street = component.long_name;
              }
              if (component.types.includes('street_number')) {
                streetNumber = component.long_name;
              }
              if (component.types.includes('neighborhood') || component.types.includes('sublocality')) {
                neighborhood = component.long_name;
              }
              if (component.types.includes('locality')) {
                city = component.long_name;
              }
            });

            // Construir dirección completa
            let address = '';
            if (street) {
              address = street;
              if (streetNumber) {
                address = `${street} ${streetNumber}`;
              }
              if (neighborhood) {
                address += `, ${neighborhood}`;
              }
              if (city) {
                address += `, ${city}`;
              }
            } else {
              // Si no hay calle específica, usar formatted_address
              address = result.formatted_address;
            }

            console.log('[Geocoding] Dirección obtenida:', address);
            resolve(address);
          } else {
            console.warn('[Geocoding] No se encontró dirección:', status);
            resolve(`${lat}, ${lng}`);
          }
        });
      });
    } catch (error) {
      console.error('[Geocoding] Error:', error);
      return `${lat}, ${lng}`;
    }
  }

  private async showOfflineAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Sin conexión',
      message: message + ' Por favor, verifica tu conexión.',
      buttons: ['OK']
    });
    await alert.present();
  }

  private async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

}

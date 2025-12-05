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

/**
 * BACKEND VALIDATOR ADONIS - CreateIncidentValidator.ts
 * 
 * import { schema, CustomMessages, rules } from "@ioc:Adonis/Core/Validator";
 * import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
 * 
 * export default class CreateIncidentValidator {
 *   constructor(protected ctx: HttpContextContract) {}
 * 
 *   public schema = schema.create({
 *     date: schema.date({}),
 *     routeRunId: schema.number([
 *       rules.exists({ table: "route_runs", column: "id" }),
 *     ]),
 *     description: schema.string.optional(),
 *     // placeId: Se genera automáticamente en el backend según geolocalización
 *   });
 * 
 *   public messages: CustomMessages = {};
 * }
 * 
 * BACKEND MULTER CONFIG - config/drive.ts
 * 
 * export const driveConfig = {
 *   disk: 'local',
 *   disks: {
 *     local: {
 *       driver: 'local',
 *       visibility: 'private',
 *       basePath: './storage/uploads/incidents',
 *     },
 *   },
 * };
 * 
 * BACKEND MIDDLEWARE - app/Middleware/HandleMultipartForm.ts
 * 
 * import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
 * import multer from 'multer';
 * import path from 'path';
 * 
 * export default class HandleMultipartForm {
 *   public async handle({ request }: HttpContextContract, next: () => Promise<void>) {
 *     if (request.method() === 'POST' && request.is(['multipart/form-data'])) {
 *       const upload = multer({
 *         storage: multer.diskStorage({
 *           destination: (req, file, cb) => {
 *             cb(null, 'storage/uploads/incidents/');
 *           },
 *           filename: (req, file, cb) => {
 *             const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
 *             cb(null, uniqueSuffix + path.extname(file.originalname));
 *           },
 *         }),
 *         limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
 *         fileFilter: (req, file, cb) => {
 *           const allowedMimes = [
 *             'image/jpeg', 'image/png', 'image/gif', 'image/webp',
 *             'video/mp4', 'video/webm', 'video/quicktime',
 *             'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg'
 *           ];
 *           if (allowedMimes.includes(file.mimetype)) {
 *             cb(null, true);
 *           } else {
 *             cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
 *           }
 *         },
 *       });
 * 
 *       await new Promise<void>((resolve, reject) => {
 *         upload.any()(req, res, (err: any) => {
 *           if (err) reject(err);
 *           else resolve();
 *         });
 *       });
 *     }
 *     await next();
 *   }
 * }
 * 
 * BACKEND CONTROLLER - app/Controllers/Http/IncidentsController.ts
 * 
 * import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
 * import Incident from "App/Models/Incident";
 * import CreateIncidentValidator from "App/Validators/CreateIncidentValidator";
 * 
 * export default class IncidentsController {
 *   public async create({ request, response }: HttpContextContract) {
 *     const data = await request.validate(CreateIncidentValidator);
 * 
 *     // Obtener archivos enviados
 *     const files = request.files('files', {
 *       size: '100mb',
 *       extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'webm', 'mp3', 'wav', 'ogg'],
 *     });
 * 
 *     console.log('FormData recibido:', {
 *       date: data.date,
 *       routeRunId: data.routeRunId,
 *       description: data.description,
 *       filesCount: files.length,
 *       fileDetails: files.map((f: any) => ({
 *         fieldname: f.fieldname,      // 'files'
 *         originalname: f.clientName,  // 'photo-1701731430123.jpg'
 *         mimetype: f.headers['content-type'],
 *         size: f.size,
 *         path: f.tmpPath, // Ruta temporal antes de guardar
 *       })),
 *     });
 * 
 *     // Crear incidente
 *     const incident = await Incident.create({
 *       date: data.date,
 *       routeRunId: data.routeRunId,
 *       description: data.description || '',
 *     });
 * 
 *     // Guardar archivos
 *     for (let file of files) {
 *       const fileName = `${Date.now()}-${file.clientName}`;
 *       await file.move('storage/uploads/incidents', { name: fileName });
 *       
 *       // Guardar referencia en tabla de evidencias
 *       await incident.related('evidences').create({
 *         filePath: `uploads/incidents/${fileName}`,
 *         fileType: file.headers['content-type'],
 *         fileName: file.clientName,
 *       });
 *     }
 * 
 *     return response.created(incident);
 *   }
 * }
 * 
 * BACKEND MODEL - app/Models/Incident.ts
 * 
 * import { DateTime } from 'luxon'
 * import { BaseModel, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
 * import Evidence from './Evidence'
 * 
 * export default class Incident extends BaseModel {
 *   public static table = 'incidents'
 * 
 *   @column({ isPrimary: true })
 *   public id: number
 * 
 *   @column()
 *   public date: DateTime
 * 
 *   @column()
 *   public placeId: number
 * 
 *   @column()
 *   public routeRunId: number
 * 
 *   @column()
 *   public description: string
 * 
 *   @hasMany(() => Evidence)
 *   public evidences: HasMany<typeof Evidence>
 * 
 *   @column.dateTime({ autoCreate: true })
 *   public createdAt: DateTime
 * 
 *   @column.dateTime({ autoCreate: true, autoUpdate: true })
 *   public updatedAt: DateTime
 * }
 * 
 * BACKEND EVIDENCE MODEL - app/Models/Evidence.ts
 * 
 * import { DateTime } from 'luxon'
 * import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
 * import Incident from './Incident'
 * 
 * export default class Evidence extends BaseModel {
 *   public static table = 'evidences'
 * 
 *   @column({ isPrimary: true })
 *   public id: number
 * 
 *   @column()
 *   public incidentId: number
 * 
 *   @column()
 *   public filePath: string // uploads/incidents/1701731430123.jpg
 * 
 *   @column()
 *   public fileType: string // image/jpeg, audio/webm, video/mp4, etc
 * 
 *   @column()
 *   public fileName: string // photo-1701731430123.jpg
 * 
 *   @belongsTo(() => Incident)
 *   public incident: BelongsTo<typeof Incident>
 * 
 *   @column.dateTime({ autoCreate: true })
 *   public createdAt: DateTime
 * 
 *   @column.dateTime({ autoCreate: true, autoUpdate: true })
 *   public updatedAt: DateTime
 * }
 * 
 * DATABASE MIGRATION - database/migrations/XXXX_create_evidences_table.ts
 * 
 * import BaseSchema from '@ioc:Adonis/Lucid/Schema'
 * 
 * export default class extends BaseSchema {
 *   protected tableName = 'evidences'
 * 
 *   public async up() {
 *     this.schema.createTable(this.tableName, (table) => {
 *       table.increments('id')
 *       table.integer('incident_id').unsigned().references('incidents.id').onDelete('CASCADE')
 *       table.string('file_path').notNullable() // uploads/incidents/1701731430123.jpg
 *       table.string('file_type').notNullable()  // image/jpeg, audio/webm, etc
 *       table.string('file_name').notNullable()  // photo-1701731430123.jpg
 *       table.timestamp('created_at', { useTz: true })
 *       table.timestamp('updated_at', { useTz: true })
 *     })
 *   }
 * 
 *   public async down() {
 *     this.schema.dropTable(this.tableName)
 *   }
 * }
 */

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
  private currentUserLocation: { lat: number; lng: number } | null = null;

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

  constructor(private incidentsService:IncidentsService,private alertController: AlertController, private ngZone: NgZone, private routeService : RouteService, private runRouteService: RunroutesService ,private socketService: SocketService) {}

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

      // Crear FormData para enviar archivos
      // ESTRUCTURA PARA EL BACKEND:
      // - date: string (ISO 8601 format) - Fecha/hora del incidente
      // - routeRunId: number - ID del recorrido activo
      // - description: string - Descripción del incidente
      // - locationLatLng: object - { lat: number, lng: number } - Ubicación del incidente
      // - files: File[] - Array de archivos en FormData con clave "files"
      //   Cada archivo se agrega con: formData.append('files', file, filename)
      //   Los nombres de archivo preservan su extensión original
      
      const formData = new FormData();
      
      // Información del incidente
      formData.append('date', new Date().toISOString());
      formData.append('routeRunId', this.runrouterActive?.id?.toString() || '0');
      formData.append('description', this.incidentDescription || '');
      
      // Agregar ubicación del incidente (ubicación actual del usuario)
      if (this.currentUserLocation) {
        formData.append('lat', this.currentUserLocation.lat.toString())
        formData.append('lng', this.currentUserLocation.lng.toString())
        console.log('[Incident] Ubicación actual agregada:', this.currentUserLocation);
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
        },
        error: async (err) => {
          console.error('[Incident] Error al crear incidente:', err);
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
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Error procesando el incidente',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

}

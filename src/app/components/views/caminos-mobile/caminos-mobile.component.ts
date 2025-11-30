
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { PathMapComponent } from '../path-map/path-map.component';

interface UserPath {
  name: string;
  origin: string;
  destination: string;
  originLatLng?: any;
  destinationLatLng?: any;
}

@Component({
  selector: 'app-caminos-mobile',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, PathMapComponent],
  templateUrl: './caminos-mobile.component.html',
  styleUrls: ['./caminos-mobile.component.css']
})
export class CaminosMobileComponent implements OnInit, OnDestroy {
  userPaths: UserPath[] = [
    { name: 'Casa a Universidad', origin: 'Casa', destination: 'Universidad', originLatLng: { lat: 25.5430, lng: -103.4235 }, destinationLatLng: { lat: 25.5560, lng: -103.4250 } },
    { name: 'Trabajo a Gimnasio', origin: 'Trabajo', destination: 'Gimnasio', originLatLng: { lat: 25.5485, lng: -103.4180 }, destinationLatLng: { lat: 25.5300, lng: -103.4300 } }
  ];
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

  constructor(private alertController: AlertController, private ngZone: NgZone) {}

  ngOnInit() {
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
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2d2d2d' }] }
      ],
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
            setTimeout(() => this.initMobileMap(), 200);
          });
        } }
      ]
    });
    await alert.present();
  }

  saveNewPath() {
    if (this.newPath.name && this.newPath.origin && this.newPath.destination) {
      this.userPaths.push({ ...this.newPath });
      this.newPath = { name: '', origin: '', destination: '' };
      this.addingPath = false;
      this.originSuggestions = [];
      this.destinationSuggestions = [];
    }
  }

  endActivePath() {
    this.activePath = null;
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

  // Lógica de mapa eliminada: ahora se usa PathMapComponent
}

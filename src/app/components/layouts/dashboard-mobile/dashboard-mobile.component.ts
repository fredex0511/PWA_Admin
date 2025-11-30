import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PathListComponent } from '../../views/path-list/path-list.component';
import { PathFormComponent } from '../../views/path-form/path-form.component';
import { PathMapComponent } from '../../views/path-map/path-map.component';

@Component({
  selector: 'app-dashboard-mobile',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, PathListComponent, PathFormComponent, PathMapComponent],
  templateUrl: './dashboard-mobile.component.html',
  styleUrls: ['./dashboard-mobile.component.css']
})
export class DashboardMobileComponent implements OnInit {
  userEmail: string = '';

  // Estados para la nueva UI
  addingPath = false;
  activePath: any = null;
  userPaths: any[] = [
    { name: 'Casa a Universidad', origin: 'Casa', destination: 'Universidad' },
    { name: 'Trabajo a Gimnasio', origin: 'Trabajo', destination: 'Gimnasio' }
  ];
  newPath: any = { name: '', origin: '', destination: '' };
  originSuggestions: any[] = [];
  destinationSuggestions: any[] = [];
  private placesService: any = null;
  private autocompleteService: any = null;
  private directionsService: any = null;
  private directionsRenderer: any = null;

  menuItems = [
    { title: 'Inicio', icon: 'home-outline', route: '/dashboard' },
    { title: 'Caminos', icon: 'map-outline', route: '/caminos' },
    { title: 'Monitoreadores', icon: 'people-outline', route: '/monitoreadores' },
    { title: 'Incidentes', icon: 'alert-circle-outline', route: '/incidentes' },
    { title: 'Zonas Peligrosas', icon: 'warning-outline', route: '/zonas-peligrosas' }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.userEmail = localStorage.getItem('walksafe_user_email') || 'Usuario';
    this.initGoogleServices();
  }

  initGoogleServices() {
    const g = (window as any).google;
    if (g && g.maps) {
      this.autocompleteService = new g.maps.places.AutocompleteService();
      this.directionsService = new g.maps.DirectionsService();
    }
  }

  logout() {
    localStorage.removeItem('walksafe_user_logged_in');
    localStorage.removeItem('walksafe_user_email');
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  // Lógica de caminos
  confirmStartPath(path: any) {
    if (confirm(`¿Iniciar el camino "${path.name}"?`)) {
      this.activePath = path;
      setTimeout(() => this.initMap(), 200); // Espera a que el DOM renderice el mapa
    }
  }

  editPath(path: any) {
    // Aquí podrías abrir un modal o permitir edición inline
    alert('Funcionalidad de edición no implementada');
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


  // Autocompletado real con Google Places
  searchOrigin(event: any) {
    const value = event.target.value;
    if (this.autocompleteService && value && value.length > 2) {
      this.autocompleteService.getPlacePredictions({ input: value, componentRestrictions: { country: 'mx' } }, (predictions: any[], status: any) => {
        this.originSuggestions = (status === 'OK' && predictions) ? predictions : [];
      });
    } else {
      this.originSuggestions = [];
    }
  }

  searchDestination(event: any) {
    const value = event.target.value;
    if (this.autocompleteService && value && value.length > 2) {
      this.autocompleteService.getPlacePredictions({ input: value, componentRestrictions: { country: 'mx' } }, (predictions: any[], status: any) => {
        this.destinationSuggestions = (status === 'OK' && predictions) ? predictions : [];
      });
    } else {
      this.destinationSuggestions = [];
    }
  }


  selectOrigin(suggestion: any) {
    this.newPath.origin = suggestion.description;
    this.originSuggestions = [];
    this.getPlaceLatLng(suggestion.place_id, (latLng: any) => {
      this.newPath.originLatLng = latLng;
    });
  }

  selectDestination(suggestion: any) {
    this.newPath.destination = suggestion.description;
    this.destinationSuggestions = [];
    this.getPlaceLatLng(suggestion.place_id, (latLng: any) => {
      this.newPath.destinationLatLng = latLng;
    });
  }

  getPlaceLatLng(placeId: string, cb: (latLng: any) => void) {
    const g = (window as any).google;
    if (!this.placesService) {
      const dummy = document.createElement('div');
      this.placesService = new g.maps.places.PlacesService(dummy);
    }
    this.placesService.getDetails({ placeId }, (place: any, status: any) => {
      if (status === 'OK' && place && place.geometry && place.geometry.location) {
        cb({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    });
  }


  endActivePath() {
    this.activePath = null;
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
      this.directionsRenderer = null;
    }
  }

  // Inicialización y renderizado del mapa y ruta
  initMap() {
    const g = (window as any).google;
    const mapEl = document.getElementById('map');
    if (!g || !g.maps || !mapEl || !this.activePath) return;

    // Usar lat/lng si existen, si no, fallback a texto
    let origin = this.activePath.originLatLng;
    let destination = this.activePath.destinationLatLng;

    // Si no hay lat/lng, geocodificar los textos
    const geocodeIfNeeded = (address: string, cb: (latLng: any) => void) => {
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ address }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          cb(results[0].geometry.location);
        }
      });
    };

    const renderMap = (originLatLng: any, destLatLng: any) => {
      const map = new g.maps.Map(mapEl, {
        center: originLatLng,
        zoom: 14,
        disableDefaultUI: true
      });
      if (!this.directionsService) this.directionsService = new g.maps.DirectionsService();
      if (!this.directionsRenderer) this.directionsRenderer = new g.maps.DirectionsRenderer({ map });
      else this.directionsRenderer.setMap(map);
      this.directionsService.route({
        origin: originLatLng,
        destination: destLatLng,
        travelMode: g.maps.TravelMode.WALKING
      }, (result: any, status: any) => {
        if (status === 'OK') {
          this.directionsRenderer.setDirections(result);
        }
      });
      // Marcar origen y destino
      new g.maps.Marker({ position: originLatLng, map, label: 'O' });
      new g.maps.Marker({ position: destLatLng, map, label: 'D' });
    };

    if (origin && destination) {
      renderMap(origin, destination);
    } else {
      // Geocodificar si falta alguno
      if (!origin) {
        geocodeIfNeeded(this.activePath.origin, (loc: any) => {
          origin = { lat: loc.lat(), lng: loc.lng() };
          this.activePath.originLatLng = origin;
          if (destination) renderMap(origin, destination);
        });
      }
      if (!destination) {
        geocodeIfNeeded(this.activePath.destination, (loc: any) => {
          destination = { lat: loc.lat(), lng: loc.lng() };
          this.activePath.destinationLatLng = destination;
          if (origin) renderMap(origin, destination);
        });
      }
    }
  }
}

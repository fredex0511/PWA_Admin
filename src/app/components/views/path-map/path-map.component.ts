import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-path-map',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './path-map.component.html',
  styleUrls: ['./path-map.component.css']
})
export class PathMapComponent implements OnChanges, AfterViewInit {
  @Input() path: any = null;
  @Output() end = new EventEmitter<void>();

  ngAfterViewInit() {
    this.renderMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['path']) {
      setTimeout(() => this.renderMap(), 100);
    }
  }

  renderMap() {
    const g = (window as any).google;
    const mapEl = document.getElementById('map');
    if (!g || !g.maps || !mapEl || !this.path) return;
    let origin = this.path.originLatLng;
    let destination = this.path.destinationLatLng;
    const geocodeIfNeeded = (address: string, cb: (latLng: any) => void) => {
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ address }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          cb(results[0].geometry.location);
        }
      });
    };
    const render = (originLatLng: any, destLatLng: any) => {
      const map = new g.maps.Map(mapEl, {
        center: originLatLng,
        zoom: 14,
        disableDefaultUI: true
      });
      const directionsService = new g.maps.DirectionsService();
      const directionsRenderer = new g.maps.DirectionsRenderer({ map });
      directionsService.route({
        origin: originLatLng,
        destination: destLatLng,
        travelMode: g.maps.TravelMode.WALKING
      }, (result: any, status: any) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        }
      });
      new g.maps.Marker({ position: originLatLng, map, label: 'O' });
      new g.maps.Marker({ position: destLatLng, map, label: 'D' });
    };
    if (origin && destination) {
      render(origin, destination);
    } else {
      if (!origin) {
        geocodeIfNeeded(this.path.origin, (loc: any) => {
          origin = { lat: loc.lat(), lng: loc.lng() };
          this.path.originLatLng = origin;
          if (destination) render(origin, destination);
        });
      }
      if (!destination) {
        geocodeIfNeeded(this.path.destination, (loc: any) => {
          destination = { lat: loc.lat(), lng: loc.lng() };
          this.path.destinationLatLng = destination;
          if (origin) render(origin, destination);
        });
      }
    }
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PlacesService } from 'src/app/services/places';

// Interfaces
interface Coordinates {
  lat: number;
  lng: number;
}

interface Position {
  x: number;
  y: number;
}

interface Incident {
  id: string;
  location: Coordinates;
  type: string;
  severity: 'sin_riesgo' | 'molestias' | 'peligroso' | 'muy_peligroso';
  reportedAt: Date;
  description: string;
  incidentTypeName?: string;
}

interface DangerZone {
  id: string;
  name: string;
  description: string;
  location: string;
  coordinates: Coordinates;
  position: Position;
  radius: number;
  severity: 'sin_riesgo' | 'molestias' | 'peligroso' | 'muy_peligroso';
  incidentCount: number;
  detectedAt: Date;
  incidents: Incident[];
}

// Ensure Window has a google property at runtime; avoid declaring global `google` to prevent redeclaration errors.
declare global { interface Window { google: any; } }

@Component({
  selector: 'app-zonas-peligrosas',
  imports: [CommonModule, IonicModule],
  templateUrl: './zonas-peligrosas.html',
  styleUrl: './zonas-peligrosas.css'
})
export class ZonasPeligrosas implements OnInit, OnDestroy {
  dangerZones: DangerZone[] = [];
  selectedZone: DangerZone | null = null;
  showLegend: boolean = false;
  totalIncidents: number = 0;
  criticalZones: number = 0;
  highRiskZones: number = 0;
  mediumRiskZones: number = 0;
  lowRiskZones: number = 0;
  // Google Maps objects
  private map: any = null;
  private markers: any[] = [];
  private circles: any[] = [];
  private incidentMarkers: any[] = [];
  private infoWindow: any = null;
  private mapsLoaded = false;
  
  // Map configuration
  private readonly MAP_BOUNDS = {
    // Torreón, Coahuila approx bounds
    minLat: 25.5200,
    maxLat: 25.5650,
    minLng: -103.4500,
    maxLng: -103.3800
  };

  constructor(private placesService:PlacesService) { }

  ngOnInit() {
    this.loadGoogleMapsSdk()
      .then(() => {
        this.mapsLoaded = true;
        this.getPlaces();
      })
      .catch((err: any) => console.error('Error loading Google Maps SDK', err));
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private async getPlaces(){
    this.placesService
      .getPlacesIncidents()
      .subscribe({
        next: async (resp) => {
          console.log('Places data:', resp);
          if (resp.data && resp.data.length > 0) {
            this.loadIncidentsFromPlaces(resp.data);
          }
        },
        error: async (err) => {
          let message = 'Error al cargar lugares';
          if (err.error?.msg) {
            message = err.error.msg;
          }
          console.error('Error loading places:', message);
        },
      });
  }

  private loadIncidentsFromPlaces(places: any[]) {
    const incidents: Incident[] = [];
    
    places.forEach(place => {
      if (place.incidents && place.incidents.length > 0) {
        place.incidents.forEach((incident: any) => {
          incidents.push({
            id: incident.id.toString(),
            location: { 
              lat: parseFloat(place.lat), 
              lng: parseFloat(place.long) 
            },
            type: incident.incidentType?.name || 'Incidente',
            severity: incident.type as 'sin_riesgo' | 'molestias' | 'peligroso' | 'muy_peligroso',
            reportedAt: new Date(incident.date),
            description: incident.description !== 'null' ? incident.description : '',
            incidentTypeName: incident.incidentType?.name
          });
        });
      }
    });
    
    console.log('Loaded incidents:', incidents);
    this.totalIncidents = incidents.length;
    
    this.calculateDangerZonesFromIncidents(incidents);
  }

  private calculateDangerZonesFromIncidents(incidents: Incident[]) {
    if (incidents.length === 0) {
      this.dangerZones = [];
      if (this.map) {
        this.initMap();
      } else {
        setTimeout(() => this.initMap(), 100);
      }
      return;
    }

    const zones: DangerZone[] = [];

    // Group incidents by proximity (within 100 meters)
    const processed = new Set<string>();
    
    incidents.forEach(incident => {
      if (processed.has(incident.id)) return;

      const nearbyIncidents = incidents.filter(other => {
        if (processed.has(other.id)) return false;
        const distance = this.calculateDistance(incident.location, other.location);
        return distance <= 100; // Group incidents within 100m
      });

      // Mark incidents as processed
      nearbyIncidents.forEach(inc => processed.add(inc.id));

      // Find the most centralized incident
      const centralIncident = this.getMostCentralIncident(nearbyIncidents);

      // Determine zone severity based on incidents
      const severity = this.calculateZoneSeverity(nearbyIncidents);

      // Create danger zone centered on the most central incident
      const zone: DangerZone = {
        id: `zone-${zones.length + 1}`,
        name: this.generateZoneName(nearbyIncidents),
        description: this.generateZoneDescription(nearbyIncidents),
        location: this.getLocationName(centralIncident.location.lat, centralIncident.location.lng),
        coordinates: { lat: centralIncident.location.lat, lng: centralIncident.location.lng },
        position: this.coordinatesToPosition(centralIncident.location.lat, centralIncident.location.lng),
        radius: this.getZoneRadiusInMeters(severity),
        severity: severity,
        incidentCount: nearbyIncidents.length,
        detectedAt: new Date(Math.min(...nearbyIncidents.map(inc => inc.reportedAt.getTime()))),
        incidents: nearbyIncidents
      };

      zones.push(zone);
    });

    this.dangerZones = zones;
    this.updateZoneStats();
    
      if (this.map) {
        this.renderZonesOnMap();
      } else {
        setTimeout(() => this.initMap(), 100);
      }
  }

  // Utility methods
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  private getMostCentralIncident(incidents: Incident[]): Incident {
    if (incidents.length === 0) return incidents[0];
    if (incidents.length === 1) return incidents[0];

    // Calculate average coordinates
    const avgLat = incidents.reduce((sum, inc) => sum + inc.location.lat, 0) / incidents.length;
    const avgLng = incidents.reduce((sum, inc) => sum + inc.location.lng, 0) / incidents.length;

    // Find incident closest to average position
    let mostCentral = incidents[0];
    let minDistance = this.calculateDistance(
      incidents[0].location,
      { lat: avgLat, lng: avgLng }
    );

    incidents.forEach(incident => {
      const distance = this.calculateDistance(
        incident.location,
        { lat: avgLat, lng: avgLng }
      );
      if (distance < minDistance) {
        minDistance = distance;
        mostCentral = incident;
      }
    });

    return mostCentral;
  }

  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  coordinatesToPosition(lat: number, lng: number): Position {
    // Convert GPS coordinates to percentage position on map
    const x = ((lng - this.MAP_BOUNDS.minLng) / (this.MAP_BOUNDS.maxLng - this.MAP_BOUNDS.minLng)) * 100;
    const y = ((this.MAP_BOUNDS.maxLat - lat) / (this.MAP_BOUNDS.maxLat - this.MAP_BOUNDS.minLat)) * 100;
    
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y))
    };
  }

  calculateZoneSeverity(incidents: Incident[]): 'sin_riesgo' | 'molestias' | 'peligroso' | 'muy_peligroso' {
    const severityScores = { sin_riesgo: 1, molestias: 2, peligroso: 3, muy_peligroso: 4 };
    const avgScore = incidents.reduce((sum, inc) => sum + severityScores[inc.severity], 0) / incidents.length;
    
    if (avgScore >= 3.5) return 'muy_peligroso';
    if (avgScore >= 2.5) return 'peligroso';
    if (avgScore >= 1.5) return 'molestias';
    return 'sin_riesgo';
  }

  generateZoneName(incidents: Incident[]): string {
    const types = [...new Set(incidents.map(inc => inc.type))];
    if (types.length === 1) {
      return `Zona de ${types[0]}`;
    }
    return `Zona de Múltiples Incidentes`;
  }

  generateZoneDescription(incidents: Incident[]): string {
    const typeCount = incidents.reduce((acc, inc) => {
      acc[inc.type] = (acc[inc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const descriptions = Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    return `${descriptions} reportados en esta área`;
  }

  getLocationName(lat: number, lng: number): string {
    // Mock location names - replace with actual geocoding service
    const locations = [
      'Av. Corrientes',
      'Plaza San Martín',
      'Barrio Norte',
      'Microcentro',
      'Puerto Madero',
      'Retiro'
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  // UI interaction methods
  selectZone(zone: DangerZone) {
    this.selectedZone = zone;
  }

  clearSelection() {
    this.selectedZone = null;
  }

  trackByZoneId(index: number, zone: DangerZone): string {
    return zone.id;
  }

  private updateZoneStats() {
    this.criticalZones = this.dangerZones.filter(z => z.severity === 'muy_peligroso').length;
    this.highRiskZones = this.dangerZones.filter(z => z.severity === 'peligroso').length;
    this.mediumRiskZones = this.dangerZones.filter(z => z.severity === 'molestias').length;
    this.lowRiskZones = this.dangerZones.filter(z => z.severity === 'sin_riesgo').length;
  }

  getZoneRadius(severity: string): number {
    // Return pixel radius based on severity for visual representation
    const baseRadius = 60;
    const multipliers = { sin_riesgo: 0.8, molestias: 1.0, peligroso: 1.2, muy_peligroso: 1.5 };
    return baseRadius * (multipliers[severity as keyof typeof multipliers] || 1);
  }

  getZoneRadiusInMeters(severity: string): number {
    // Return actual radius in meters based on severity
    switch (severity) {
      case 'sin_riesgo':
        return 100;
      case 'molestias':
        return 200;
      case 'peligroso':
        return 300;
      case 'muy_peligroso':
        return 400;
      default:
        return 200;
    }
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'sin_riesgo':
        return 'success';
      case 'molestias':
        return 'tertiary';
      case 'peligroso':
        return 'warning';
      case 'muy_peligroso':
        return 'danger';
      default:
        return 'medium';
    }
  }

  private getMarkerAndCircleColors(severity: string): { fill: string; stroke: string } {
    switch (severity) {
      case 'sin_riesgo':
        return { fill: '#2dd36f', stroke: '#28ba62' }; // Verde (success)
      case 'molestias':
        return { fill: '#6030ff', stroke: '#5260ff' }; // Amarillo (warning)
      case 'peligroso':
        return { fill: '#ffc409', stroke: '#ffca22' }; // Naranja (tertiary personalizado)
      case 'muy_peligroso':
        return { fill: '#eb445a', stroke: '#cf3c4f' }; // Rojo (danger)
      default:
        return { fill: '#92949c', stroke: '#808289' }; // Gris (medium)
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'sin_riesgo':
        return 'Riesgo Bajo';
      case 'molestias':
        return 'Riesgo Medio';
      case 'peligroso':
        return 'Riesgo Alto';
      case 'muy_peligroso':
        return 'Riesgo Crítico';
      default:
        return 'Desconocido';
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / 60000);
      return `hace ${diffMins} minutos`;
    } else if (diffHours < 24) {
      return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    }
  }

  // Map control methods
  refreshMap() {
    console.log('Actualizando mapa...');
    this.getPlaces();
  }

  toggleLegend() {
    this.showLegend = !this.showLegend;
  }

  centerMap() {
    console.log('Centrando mapa...');
    this.clearSelection();
    if (this.map && this.dangerZones.length > 0) {
      const g = (window as any).google;
      const bounds = new g.maps.LatLngBounds();
      this.dangerZones.forEach((z: DangerZone) => bounds.extend(new g.maps.LatLng(z.coordinates.lat, z.coordinates.lng)));
      this.map.fitBounds(bounds);
    }
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

  private initMap() {
    if (!(window as any).google || !(window as any).google.maps) {
      console.error('Google Maps SDK not available');
      return;
    }

    const g = (window as any).google;
    const center = { lat: 25.5430, lng: -103.4235 }; // Torreón center
    this.map = new g.maps.Map(document.getElementById('gmap') as HTMLElement, {
      center,
      zoom: 15,
      disableDefaultUI: true
    });

    // Create InfoWindow for hover details
    this.infoWindow = new g.maps.InfoWindow();

    this.renderZonesOnMap();
    // When user clicks on the map (not on a marker/circle), clear any selected zone/dialog
    this.map.addListener('click', (e: any) => {
      this.clearSelection();
      this.infoWindow.close();
    });
  }

  private renderZonesOnMap() {
    if (!this.map) return;

    // Clear previous markers and circles
    this.markers.forEach((m: any) => m.setMap(null));
    this.circles.forEach((c: any) => c.setMap(null));
    this.incidentMarkers.forEach((m: any) => m.setMap(null));
    this.markers = [];
    this.circles = [];
    this.incidentMarkers = [];

    const g = (window as any).google;

    this.dangerZones.forEach((zone: DangerZone) => {
      const colors = this.getMarkerAndCircleColors(zone.severity);
      
      // Zone center marker (larger)
      const zoneMarker = new g.maps.Marker({
        position: { lat: zone.coordinates.lat, lng: zone.coordinates.lng },
        map: this.map!,
        title: zone.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: colors.fill,
          fillOpacity: 1,
          strokeColor: colors.stroke,
          strokeWeight: 3
        },
        zIndex: 1000
      });

      zoneMarker.addListener('click', () => this.selectZone(zone));
      
      // Hover to show zone info
      zoneMarker.addListener('mouseover', () => {
        const content = this.generateZoneInfoContent(zone);
        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, zoneMarker);
      });

      zoneMarker.addListener('mouseout', () => {
        setTimeout(() => this.infoWindow.close(), 2000);
      });

      this.markers.push(zoneMarker);

      // Circle (zone radius)
      const circle = new g.maps.Circle({
        strokeColor: colors.stroke,
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: colors.fill,
        fillOpacity: 0.15,
        map: this.map!,
        center: { lat: zone.coordinates.lat, lng: zone.coordinates.lng },
        radius: zone.radius
      });

      circle.addListener('click', (ev: any) => this.selectZone(zone));
      this.circles.push(circle);

      // Individual incident markers (smaller points)
      zone.incidents.forEach((incident: Incident) => {
        const incidentMarker = new g.maps.Marker({
          position: { lat: incident.location.lat, lng: incident.location.lng },
          map: this.map!,
          title: incident.type,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: colors.fill,
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 1
          },
          zIndex: 500
        });

        // Hover to show incident info
        incidentMarker.addListener('mouseover', () => {
          const content = this.generateIncidentInfoContent(incident, zone);
          this.infoWindow.setContent(content);
          this.infoWindow.open(this.map, incidentMarker);
        });

        incidentMarker.addListener('mouseout', () => {
          setTimeout(() => this.infoWindow.close(), 2000);
        });

        incidentMarker.addListener('click', () => this.selectZone(zone));
        this.incidentMarkers.push(incidentMarker);
      });
    });

    // Fit to bounds
    if (this.dangerZones.length > 0) {
      const bounds = new g.maps.LatLngBounds();
      this.dangerZones.forEach((z: DangerZone) => {
        z.incidents.forEach((inc: Incident) => {
          bounds.extend(new g.maps.LatLng(inc.location.lat, inc.location.lng));
        });
      });
      this.map.fitBounds(bounds);
    }
  }

  // Notification methods
  previewNotification() {
    const message = this.generateNotificationMessage();
    console.log('Vista previa de notificación:', message);
    
    // Show preview modal or alert
    alert(`Vista previa:\n\n${message}`);
  }

  sendDangerZoneNotification() {
    if (this.dangerZones.length === 0) {
      console.log('No hay zonas peligrosas para notificar');
      return;
    }

    const message = this.generateNotificationMessage();
    console.log('Enviando notificación:', message);
    
    // Implement actual notification sending logic here
    alert(`¡Notificación enviada!\n\n${message}`);
  }

  private generateNotificationMessage(): string {
    if (this.dangerZones.length === 0) {
      return 'No hay zonas peligrosas detectadas en este momento.';
    }

    let message = `🚨 ALERTA DE SEGURIDAD\n\n`;
    message += `Se han detectado ${this.dangerZones.length} zona${this.dangerZones.length > 1 ? 's' : ''} peligrosa${this.dangerZones.length > 1 ? 's' : ''} en tu área:\n\n`;

    if (this.criticalZones > 0) {
      message += `⚠️ ${this.criticalZones} zona${this.criticalZones > 1 ? 's' : ''} de riesgo CRÍTICO\n`;
    }
    if (this.highRiskZones > 0) {
      message += `⚠️ ${this.highRiskZones} zona${this.highRiskZones > 1 ? 's' : ''} de riesgo ALTO\n`;
    }

    message += `\nEvita estas áreas y mantente alerta. Tu seguridad es nuestra prioridad.`;

    return message;
  }

  private generateZoneInfoContent(zone: DangerZone): string {
    return `
      <div style="padding: 8px; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${zone.name}</h3>
        <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;"><strong>Severidad:</strong> ${this.getSeverityLabel(zone.severity)}</p>
        <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;"><strong>Incidentes:</strong> ${zone.incidentCount}</p>
        <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;"><strong>Radio:</strong> ${zone.radius}m</p>
        <p style="margin: 0; color: #888; font-size: 11px;">${zone.description}</p>
      </div>
    `;
  }

  private generateIncidentInfoContent(incident: Incident, zone: DangerZone): string {
    return `
      <div style="padding: 8px; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">Incidente: ${incident.type}</h3>
        <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;"><strong>Zona:</strong> ${zone.name}</p>
        <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;"><strong>Severidad:</strong> ${this.getSeverityLabel(incident.severity)}</p>
        <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;"><strong>Reportado:</strong> ${this.formatDate(incident.reportedAt)}</p>
        ${incident.description ? `<p style="margin: 0; color: #888; font-size: 11px;">${incident.description}</p>` : ''}
      </div>
    `;
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

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
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedAt: Date;
  description: string;
}

interface DangerZone {
  id: string;
  name: string;
  description: string;
  location: string;
  coordinates: Coordinates;
  position: Position;
  radius: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
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
  // Google Maps objects
  private map: any = null;
  private markers: any[] = [];
  private circles: any[] = [];
  private mapsLoaded = false;
  
  // Map configuration
  private readonly SAFETY_RADIUS = 50; // 50 meters
  private readonly MAP_BOUNDS = {
    // Torreón, Coahuila approx bounds
    minLat: 25.5200,
    maxLat: 25.5650,
    minLng: -103.4500,
    maxLng: -103.3800
  };

  constructor() { }

  ngOnInit() {
    this.loadIncidentsData();
    this.calculateDangerZones();
    this.loadGoogleMapsSdk()
      .then(() => {
        this.mapsLoaded = true;
        setTimeout(() => this.initMap(), 0);
      })
      .catch(err => console.error('Error loading Google Maps SDK', err));
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  // Data loading and processing
  loadIncidentsData() {
    // Mock incidents data - replace with actual service call
    const mockIncidents: Incident[] = [
      // Torreón sample incidents
      {
        id: '1',
        location: { lat: 25.5430, lng: -103.4235 }, // Centro (near Boulevard Independencia)
        type: 'Robo',
        severity: 'high',
        reportedAt: new Date(Date.now() - 3600000),
        description: 'Robo con violencia reportado'
      },
      {
        id: '2',
        location: { lat: 25.5455, lng: -103.4200 }, // Col. Centro
        type: 'Asalto',
        severity: 'critical',
        reportedAt: new Date(Date.now() - 1800000),
        description: 'Asalto reportado en vía pública'
      },
      {
        id: '3',
        location: { lat: 25.5380, lng: -103.4280 }, // Cerca de Plaza cu
        type: 'Amenaza',
        severity: 'medium',
        reportedAt: new Date(Date.now() - 7200000),
        description: 'Persona sospechosa observada'
      },
      {
        id: '4',
        location: { lat: 25.5330, lng: -103.4250 }, // Zona industrial cercana
        type: 'Vandalismo',
        severity: 'low',
        reportedAt: new Date(Date.now() - 14400000),
        description: 'Daños a propiedad reportados'
      },
      {
        id: '5',
        location: { lat: 25.5500, lng: -103.4180 }, // Barrio residencial
        type: 'Robo',
        severity: 'high',
        reportedAt: new Date(Date.now() - 10800000),
        description: 'Hurto de pertenencias'
      },
      {
        id: '6',
        location: { lat: 25.5360, lng: -103.4150 }, // Cercanías
        type: 'Agresión',
        severity: 'critical',
        reportedAt: new Date(Date.now() - 5400000),
        description: 'Agresión física reportada'
      }
    ];

    this.totalIncidents = mockIncidents.length;
    return mockIncidents;
  }

  calculateDangerZones() {
    const incidents = this.loadIncidentsData();
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

      // Calculate zone center (average of incident coordinates)
      const centerLat = nearbyIncidents.reduce((sum, inc) => sum + inc.location.lat, 0) / nearbyIncidents.length;
      const centerLng = nearbyIncidents.reduce((sum, inc) => sum + inc.location.lng, 0) / nearbyIncidents.length;

      // Determine zone severity based on incidents
      const severity = this.calculateZoneSeverity(nearbyIncidents);

      // Create danger zone
      const zone: DangerZone = {
        id: `zone-${zones.length + 1}`,
        name: this.generateZoneName(nearbyIncidents),
        description: this.generateZoneDescription(nearbyIncidents),
        location: this.getLocationName(centerLat, centerLng),
        coordinates: { lat: centerLat, lng: centerLng },
        position: this.coordinatesToPosition(centerLat, centerLng),
        radius: this.SAFETY_RADIUS,
        severity: severity,
        incidentCount: nearbyIncidents.length,
        detectedAt: new Date(Math.min(...nearbyIncidents.map(inc => inc.reportedAt.getTime()))),
        incidents: nearbyIncidents
      };

      zones.push(zone);
    });

    this.dangerZones = zones;
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

  calculateZoneSeverity(incidents: Incident[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const avgScore = incidents.reduce((sum, inc) => sum + severityScores[inc.severity], 0) / incidents.length;
    
    if (avgScore >= 3.5) return 'critical';
    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
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

  getZoneRadius(severity: string): number {
    // Return pixel radius based on severity for visual representation
    const baseRadius = 60;
    const multipliers = { low: 0.8, medium: 1.0, high: 1.2, critical: 1.5 };
    return baseRadius * (multipliers[severity as keyof typeof multipliers] || 1);
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low':
        return 'warning';
      case 'medium':
        return 'warning';
      case 'high':
        return 'danger';
      case 'critical':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'low':
        return 'Riesgo Bajo';
      case 'medium':
        return 'Riesgo Medio';
      case 'high':
        return 'Riesgo Alto';
      case 'critical':
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
    this.calculateDangerZones();
    if (this.mapsLoaded) this.renderZonesOnMap();
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
      this.dangerZones.forEach(z => bounds.extend(new g.maps.LatLng(z.coordinates.lat, z.coordinates.lng)));
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

    this.renderZonesOnMap();
    // When user clicks on the map (not on a marker/circle), clear any selected zone/dialog
    this.map.addListener('click', (e: any) => {
      this.clearSelection();
    });
  }

  private renderZonesOnMap() {
    if (!this.map) return;

    // Clear previous markers and circles
    this.markers.forEach(m => m.setMap(null));
    this.circles.forEach(c => c.setMap(null));
    this.markers = [];
    this.circles = [];

    this.dangerZones.forEach(zone => {
      // Marker
      const g = (window as any).google;
      const marker = new g.maps.Marker({
        position: { lat: zone.coordinates.lat, lng: zone.coordinates.lng },
        map: this.map!,
        title: zone.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ff6b35',
          fillOpacity: 1,
          strokeColor: '#92BEE0',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => this.selectZone(zone));
      this.markers.push(marker);

      // Circle (50m radius)
      const circle = new g.maps.Circle({
        strokeColor: '#ff0000',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: '#ff0000',
        fillOpacity: 0.18,
        map: this.map!,
        center: { lat: zone.coordinates.lat, lng: zone.coordinates.lng },
        radius: zone.radius // meters
      });

      circle.addListener('click', (ev: any) => this.selectZone(zone));
      this.circles.push(circle);
    });

    // Fit to bounds
    if (this.dangerZones.length > 0) {
      const g = (window as any).google;
      const bounds = new g.maps.LatLngBounds();
      this.dangerZones.forEach(z => bounds.extend(new g.maps.LatLng(z.coordinates.lat, z.coordinates.lng)));
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

    const criticalZones = this.dangerZones.filter(z => z.severity === 'critical').length;
    const highRiskZones = this.dangerZones.filter(z => z.severity === 'high').length;

    let message = `🚨 ALERTA DE SEGURIDAD\n\n`;
    message += `Se han detectado ${this.dangerZones.length} zona${this.dangerZones.length > 1 ? 's' : ''} peligrosa${this.dangerZones.length > 1 ? 's' : ''} en tu área:\n\n`;

    if (criticalZones > 0) {
      message += `⚠️ ${criticalZones} zona${criticalZones > 1 ? 's' : ''} de riesgo CRÍTICO\n`;
    }
    if (highRiskZones > 0) {
      message += `⚠️ ${highRiskZones} zona${highRiskZones > 1 ? 's' : ''} de riesgo ALTO\n`;
    }

    message += `\nEvita estas áreas y mantente alerta. Tu seguridad es nuestra prioridad.`;

    return message;
  }
}

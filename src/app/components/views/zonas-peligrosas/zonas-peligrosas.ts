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
  
  // Map configuration
  private readonly SAFETY_RADIUS = 50; // 50 meters
  private readonly MAP_BOUNDS = {
    minLat: -34.6037,
    maxLat: -34.6001,
    minLng: -58.3816,
    maxLng: -58.3765
  };

  constructor() { }

  ngOnInit() {
    this.loadIncidentsData();
    this.calculateDangerZones();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  // Data loading and processing
  loadIncidentsData() {
    // Mock incidents data - replace with actual service call
    const mockIncidents: Incident[] = [
      {
        id: '1',
        location: { lat: -34.6025, lng: -58.3795 },
        type: 'Robo',
        severity: 'high',
        reportedAt: new Date(Date.now() - 3600000),
        description: 'Robo a mano armada reportado'
      },
      {
        id: '2',
        location: { lat: -34.6027, lng: -58.3797 },
        type: 'Asalto',
        severity: 'critical',
        reportedAt: new Date(Date.now() - 1800000),
        description: 'Asalto con violencia'
      },
      {
        id: '3',
        location: { lat: -34.6015, lng: -58.3785 },
        type: 'Amenaza',
        severity: 'medium',
        reportedAt: new Date(Date.now() - 7200000),
        description: 'Persona sospechosa acosando'
      },
      {
        id: '4',
        location: { lat: -34.6030, lng: -58.3800 },
        type: 'Vandalismo',
        severity: 'low',
        reportedAt: new Date(Date.now() - 14400000),
        description: 'Daños a propiedad privada'
      },
      {
        id: '5',
        location: { lat: -34.6020, lng: -58.3790 },
        type: 'Robo',
        severity: 'high',
        reportedAt: new Date(Date.now() - 10800000),
        description: 'Hurto de pertenencias'
      },
      {
        id: '6',
        location: { lat: -34.6012, lng: -58.3778 },
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
  }

  toggleLegend() {
    this.showLegend = !this.showLegend;
  }

  centerMap() {
    console.log('Centrando mapa...');
    this.clearSelection();
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

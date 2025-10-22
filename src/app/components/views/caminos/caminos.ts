import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

// Interfaces
interface RoutePosition {
  x: number;
  y: number;
}

interface ActiveRoute {
  id: string;
  name: string;
  userName: string;
  status: 'active' | 'paused' | 'emergency' | 'completed';
  currentLocation: string;
  startTime: Date;
  lastUpdate: Date;
  progress: number;
  mapPosition: RoutePosition;
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

  constructor() { }

  ngOnInit() {
    this.loadActiveRoutes();
    this.startLiveUpdates();
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  // Data loading
  loadActiveRoutes() {
    // Mock data - replace with actual service call
    this.activeRoutes = [
      {
        id: '1',
        name: 'Camino a Casa',
        userName: 'María González',
        status: 'active',
        currentLocation: 'Av. Principal 123',
        startTime: new Date(Date.now() - 1200000), // 20 min ago
        lastUpdate: new Date(),
        progress: 65,
        mapPosition: { x: 35, y: 45 }
      },
      {
        id: '2',
        name: 'Ruta al Trabajo',
        userName: 'Carlos Rodríguez',
        status: 'paused',
        currentLocation: 'Plaza Central',
        startTime: new Date(Date.now() - 900000), // 15 min ago
        lastUpdate: new Date(Date.now() - 300000), // 5 min ago
        progress: 80,
        mapPosition: { x: 60, y: 30 }
      },
      {
        id: '3',
        name: 'Camino a Universidad',
        userName: 'Ana Martínez',
        status: 'active',
        currentLocation: 'Calle de la Paz 45',
        startTime: new Date(Date.now() - 600000), // 10 min ago
        lastUpdate: new Date(),
        progress: 45,
        mapPosition: { x: 25, y: 70 }
      },
      {
        id: '4',
        name: 'Ruta Nocturna',
        userName: 'José López',
        status: 'emergency',
        currentLocation: 'Zona Industrial',
        startTime: new Date(Date.now() - 1800000), // 30 min ago
        lastUpdate: new Date(Date.now() - 120000), // 2 min ago
        progress: 90,
        mapPosition: { x: 75, y: 60 }
      }
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
        route.mapPosition.x += (Math.random() - 0.5) * 2;
        route.mapPosition.y += (Math.random() - 0.5) * 2;
        
        // Keep within bounds
        route.mapPosition.x = Math.max(5, Math.min(95, route.mapPosition.x));
        route.mapPosition.y = Math.max(5, Math.min(95, route.mapPosition.y));
      }
    });
  }

  // Route selection
  selectRoute(route: ActiveRoute) {
    this.selectedRoute = route;
  }

  trackByRouteId(index: number, route: ActiveRoute): string {
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
}

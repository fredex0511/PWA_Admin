import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { Monitoreadores } from '../../views/monitoreadores/monitoreadores';
import { Incidentes } from '../../views/incidentes/incidentes';

@Component({
  selector: 'app-dashboard',
  imports: [IonicModule, CommonModule, Sidebar, Monitoreadores, Incidentes], 
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  currentSection = 'dashboard';
  
  startedPaths = [
    { id: 1, title: 'Camino 1', subtitle: 'En progreso' },
    { id: 2, title: 'Camino 2', subtitle: 'Pausado' },
  ];

  recentIncidents = [
    { id: 1, title: 'Incidente A', time: '2h' },
    { id: 2, title: 'Incidente B', time: '5h' },
  ];

  onSectionChange(section: string) {
    this.currentSection = section;
  }

  manageMonitors() {
    this.currentSection = 'monitoreadores';
  }

  notifyDangerZones() {
    this.currentSection = 'zonas-peligrosas';
  }
}

import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-incidentes',
  imports: [IonicModule, CommonModule],
  templateUrl: './incidentes.html',
  styleUrl: './incidentes.css'
})
export class Incidentes {
  incidentes = [
    { id: 1, title: 'Camino bloqueado', description: 'Árbol caído en el sendero principal', severity: 'Alta', time: '2h ago', status: 'Pendiente' },
    { id: 2, title: 'Monitoreador sin respuesta', description: 'Juan Pérez no responde desde hace 1 hora', severity: 'Media', time: '1h ago', status: 'En Proceso' },
    { id: 3, title: 'Zona peligrosa detectada', description: 'Actividad sospechosa en zona norte', severity: 'Alta', time: '30m ago', status: 'Resuelto' },
    { id: 4, title: 'Falla en comunicación', description: 'Problemas de señal en sector este', severity: 'Baja', time: '15m ago', status: 'Pendiente' }
  ];

  getSeverityColor(severity: string): string {
    switch(severity) {
      case 'Alta': return 'danger';
      case 'Media': return 'warning';
      case 'Baja': return 'success';
      default: return 'medium';
    }
  }
}
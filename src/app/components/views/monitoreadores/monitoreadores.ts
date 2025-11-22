import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-monitoreadores',
  imports: [IonicModule, CommonModule],
  templateUrl: './monitoreadores.html',
  styleUrl: './monitoreadores.css'
})
export class Monitoreadores {
  monitoreadores = [
    { id: 1, name: 'Juan Pérez', status: 'Activo', location: 'Zona Norte' },
    { id: 2, name: 'María García', status: 'Activo', location: 'Zona Sur' },
    { id: 3, name: 'Carlos López', status: 'Inactivo', location: 'Zona Este' },
    { id: 4, name: 'Ana Martínez', status: 'Activo', location: 'Zona Oeste' }
  ];
}
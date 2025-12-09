import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { UpdateService } from '../../../services/update.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet, IonButton, CommonModule],
})
export class DashboardComponent {
  public appPages = [
    { title: 'Caminos', url: '/dashboard/caminos', icon: 'walk' },
    { title: 'Incidentes', url: '/dashboard/incidentes', icon: 'warning' },
    { title: 'Zonas Peligrosas', url: '/dashboard/zonas-peligrosas', icon: 'alert' },
    { title: 'Usuarios', url: '/dashboard/monitoreadores', icon: 'people' },
  ];
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];
  public collapsed = false;

  toggleMenu() {
    this.collapsed = !this.collapsed;
  }

  constructor(private updateService: UpdateService) {
    // Register all icons at once. Note: importing everything increases bundle size.
    addIcons(icons as any);
  }

  checkUpdate() {
    this.updateService.manualUpdate();
  }
}

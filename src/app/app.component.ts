
import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, shieldCheckmark, mailOutline, keyOutline, arrowForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    addIcons({
      'download-outline': downloadOutline,
      'shield-checkmark': shieldCheckmark,
      'mail-outline': mailOutline,
      'key-outline': keyOutline,
      'arrow-forward-outline': arrowForwardOutline
    });
  }
}

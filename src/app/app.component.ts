
import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, shieldCheckmark, mailOutline, keyOutline, arrowForwardOutline } from 'ionicons/icons';
import { UpdateService } from './services/update.service';
import { WebPushService } from './services/webpush.service';

@Component({
  selector: 'app-root',
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  providers: [UpdateService],
})
export class AppComponent implements OnInit {
  constructor(
    private updateService: UpdateService,
    private webPushService: WebPushService
  ) {
    addIcons({
      'download-outline': downloadOutline,
      'shield-checkmark': shieldCheckmark,
      'mail-outline': mailOutline,
      'key-outline': keyOutline,
      'arrow-forward-outline': arrowForwardOutline
    });
  }

  async ngOnInit() {
    console.log('[AppComponent] ═══════════════════════════════════════');
    console.log('[AppComponent] 🚀 Aplicación iniciada');
    console.log('[AppComponent] ═══════════════════════════════════════');

    // Inicializar actualización automática de PWA
    this.updateService.initializeUpdateCheck();

    // Inicializar notificaciones push (Web Push)
    await this.webPushService.initialize();
  }
}

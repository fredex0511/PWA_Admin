
import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, shieldCheckmark, mailOutline, keyOutline, arrowForwardOutline } from 'ionicons/icons';
import { FirebasePushService } from './services/firebase-push.service';

@Component({
  selector: 'app-root',
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  providers: [FirebasePushService],
})
export class AppComponent implements OnInit {
  constructor(private firebasePush: FirebasePushService) {
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

    // Inicializar Firebase Push Notifications
    await this.initializeFirebasePush();
  }

  private async initializeFirebasePush(): Promise<void> {
    try {
      console.log('[AppComponent] 🔔 Inicializando notificaciones push...');
      
      const success = await this.firebasePush.initialize();

      if (success) {
        console.log('[AppComponent] ✅ Notificaciones push configuradas correctamente');
      } else {
        console.warn('[AppComponent] ⚠️ No se pudieron configurar las notificaciones push');
        console.warn('[AppComponent] 💡 Revisa los logs anteriores para más detalles');
      }
    } catch (error) {
      console.error('[AppComponent] ❌ Error inicializando notificaciones push:', error);
    }
  }
}

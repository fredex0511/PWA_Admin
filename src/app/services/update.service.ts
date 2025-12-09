import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  /**
   * Inicializa la detección de actualizaciones de la PWA
   */
  public initializeUpdateCheck(): void {
    if (!environment.production) {
      console.log('[UpdateService] ℹ️ Service Worker updates disabled in development');
      return;
    }

    console.log('[UpdateService] 🔄 Inicializando verificación de actualizaciones...');

    // Verificar cada 30 segundos si hay una nueva versión disponible
    setInterval(() => {
      this.checkForUpdates();
    }, 30 * 1000);

    // Escuchar cuando hay una actualización disponible
    this.swUpdate.versionUpdates.subscribe(event => {
      console.log('[UpdateService] 📦 Evento de actualización detectado:', event);

      if (event.type === 'VERSION_READY') {
        console.log('[UpdateService] ✅ Nueva versión disponible:', event);
        this.promptUserToUpdate();
      } else if (event.type === 'VERSION_INSTALLATION_FAILED') {
        console.error('[UpdateService] ❌ Error instalando actualización:', event);
        this.showErrorToast('Error al descargar la actualización');
      } else if (event.type === 'NO_NEW_VERSION_DETECTED') {
        console.log('[UpdateService] ℹ️ Sin nuevas actualizaciones disponibles');
      }
    });
  }

  /**
   * Verifica manualmente si hay actualizaciones disponibles
   */
  public async checkForUpdates(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      console.warn('[UpdateService] ⚠️ Service Worker no está habilitado');
      return false;
    }

    try {
      const updateAvailable = await this.swUpdate.checkForUpdate();
      if (updateAvailable) {
        console.log('[UpdateService] 📦 Nueva versión disponible (checkForUpdate)');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[UpdateService] ❌ Error verificando actualizaciones:', error);
      return false;
    }
  }

  /**
   * Muestra un alert al usuario ofreciendo actualizar la app
   */
  private async promptUserToUpdate(): Promise<void> {
    const alert = await this.alertController.create({
      header: '📲 Actualización Disponible',
      message: 'Una nueva versión de la aplicación está disponible. ¿Deseas actualizar ahora?',
      buttons: [
        {
          text: 'Más Tarde',
          role: 'cancel',
          handler: () => {
            console.log('[UpdateService] El usuario rechazó la actualización');
          }
        },
        {
          text: 'Actualizar Ahora',
          handler: async () => {
            console.log('[UpdateService] El usuario aceptó la actualización');
            await this.installUpdate();
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  /**
   * Instala la actualización disponible y recarga la página
   */
  private async installUpdate(): Promise<void> {
    try {
      console.log('[UpdateService] 🔄 Instalando actualización...');
      
      // Mostrar toast de carga
      const loadingToast = await this.toastController.create({
        message: 'Actualizando aplicación...',
        duration: 5000,
        position: 'bottom'
      });
      await loadingToast.present();

      // Activar la nueva versión
      await this.swUpdate.activateUpdate();

      console.log('[UpdateService] ✅ Actualización instalada, recargando página...');

      // Esperar un poco para que se termine de instalar, luego recargar
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('[UpdateService] ❌ Error instalando actualización:', error);
      this.showErrorToast('Error al actualizar la aplicación');
    }
  }

  /**
   * Muestra un toast de error
   */
  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }

  /**
   * Permite actualizar manualmente (para llamar desde componentes)
   */
  public async manualUpdate(): Promise<void> {
    const hasUpdate = await this.checkForUpdates();
    
    if (hasUpdate) {
      await this.promptUserToUpdate();
    } else {
      const toast = await this.toastController.create({
        message: 'La aplicación está actualizada',
        duration: 2000,
        position: 'bottom'
      });
      await toast.present();
    }
  }
}

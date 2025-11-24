import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PlatformDetectorService } from '../../../services/platform-detector';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css', './login.ionic.css']
})
export class Login implements OnInit {
  model: { email: string; password: string } = { email: '', password: '' };
  isMobileWeb: boolean = false;
  showBanner: boolean = false;
  private deferredPrompt: any = null;

  constructor(
    private router: Router,
    private platformDetector: PlatformDetectorService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.isMobileWeb = this.platformDetector.isMobile();
    console.log('Is mobile:', this.isMobileWeb);
    
    // Verificar si ya está instalada
    const isInstalled = localStorage.getItem('walksafe_pwa_installed') === 'true';
    this.showBanner = !isInstalled;
    
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('PWA install prompt available');
      
      // Mostrar banner y prompt si no está instalada
      if (!isInstalled) {
        this.showBanner = true;
        setTimeout(() => this.promptPWAInstall(), 500);
      }
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      localStorage.setItem('walksafe_pwa_installed', 'true');
      this.deferredPrompt = null;
      this.showBanner = false;
    });
  }

  onSubmit() {
    console.log('Login submit', this.model);
    window.alert(`Intentando iniciar sesión con ${this.model.email}`);
  }

  onForgot() {
    const email = this.model.email || prompt('Introduce tu correo para recuperar contraseña:');
    if (email) {
      window.alert(`Se ha enviado un enlace de recuperación a ${email}`);
    }
  }

  goToRegister() {
    console.log('goToRegister called');
    this.router.navigate(['/register'], { replaceUrl: true }).catch(err => console.error('Navigation failed:', err));
  }

  async openAppStore() {
    console.log('openAppStore called - Installing PWA');
    await this.installPWA();
  }

  private async installPWA() {
    if (!this.deferredPrompt) {
      console.log('No PWA install prompt available');
      await this.showPWANotAvailableMessage();
      return;
    }

    // Mostrar el prompt de instalación nativo
    this.deferredPrompt.prompt();
    
    // Esperar la respuesta del usuario
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      localStorage.setItem('walksafe_pwa_installed', 'true');
      await this.showInstallSuccessToast();
    }
    
    // Limpiar el prompt
    this.deferredPrompt = null;
  }

  /**
   * Prompt user to install the PWA on their device
   */
  private async promptPWAInstall() {
    const isInstalled = localStorage.getItem('walksafe_pwa_installed');
    
    if (isInstalled === 'true') {
      return; // Ya instalada, no molestar
    }

    // Small delay so page renders before alert appears
    await new Promise(res => setTimeout(res, 250));

    const alert = await this.alertController.create({
      header: 'Instala WalkSafe',
      message: '¿Deseas instalar WalkSafe en tu dispositivo para acceso rápido y una mejor experiencia?',
      buttons: [
        {
          text: 'Instalar',
          handler: () => this.installPWA()
        },
        {
          text: 'Más tarde',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  private async showPWANotAvailableMessage() {
    let message = 'La instalación de PWA no está disponible en este momento.';
    
    if (this.platformDetector.isIOS()) {
      message = 'En iOS, presiona el botón "Compartir" y selecciona "Añadir a pantalla de inicio" para instalar WalkSafe.';
    }

    const alert = await this.alertController.create({ 
      header: 'Instalar WalkSafe', 
      message, 
      buttons: ['OK'] 
    });
    await alert.present();
  }

  private async showInstallSuccessToast() {
    const toast = await this.toastController.create({
      message: '✅ ¡WalkSafe instalada exitosamente!',
      duration: 3000,
      position: 'bottom',
      color: 'success',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}

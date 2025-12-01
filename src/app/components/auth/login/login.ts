import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PlatformDetectorService } from '../../../services/platform-detector';
import { AuthService } from 'src/app/services/auth';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css', './login.ionic.css']
})
export class Login implements OnInit, OnDestroy {
  model: { email: string; password: string } = { email: '', password: '' };
  isMobile: boolean = false;
  showBanner: boolean = false;
  private deferredPrompt: any = null;

  private beforeInstallPromptListener: (() => void) | null = null;
  private appInstalledListener: (() => void) | null = null;

  constructor(
    private router: Router,
    private platformDetector: PlatformDetectorService,
    private toastController: ToastController,
    private alertController: AlertController,
    private renderer: Renderer2,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isMobile = this.platformDetector.isMobile();
    console.log('Is mobile:', this.isMobile);

    // Verificar si ya está instalada
    const isInstalled = localStorage.getItem('walksafe_pwa_installed') === 'true';
    this.showBanner = !isInstalled;

    this.beforeInstallPromptListener = this.renderer.listen('window', 'beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('PWA install prompt available');
      if (!isInstalled) {
        this.showBanner = true;
        setTimeout(() => this.promptPWAInstall(), 500);
      }
    });

    this.appInstalledListener = this.renderer.listen('window', 'appinstalled', () => {
      console.log('PWA installed successfully');
      localStorage.setItem('walksafe_pwa_installed', 'true');
      this.deferredPrompt = null;
      this.showBanner = false;
    });
  }

  ngOnDestroy() {
    if (this.beforeInstallPromptListener) {
      this.beforeInstallPromptListener();
      this.beforeInstallPromptListener = null;
    }
    if (this.appInstalledListener) {
      this.appInstalledListener();
      this.appInstalledListener = null;
    }
  }

  async onSubmit() {
    console.log('Login submit', this.model);

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.model.email)) {
      const alert = await this.alertController.create({
        header: 'Email inválido',
        message: 'Por favor ingresa un correo electrónico válido',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Validar contraseña: mínimo 8 caracteres, al menos 1 número, 1 letra y 1 carácter especial
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    console.log('Password validation:', passwordRegex.test(this.model.password));
    if (!passwordRegex.test(this.model.password)) {
      const alert = await this.alertController.create({
        header: 'Contraseña inválida',
        message: 'La contraseña debe tener mínimo 8 caracteres, incluyendo al menos una letra, un número y un carácter especial (@$!%*#?&)',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Llamar al servicio de autenticación
    this.authService.login({ email: this.model.email, password: this.model.password }).subscribe({
      next: async (resp) => {
        try {
          localStorage.setItem('walksafe_user_logged_in', 'true');
          localStorage.setItem('walksafe_user_email', resp.user?.email || this.model.email);
          localStorage.setItem('walksafe_token', resp.token?.token || '');
          localStorage.setItem('walksafe_token_type', resp.token?.type || '');
          localStorage.setItem('walksafe_token_expires_at', resp.token?.expires_at || '');
          localStorage.setItem('walksafe_user', JSON.stringify(resp.user || {}));

          const toast = await this.toastController.create({
            message: '✅ Inicio de sesión exitoso',
            duration: 2000,
            position: 'top',
            color: 'success'
          });
          await toast.present();

          const dashboardRoute = this.isMobile ? '/dashboard-mobile' : '/dashboard';
          this.router.navigate([dashboardRoute], { replaceUrl: true });
        } catch (e) {
          console.error('Error handling login response', e);
        }
      },
      error: async (err) => {
        console.error('Login error', err);
        let message = 'Error al iniciar sesión';
        if (err && err.error && err.error.message) {
          message = err.error.message;
        } else if (err && err.message) {
          message = err.message;
        }

        const alert = await this.alertController.create({
          header: 'Error de autenticación',
          message,
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  async onForgot() {
    const email = this.model.email || '';
    
    const alert = await this.alertController.create({
      header: 'Recuperar contraseña',
      message: 'Introduce tu correo electrónico',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'correo@ejemplo.com',
          value: email
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Enviar',
          handler: async (data) => {
            if (data.email) {
              const toast = await this.toastController.create({
                message: `📧 Enlace de recuperación enviado a ${data.email}`,
                duration: 3000,
                position: 'bottom',
                color: 'success'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
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
    if (!isInstalled && this.isMobile){
      await alert.present();
    }
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

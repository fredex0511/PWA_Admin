import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PlatformDetectorService } from '../../../services/platform-detector';
import { AuthService } from 'src/app/services/auth';
import { FirebasePushService } from 'src/app/services/firebase-push.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css', './login.ionic.css'],
})
export class Login implements OnInit, OnDestroy {
  model: { email: string; password: string } = { email: '', password: '' };
  isMobile: boolean = false;
  showBanner: boolean = false;
  private deferredPrompt: any = null;

  // 2FA
  requiresCode: boolean = false;
  verificationCode: string = '';
  currentEmail: string = '';
  private recaptchaLoaded = false;
  private recaptchaLoadingPromise: Promise<void> | null = null;

  private beforeInstallPromptListener: (() => void) | null = null;
  private appInstalledListener: (() => void) | null = null;

  constructor(
    private router: Router,
    private platformDetector: PlatformDetectorService,
    private toastController: ToastController,
    private alertController: AlertController,
    private renderer: Renderer2,
    private authService: AuthService,
    private firebasePushService:FirebasePushService
  ) {}

  ngOnInit() {
    this.isMobile = this.platformDetector.isMobile();

    // Verificar si ya está instalada
    const isInstalled =
      localStorage.getItem('walksafe_pwa_installed') === 'true';
    this.showBanner = !isInstalled;

    this.beforeInstallPromptListener = this.renderer.listen(
      'window',
      'beforeinstallprompt',
      (e: any) => {
        e.preventDefault();
        this.deferredPrompt = e;
        if (!isInstalled) {
          this.showBanner = true;
          setTimeout(() => this.promptPWAInstall(), 500);
        }
      }
    );

    this.appInstalledListener = this.renderer.listen(
      'window',
      'appinstalled',
      () => {
      // PWA installed
        localStorage.setItem('walksafe_pwa_installed', 'true');
        this.deferredPrompt = null;
        this.showBanner = false;
      }
    );
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
    const data = {
      email: this.model.email,
      password: this.model.password,
    };



    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      const alert = await this.alertController.create({
        header: 'Email inválido',
        message: 'Por favor ingresa un correo electrónico válido',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Validar contraseña: mínimo 8 caracteres, al menos 1 número, 1 letra y 1 carácter especial
    // Nota: incluimos el punto en el conjunto final o usamos una versión más flexible.
    // Versión corregida (incluye el punto en el conjunto permitido):
    // const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&.])[A-Za-z\d@$!%*#?&.]{8,}$/;
    // Versión recomendada (acepta cualquier carácter especial excepto espacios):
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;
    if (!passwordRegex.test(data.password)) {
      const alert = await this.alertController.create({
        header: 'Contraseña inválida',
        message:
          'La contraseña debe tener mínimo 8 caracteres, incluyendo al menos una letra, un número y un carácter especial (@$!%*#?&)',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Obtener token de reCAPTCHA v3
    let recaptchaToken = '';
    try {
      recaptchaToken = await this.getRecaptchaToken('login');
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'reCAPTCHA',
        message: 'No se pudo validar el reCAPTCHA. Intenta de nuevo.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Llamar al servicio de autenticación
    this.authService
      .login({ ...data, recaptchaToken })
      .subscribe({
        next: async (resp) => {
          try {
            // Si requiere código de verificación
            if (resp.data?.requiresCode) {
              this.requiresCode = true;
              this.currentEmail = data.email;
              this.verificationCode = '';
              const toast = await this.toastController.create({
                message: `📧 Se envió un código a ${data.email}`,
                duration: 3000,
                position: 'bottom',
                color: 'success',
              });
              await toast.present();
              return;
            }

            this.clearForm();
           
          } catch (e) {
            console.error('Error handling login response', e);
          }
        },
        error: async (err) => {
          let message = 'Error al iniciar sesión';
          if (err.error.msg) {
            message = err.error.msg;
          } 
          const alert = await this.alertController.create({
            header: 'Error de autenticación',
            message,
            buttons: ['OK'],
          });
          await alert.present();
        },
      });
  }

  async verifyLoginCode() {
    if (!this.verificationCode || this.verificationCode.trim().length === 0) {
      const alert = await this.alertController.create({
        header: 'Código requerido',
        message: 'Por favor ingresa el código de verificación',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    let recaptchaToken = '';
    try {
      recaptchaToken = await this.getRecaptchaToken('verify_login_code');
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'reCAPTCHA',
        message: 'No se pudo validar el reCAPTCHA. Intenta de nuevo.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    this.authService.verifyCode({
      email: this.currentEmail,
      code: this.verificationCode,
      recaptchaToken
    }).subscribe({
      next: async (resp) => {
        try {
          this.clearForm();
          this.requiresCode = false;
          this.verificationCode = '';
          
          localStorage.setItem('walksafe_user_logged_in', 'true');
          localStorage.setItem(
            'walksafe_user_email',
            resp.data!.user?.email || this.currentEmail
          );
          localStorage.setItem('walksafe_token', resp.data!.token?.token || '');
          localStorage.setItem('walksafe_token_type', resp.data!.token?.type || '');
          localStorage.setItem(
            'walksafe_token_expires_at',
            resp.data!.token?.expires_at || ''
          );
          localStorage.setItem(
            'walksafe_user',
            JSON.stringify(resp.data!.user || {})
          );
          
          if (
            (resp.data!.user.role_id === 2 || resp.data!.user.role_id === 1) &&
            !this.isMobile
          ) {
             this.router.navigate(['/dashboard'], { replaceUrl: true });
          } else if (
            resp.data!.user.role_id !== 1 &&
            resp.data!.user.role_id !== 2 &&
            this.isMobile
          ) {
            const tfcm = localStorage.getItem('fcm_token') || ''
            this.firebasePushService.sendTokenToBackend(tfcm)
            this.router.navigate(['/dashboard-mobile'], { replaceUrl: true });
          } else {
            const alert = await this.alertController.create({
              header: 'Error de autenticación',
              message: 'Error de autenticación',
              buttons: ['OK'],
            });
            await alert.present();
          }
        } catch (e) {
          console.error('Error handling verification response', e);
        }
      },
      error: async (err) => {
        let message = 'Código inválido';
        if (err.error?.msg) {
          message = err.error.msg;
        }
        const alert = await this.alertController.create({
          header: 'Error de verificación',
          message,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  cancelVerification() {
    this.requiresCode = false;
    this.verificationCode = '';
    this.currentEmail = '';
    this.model = { email: '', password: '' };
  }

  private async loadRecaptchaScript(): Promise<void> {
    if (this.recaptchaLoaded) return;
    if (this.recaptchaLoadingPromise) return this.recaptchaLoadingPromise;

    this.recaptchaLoadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${environment.recaptchaSiteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.recaptchaLoaded = true;
        resolve();
      };
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });

    return this.recaptchaLoadingPromise;
  }

  private async getRecaptchaToken(action: string): Promise<string> {
    await this.loadRecaptchaScript();
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha || !environment.recaptchaSiteKey) {
      throw new Error('reCAPTCHA no disponible');
    }
    return grecaptcha.execute(environment.recaptchaSiteKey, { action });
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
          value: email,
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Enviar',
          handler: async (data) => {
            if (data.email) {
              const toast = await this.toastController.create({
                message: `📧 Enlace de recuperación enviado a ${data.email}`,
                duration: 3000,
                position: 'bottom',
                color: 'success',
              });
              await toast.present();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  goToRegister() {
    this.router
      .navigate(['/register'], { replaceUrl: true })
      .catch((/* err */) => {
        // Navigation failed (ignored)
      });
  }

  async openAppStore() {
    await this.installPWA();
  }

  private async installPWA() {
    if (!this.deferredPrompt) {
      await this.showPWANotAvailableMessage();
      return;
    }

    // Mostrar el prompt de instalación nativo
    this.deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await this.deferredPrompt.userChoice;

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
    await new Promise((res) => setTimeout(res, 250));

    const alert = await this.alertController.create({
      header: 'Instala WalkSafe',
      message:
        '¿Deseas instalar WalkSafe en tu dispositivo para acceso rápido y una mejor experiencia?',
      buttons: [
        {
          text: 'Instalar',
          handler: () => this.installPWA(),
        },
        {
          text: 'Más tarde',
          role: 'cancel',
        },
      ],
    });
    if (!isInstalled && this.isMobile) {
      await alert.present();
    }
  }

  private async showPWANotAvailableMessage() {
    let message = 'La instalación de PWA no está disponible en este momento.';

    if (this.platformDetector.isIOS()) {
      message =
        'En iOS, presiona el botón "Compartir" y selecciona "Añadir a pantalla de inicio" para instalar WalkSafe.';
    }

    const alert = await this.alertController.create({
      header: 'Instalar WalkSafe',
      message,
      buttons: ['OK'],
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
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  private clearForm(){
    this.model = { email: '', password: '' };
  }
}

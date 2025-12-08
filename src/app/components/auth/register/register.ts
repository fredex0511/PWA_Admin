import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth';
import { PlatformDetectorService } from '../../../services/platform-detector';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-register',
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  model: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  } = { name: '', email: '', password: '', confirmPassword: '' };
  isMobile: boolean = false;

  // 2FA
  requiresCode: boolean = false;
  verificationCode: string = '';
  currentEmail: string = '';
  private recaptchaLoaded = false;
  private recaptchaLoadingPromise: Promise<void> | null = null;

  // UX state
  isSubmitting = false;
  isVerifying = false;

  constructor(
    private router: Router,
    private platformDetector: PlatformDetectorService,
    private toastController: ToastController,
    private alertController: AlertController,
    private renderer: Renderer2,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadRecaptchaScript()
    this.isMobile = this.platformDetector.isMobile();
    // isMobile determined
  }

  async onSubmit() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.isMobile = this.platformDetector.isMobile();
    if (!this.model.name || !this.model.email || !this.model.password) {
      await this.presentAlert('Por favor completa todos los campos.');
      this.isSubmitting = false;
      return;
    }

    if (this.model.password !== this.model.confirmPassword) {
      await this.presentAlert('Las contraseñas no coinciden.');
      this.isSubmitting = false;
      return;
    }
    const data = {
      name: this.model.name,
      email: this.model.email,
      password: this.model.password,
      password_confirmation: this.model.confirmPassword,
    };
    // Obtener token de reCAPTCHA v3
    let recaptchaToken = '';
    try {
      recaptchaToken = await this.getRecaptchaToken('register');
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'reCAPTCHA',
        message: 'No se pudo validar el reCAPTCHA. Intenta de nuevo.',
        buttons: ['OK'],
      });
      await alert.present();
      this.isSubmitting = false;
      return;
    }

    // Llamar al servicio de registro
    this.authService.register({ ...data, recaptchaToken }).subscribe({
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
            this.isSubmitting = false;
            return;
          }

          this.clearForm();
          this.isSubmitting = false;
        } catch (e) {
          // Error handling omitted from logs
          this.isSubmitting = false;
        }
      },
      error: async (err) => {
        let message = 'Error al registar usuario';
        console.log(err)
        if (err.status === 422) {
          const errors = err.error?.msg?.errors;

          if (Array.isArray(errors)) {
            const emailError = errors.find((e: any) => e.field === 'email' && e.rule === 'unique');
            if (emailError) {
              message = 'correo electronico en uso';
            }

          }
        }

        // Si el msg viene como string (caso login fallido 401)
        if (typeof err.error?.msg === 'string') {
          message = err.error.msg;
        }

        const alert = await this.alertController.create({
          header: 'Error',
          message,
          buttons: ['OK'],
        });

        await alert.present();
        this.isSubmitting = false;
      },
    });
  }

  async presentAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Registro',
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  goToLogin() {
    this.router.navigate(['/'], { replaceUrl: true }).catch((/* err */) => {
      // Navigation failure ignored
    });
  }

  async verifyRegisterCode() {
    if (this.isVerifying) return;
    this.isVerifying = true;
    if (!this.verificationCode || this.verificationCode.trim().length === 0) {
      const alert = await this.alertController.create({
        header: 'Código requerido',
        message: 'Por favor ingresa el código de verificación',
        buttons: ['OK'],
      });
      await alert.present();
      this.isVerifying = false;
      return;
    }

    let recaptchaToken = '';
    try {
      recaptchaToken = await this.getRecaptchaToken('verify_register_code');
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'reCAPTCHA',
        message: 'No se pudo validar el reCAPTCHA. Intenta de nuevo.',
        buttons: ['OK'],
      });
      await alert.present();
      this.isVerifying = false;
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
          this.isVerifying = false;
          
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
          
          if (this.isMobile && resp.data!.user?.role_id === 3) {
            const toast = await this.toastController.create({
              message: 'Para mejor experiencia instala la app de WalkSafe',
              duration: 4000,
              position: 'bottom',
              color: 'primary',
            });
            await toast.present();
            this.router.navigate(['/dashboard-mobile'], { replaceUrl: true });
          } else {
            const toastError = await this.toastController.create({
              message: 'Ingresa desde el movil a la app de WalkSafe',
              duration: 2000,
              position: 'top',
              color: 'danger',
            });
            toastError.present();
          }
        } catch (e) {
          console.error('Error handling verification response', e);
          this.isVerifying = false;
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
        this.isVerifying = false;
      },
    });
  }

  cancelVerification() {
    this.requiresCode = false;
    this.verificationCode = '';
    this.currentEmail = '';
    this.model = { name: '', email: '', password: '', confirmPassword: '' };
  }

  private clearForm() {
    this.model = { name: '', email: '', password: '', confirmPassword: '' };
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
}

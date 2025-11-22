import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PlatformDetectorService } from '../../../services/platform-detector';

@Component({
  selector: 'app-login',
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  model: { email: string; password: string } = { email: '', password: '' };
  isMobileWeb: boolean = false;

  constructor(
    private router: Router,
    private platformDetector: PlatformDetectorService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.isMobileWeb = this.platformDetector.isMobile();
    console.log('Is mobile:', this.isMobileWeb);
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

  openAppStore() {
    console.log('openAppStore called');
    // Download APK directly for Android
    if (this.platformDetector.isAndroid()) {
      this.downloadAPK();
    } else if (this.platformDetector.isIOS()) {
      // For iOS, redirect to App Store (iOS requires native app distribution)
      window.open('https://apps.apple.com/app/walksafe/id123456789', '_blank');
    } else {
      // Fallback for desktop browsers
      this.downloadAPK();
    }
  }

  private downloadAPK() {
    const link = document.createElement('a');
    link.href = '/downloads/walksafe.apk'; // APK must be in public/downloads/ folder
    link.download = 'walksafe.apk';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('APK download started');
    this.showDownloadToast();
  }

  private async showDownloadToast() {
    const toast = await this.toastController.create({
      message: '⬇️ Descargando WalkSafe APK...',
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

import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  model: { name: string; email: string; password: string; confirmPassword: string } = { name: '', email: '', password: '', confirmPassword: '' };

  constructor(private router: Router, private alertController: AlertController) {}

  async onSubmit() {
    if (!this.model.name || !this.model.email || !this.model.password) {
      await this.presentAlert('Por favor completa todos los campos.');
      return;
    }

    if (this.model.password !== this.model.confirmPassword) {
      await this.presentAlert('Las contraseñas no coinciden.');
      return;
    }

    console.log('Register submit', this.model);
    await this.presentAlert(`Cuenta creada para ${this.model.email} (simulado)`);
    // After registration succeed, navigate to login or dashboard
    this.goToLogin();
  }

  async presentAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Registro',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goToLogin() {
    console.log('goToLogin called');
    this.router.navigate(['/'], { replaceUrl: true }).catch(err => console.error('Navigation failed:', err));
  }
}

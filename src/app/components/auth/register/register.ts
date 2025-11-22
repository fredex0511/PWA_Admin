import { Component } from '@angular/core';
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

  constructor(private router: Router) {}

  onSubmit() {
    if (!this.model.name || !this.model.email || !this.model.password) {
      window.alert('Por favor completa todos los campos.');
      return;
    }

    if (this.model.password !== this.model.confirmPassword) {
      window.alert('Las contraseñas no coinciden.');
      return;
    }

    console.log('Register submit', this.model);
    window.alert(`Cuenta creada para ${this.model.email} (simulado)`);
    // After registration succeed, navigate to login or dashboard
    this.goToLogin();
  }

  goToLogin() {
    console.log('goToLogin called');
    this.router.navigate(['/'], { replaceUrl: true }).catch(err => console.error('Navigation failed:', err));
  }
}

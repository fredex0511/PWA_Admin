import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  model: { email: string; password: string } = { email: '', password: '' };

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
}

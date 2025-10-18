import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [IonicModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  model: { email: string; password: string } = { email: '', password: '' };

  onSubmit() {
    // Basic client-side validation already enforced by template-driven form
    console.log('Login submit', this.model);
    // TODO: wire to auth service. For now show a simple feedback.
    window.alert(`Intentando iniciar sesión con ${this.model.email}`);
  }

  onForgot() {
    // Simple flow: prompt for email and simulate sending reset
    const email = this.model.email || prompt('Introduce tu correo para recuperar contraseña:');
    if (email) {
      // In a real app you'd call the auth service to send reset link
      window.alert(`Se ha enviado un enlace de recuperación a ${email}`);
    }
  }
}

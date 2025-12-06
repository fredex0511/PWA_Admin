import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-monitor-modal',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './add-monitor-modal.component.html',
  styleUrl: './add-monitor-modal.component.css'
})
export class AddMonitorModalComponent implements OnInit {
  monitorForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController
  ) {
    this.monitorForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  async save(): Promise<void> {
    if (this.monitorForm.valid) {
      const formData = this.monitorForm.value;
      await this.modalController.dismiss({
        data: formData
      });
    }
  }

  async cancel(): Promise<void> {
    await this.modalController.dismiss();
  }

  get nameError(): string {
    const nameControl = this.monitorForm.get('name');
    if (nameControl?.hasError('required')) {
      return 'El nombre es requerido';
    }
    if (nameControl?.hasError('minlength')) {
      return 'El nombre debe tener al menos 3 caracteres';
    }
    return '';
  }

  get emailError(): string {
    const emailControl = this.monitorForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'El email es requerido';
    }
    if (emailControl?.hasError('email')) {
      return 'El email no es válido';
    }
    return '';
  }

  get passwordError(): string {
    const passwordControl = this.monitorForm.get('password');
    if (passwordControl?.hasError('required')) {
      return 'La contraseña es requerida';
    }
    if (passwordControl?.hasError('minlength')) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return '';
  }
}

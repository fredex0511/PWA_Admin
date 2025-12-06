import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule, NgIf } from '@angular/common';
import { User } from 'src/app/interfaces/user';

@Component({
  selector: 'app-edit-monitor-modal',
  standalone: true,
  imports: [IonicModule, CommonModule, NgIf, ReactiveFormsModule],
  templateUrl: './edit-monitor-modal.component.html',
  styleUrl: './edit-monitor-modal.component.css'
})
export class EditMonitorModalComponent implements OnInit {
  @Input() monitor!: User;
  monitorForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController
  ) {
    this.monitorForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      status: [true],
      deleted: [false]
    });
  }

  ngOnInit(): void {
    if (this.monitor) {
      this.monitorForm.patchValue({
        name: this.monitor.name,
        email: this.monitor.email,
        status: Boolean(this.monitor.status),
        deleted: Boolean(this.monitor.deleted_at)
      });
    }
  }

  async save(): Promise<void> {
    if (this.monitorForm.valid) {
      const formData = {
        ...this.monitorForm.value,
        id: this.monitor.id
      };
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

  toggleStatus(): void {
    const statusControl = this.monitorForm.get('status');
    if (statusControl) {
      statusControl.setValue(!statusControl.value);
    }
  }

  toggleDeleted(): void {
    const deletedControl = this.monitorForm.get('deleted');
    if (deletedControl) {
      deletedControl.setValue(!deletedControl.value);
    }
  }

  getStatusLabel(): string {
    const status = this.monitorForm.get('status')?.value;
    return status ? 'Activo' : 'Inactivo';
  }

  getStatusColor(): string {
    const status = this.monitorForm.get('status')?.value;
    return status ? 'success' : 'medium';
  }

  getDeletedLabel(): string {
    const deleted = this.monitorForm.get('deleted')?.value;
    return deleted ? 'Marcado como eliminado' : 'Activo';
  }

  formatDeletedDate(date?: string | null): string {
    if (!date) return 'No eliminado';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

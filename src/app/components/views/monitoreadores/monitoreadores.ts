import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/users';
import { User } from 'src/app/interfaces/user';
import { AddMonitorModalComponent } from './monitor-form/add-monitor-modal.component';
import { EditMonitorModalComponent } from './monitor-form-edit/edit-monitor-modal.component';

@Component({
  selector: 'app-monitoreadores',
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './monitoreadores.html',
  styleUrl: './monitoreadores.css'
})


export class Monitoreadores implements OnInit{
  constructor(
    private userService: UserService,
    private alertController: AlertController,
    private modalController: ModalController,
    private formBuilder: FormBuilder
  ) {}
  roles = ['Administrador', 'Monitoreador' , 'Usuario']

  monitoreadores: User[] = []
  monitorForm: FormGroup = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    this.initializeForm();
    this.getUsers();
  }

  private initializeForm(): void {
    this.monitorForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private async getUsers() {
    this.userService.getUsers('Monitoreador').subscribe({
      next: async (resp) => {
        if (resp.data) {
          console.log(resp)
          this.monitoreadores = resp.data
        } else {
          this.monitoreadores = []
        }
      },
      error: async (err) => {
        console.error('Error loading monitoreadores:', err);
      }
    })
  }

  getStatusLabel(status: number | boolean): string {
    return status === 1 || status === true ? 'Activo' : 'Inactivo';
  }

  getStatusColor(status: number | boolean): string {
    return status === 1 || status === true ? 'success' : 'medium';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }



  async openAddMonitorModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddMonitorModalComponent,
      backdropDismiss: false,
      cssClass: 'monitor-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      this.createMonitor(data.data);
    }
  }

  private async createMonitor(data: any): Promise<void> {
    const newMonitor = {
      name: data.name,
      email: data.email,
      password: data.password,
      password_con: data.password,
      role: 'Monitoreador',
      active: true
    };

    this.userService.createUser(newMonitor).subscribe({
      next: (resp) => {
        this.showSuccessAlert('Monitoreador creado exitosamente');
        this.getUsers();
      },
      error: (err) => {
        console.error('Error creando monitoreador:', err);
        this.showErrorAlert('Error al crear el monitoreador');
      }
    });
  }

  private async showSuccessAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showErrorAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async editMonitor(monitor: User) {
    const modal = await this.modalController.create({
      component: EditMonitorModalComponent,
      backdropDismiss: false,
      cssClass: 'monitor-modal',
      componentProps: {
        monitor: monitor
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      this.updateMonitor(data.data);
    }
  }

  private async updateMonitor(data: any): Promise<void> {
    const updateData = {
      name: data.name,
      email: data.email,
      status: data.status ? 1 : 0
    };

    this.userService.updateUser(data.id, updateData).subscribe({
      next: (resp) => {
        this.showSuccessAlert('Monitoreador actualizado exitosamente');
        this.getUsers();
      },
      error: (err) => {
        console.error('Error actualizando monitoreador:', err);
        this.showErrorAlert('Error al actualizar el monitoreador');
      }
    });
  }

  async deleteMonitor(monitor: User) {
    const alert = await this.alertController.create({
      header: 'Eliminar Monitoreador',
      message: `¿Está seguro de que desea eliminar a ${monitor.name}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.userService.deleteUser(String(monitor.id)).subscribe({
              next: (resp) => {
                this.showSuccessAlert('Monitoreador eliminado exitosamente');
                this.getUsers();
              },
              error: (err) => {
                console.error('Error eliminando monitoreador:', err);
                this.showErrorAlert('Error al eliminar el monitoreador');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
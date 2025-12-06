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
  selectedRole: string = 'Monitoreador'
  includeDeleted: boolean = false
  searchTerm: string = ''

  monitoreadores: User[] = []
  filteredMonitoreadores: User[] = []
  monitorForm: FormGroup = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadUsersByRole(this.selectedRole);
  }

  private initializeForm(): void {
    this.monitorForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  loadUsersByRole(role: string): void {
    this.selectedRole = role;
    this.searchTerm = '';
    
    this.userService.getUsers(role, this.includeDeleted).subscribe({
      next: async (resp) => {
        if (resp.data) {
          console.log(resp)
          this.monitoreadores = resp.data;
          this.filteredMonitoreadores = resp.data;
        } else {
          this.monitoreadores = [];
          this.filteredMonitoreadores = [];
        }
      },
      error: async (err) => {
        console.error('Error loading usuarios:', err);
      }
    })
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.detail.value.toLowerCase();
    this.filterUsers();
  }

  filterUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredMonitoreadores = this.monitoreadores;
      return;
    }

    this.filteredMonitoreadores = this.monitoreadores.filter(user => {
      const nameMatch = user.name.toLowerCase().includes(this.searchTerm);
      const emailMatch = user.email.toLowerCase().includes(this.searchTerm);
      return nameMatch || emailMatch;
    });
  }

  onRoleChange(event: any): void {
    const role = event.detail.value;
    if (role) {
      this.loadUsersByRole(role);
    }
  }

  onDeletedToggle(event: any): void {
    this.includeDeleted = event.detail.checked;
    this.loadUsersByRole(this.selectedRole);
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
      role: this.selectedRole,
      active: true
    };

    this.userService.createUser(newMonitor).subscribe({
      next: (resp) => {
        this.showSuccessAlert('Usuario creado exitosamente');
        this.loadUsersByRole(this.selectedRole);
      },
      error: (err) => {
        console.error('Error creando usuario:', err);
        this.showErrorAlert('Error al crear el usuario');
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
      status: data.status ? 1 : 0,
      deleted: data.deleted ?? false
    };

    this.userService.updateUser(data.id, updateData).subscribe({
      next: (resp) => {
        this.showSuccessAlert('Usuario actualizado exitosamente');
        this.loadUsersByRole(this.selectedRole);
      },
      error: (err) => {
        console.error('Error actualizando usuario:', err);
        this.showErrorAlert('Error al actualizar el usuario');
      }
    });
  }

  async deleteMonitor(monitor: User) {
    const alert = await this.alertController.create({
      header: 'Eliminar Usuario',
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
                this.showSuccessAlert('Usuario eliminado exitosamente');
                this.loadUsersByRole(this.selectedRole);
              },
              error: (err) => {
                console.error('Error eliminando usuario:', err);
                this.showErrorAlert('Error al eliminar el usuario');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
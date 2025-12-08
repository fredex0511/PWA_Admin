import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ContactCreate } from 'src/app/interfaces/contact';
import { ContactsFormComponent } from '../contacts-form/contacts-form.component';
import { ContactsFormUpdateComponent } from '../contacts-form-update/contacts-form-update.component';
import { ContactsService } from 'src/app/services/contacts';

@Component({
  selector: 'app-contacts-mobile',
  templateUrl: './contacts-mobile.component.html',
  styleUrls: ['./contacts-mobile.component.css'],
  imports: [CommonModule, IonicModule, FormsModule, ContactsFormComponent, ContactsFormUpdateComponent],
})
export class ContactsMobileComponent  implements OnInit {
  userContacts: any[] = [];
  addingContact = false;
  editingContact = false;
  selectedContact: any = null;
  newContact: ContactCreate = { name: '', direction:'',email:'',phone:''};
  directionSuggestions: any[] = [];
  private autocompleteService: any = null;
  
  isLoadingContacts = false;
  isSavingContact = false;
  isUpdatingContact = false;
  isDeletingContact = false;
  
  constructor(
    private alertController: AlertController, 
    private ngZone: NgZone,
    private contactsService: ContactsService
  ) { }

  ngOnInit() {
    this.loadGoogleMapsSdk()
      .then(() => {
        console.log('Google Maps SDK loaded');
      })
      .catch(err => console.error('Error loading Google Maps SDK', err));
    this.getContacts();
  }

  private loadGoogleMapsSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google && (window as any).google.maps) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyD8RuH6sdDdoFwNygqmE8Osx0Uz9urpNM0&libraries=places';
      script.defer = true;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  onSearchDirection(event: any) {
    const input = event?.target?.value || '';
    if (!this.autocompleteService) {
      const g = (window as any).google;
      if (g && g.maps && g.maps.places) {
        this.autocompleteService = new g.maps.places.AutocompleteService();
      }
    }
    if (this.autocompleteService && input.length > 2) {
      this.autocompleteService.getPlacePredictions({ input }, (predictions: any[], status: any) => {
        this.ngZone.run(() => {
          this.directionSuggestions = predictions || [];
        });
      });
    } else {
      this.directionSuggestions = [];
    }
  }

  onSelectDirection(suggestion: any) {
    this.newContact.direction = suggestion.description;
    this.directionSuggestions = [];
  }

  private async getContacts() {
    this.isLoadingContacts = true;
    this.contactsService.getContacts().subscribe({
      next: async (resp) => {
        this.isLoadingContacts = false;
        this.userContacts = resp.data || [];
        console.log('Contacts loaded:', this.userContacts);
      },
      error: async (err) => {
        this.isLoadingContacts = false;
        let message = 'No se pudieron cargar los contactos';
        if (err.error.msg) {
          message = err.error.msg;
        }
        const alert = await this.alertController.create({
          header: 'Error',
          message,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  saveNewContact() {
    if (!navigator.onLine) {
      this.showOfflineAlert('No puedes crear un contacto sin conexión a internet.');
      return;
    }

    if (!this.newContact.name || !this.newContact.direction) {
      this.presentAlert('Campos incompletos', 'Completa el nombre y dirección del contacto.');
      return;
    }

    this.isSavingContact = true;
    this.contactsService.createContact(this.newContact).subscribe({
      next: async (resp) => {
        this.isSavingContact = false;
        await this.presentAlert('Contacto guardado', 'Se guardó el contacto correctamente.');
        this.getContacts();
        this.newContact = { name: '', direction:'',email:'',phone:''};
        this.addingContact = false;
      },
      error: async (err) => {
        this.isSavingContact = false;
        let message = 'No se pudo guardar el contacto';
        if (err.error.msg) {
          message = err.error.msg;
        }
        const alert = await this.alertController.create({
          header: 'Error',
          message,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  editContact(contact: any) {
    this.selectedContact = { ...contact };
    this.editingContact = true;
    this.addingContact = false;
  }

  updateContact(updatedContact: any) {
    // Verificar si hay conexión a internet
    if (!navigator.onLine) {
      this.showOfflineAlert('No puedes actualizar un contacto sin conexión a internet.');
      return;
    }

    if (!updatedContact.name || !updatedContact.direction) {
      this.presentAlert('Campos incompletos', 'Completa el nombre y dirección del contacto.');
      return;
    }

    this.isUpdatingContact = true;
    this.contactsService.updateContact(updatedContact.id, updatedContact).subscribe({
      next: async (resp) => {
        this.isUpdatingContact = false;
        console.log('Contacto actualizado:', resp);
        await this.presentAlert('Contacto actualizado', 'Los cambios se guardaron correctamente.');
        this.getContacts();
        this.editingContact = false;
        this.selectedContact = null;
        this.directionSuggestions = [];
      },
      error: async (err) => {
        this.isUpdatingContact = false;
        let message = 'No se pudo actualizar el contacto';
        if (err.error?.msg) {
          message = err.error.msg;
        }
        const alert = await this.alertController.create({
          header: 'Error',
          message,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  async deleteContact() {
    if (!this.selectedContact) return;
    if (this.isDeletingContact) return;

    // Verificar si hay conexión a internet
    if (!navigator.onLine) {
      this.showOfflineAlert('No puedes eliminar un contacto sin conexión a internet.');
      return;
    }

    const confirmAlert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de eliminar el contacto "${this.selectedContact.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.isDeletingContact = true;
            this.contactsService.deleteContact(this.selectedContact.id).subscribe({
              next: async (resp) => {
                this.isDeletingContact = false;
                console.log('Contacto eliminado:', resp);
                
                // Cerrar el formulario inmediatamente
                this.ngZone.run(() => {
                  this.editingContact = false;
                  this.selectedContact = null;
                  this.directionSuggestions = [];
                });
                
                // Recargar contactos
                this.getContacts();
                
                // Mostrar alerta de éxito
                await this.presentAlert('Contacto eliminado', 'El contacto se eliminó correctamente.');
              },
              error: async (err) => {
                this.isDeletingContact = false;
                let message = 'No se pudo eliminar el contacto';
                if (err.error?.msg) {
                  message = err.error.msg;
                }
                const alert = await this.alertController.create({
                  header: 'Error',
                  message,
                  buttons: ['OK'],
                });
                await alert.present();
              },
            });
          }
        }
      ]
    });

    await confirmAlert.present();
  }

  cancelEditing() {
    this.editingContact = false;
    this.selectedContact = null;
    this.directionSuggestions = [];
  }

  onSearchDirectionUpdate(event: any) {
    this.onSearchDirection(event);
  }

  onSelectDirectionUpdate(suggestion: any) {
    if (this.selectedContact) {
      this.selectedContact.direction = suggestion.description;
      // Forzar actualización en el formulario hijo
      this.selectedContact = { ...this.selectedContact };
    }
    this.directionSuggestions = [];
  }

  private async showOfflineAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Sin conexión',
      message: message + ' Por favor, verifica tu conexión.',
      buttons: ['OK']
    });
    await alert.present();
  }

  private async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

}

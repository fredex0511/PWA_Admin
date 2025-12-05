import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ContactCreate } from 'src/app/interfaces/contact';
import { ContactsFormComponent } from '../contacts-form/contacts-form.component';
import { ContactsService } from 'src/app/services/contacts';

@Component({
  selector: 'app-contacts-mobile',
  templateUrl: './contacts-mobile.component.html',
  styleUrls: ['./contacts-mobile.component.css'],
  imports: [CommonModule, IonicModule, FormsModule, ContactsFormComponent],
})
export class ContactsMobileComponent  implements OnInit {
  userContacts: any[] = [];
  addingContact = false;
  newContact: ContactCreate = { name: '', direction:'',email:'',phone:''};
  directionSuggestions: any[] = [];
  private autocompleteService: any = null;
  
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
    this.contactsService.getContacts().subscribe({
      next: async (resp) => {
        this.userContacts = resp.data || [];
        console.log('Contacts loaded:', this.userContacts);
      },
      error: async (err) => {
        let message = 'Error al cargar contactos';
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
    if (this.newContact.name && this.newContact.direction) {
      this.contactsService.createContact(this.newContact).subscribe({
        next: async (resp) => {
          this.getContacts();
          this.newContact = { name: '', direction:'',email:'',phone:''};
          this.addingContact = false;
        },
        error: async (err) => {
          let message = 'Error al crear contacto';
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
  }



}

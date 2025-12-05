import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, NgZone } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contacts-form-update',
  templateUrl: './contacts-form-update.component.html',
  styleUrls: ['./contacts-form-update.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ContactsFormUpdateComponent implements OnInit, OnChanges {
  @Input() contact: any = { id: 0, name: '', direction: '', email: '', phone: '' };
  @Input() directionSuggestions: any[] = [];
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();
  @Output() searchDirection = new EventEmitter<any>();
  @Output() selectDirection = new EventEmitter<any>();
  @Output() delete = new EventEmitter<void>();

  editedContact: any = {};

  constructor(private ngZone: NgZone) { }

  ngOnInit() {
    // Crear una copia del contacto para editar
    this.editedContact = { ...this.contact };
  }

  ngOnChanges(changes: SimpleChanges) {
    // Si el contacto cambia desde el padre, actualizar la copia local
    if (changes['contact'] && !changes['contact'].firstChange) {
      this.editedContact = { ...this.contact };
    }
  }

  onSearchDirection(event: any) {
    this.searchDirection.emit(event);
  }

  onSelectDirection(suggestion: any) {
    this.selectDirection.emit(suggestion);
  }

  onSave() {
    this.save.emit(this.editedContact);
  }

  onCancel() {
    this.cancel.emit();
  }

  onDelete() {
    this.delete.emit();
  }
}

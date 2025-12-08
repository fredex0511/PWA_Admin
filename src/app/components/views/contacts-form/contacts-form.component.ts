import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Place } from 'src/app/interfaces/place';

@Component({
  selector: 'app-contacts-form',
  templateUrl: './contacts-form.component.html',
  styleUrls: ['./contacts-form.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ContactsFormComponent  implements OnInit {
  @Input() contact: any = { name: '', direction: '', email: '' , phone:'' };
  @Input() directionSuggestions: any[] = [];
  @Input() saving = false;
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();
  @Output() searchDirection = new EventEmitter<any>();
  @Output() selectDirection = new EventEmitter<any>();


  constructor() { }

  ngOnInit() {
  }

}

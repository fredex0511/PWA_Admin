import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-path-form',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './path-form.component.html',
  styleUrls: ['./path-form.component.css']
})
export class PathFormComponent {
  @Input() path: any = { name: '', origin: '', destination: '' };
  @Input() originSuggestions: any[] = [];
  @Input() destinationSuggestions: any[] = [];
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();
  @Output() searchOrigin = new EventEmitter<any>();
  @Output() searchDestination = new EventEmitter<any>();
  @Output() selectOrigin = new EventEmitter<any>();
  @Output() selectDestination = new EventEmitter<any>();
}

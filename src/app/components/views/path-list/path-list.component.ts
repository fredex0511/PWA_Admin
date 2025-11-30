import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-path-list',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './path-list.component.html',
  styleUrls: ['./path-list.component.css']
})
export class PathListComponent {
  @Input() userPaths: any[] = [];
  @Output() startPath = new EventEmitter<any>();
  @Output() editPath = new EventEmitter<any>();
  @Output() addPath = new EventEmitter<void>();
}

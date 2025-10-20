import { Component, EventEmitter, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-sidebar',
  imports: [IonicModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  @Output() sectionChange = new EventEmitter<string>();
  
  activeSection = 'dashboard';

  navigateToSection(section: string) {
    this.activeSection = section;
    this.sectionChange.emit(section);
  }
}

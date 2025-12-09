import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-mobile',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './dashboard-mobile.component.html',
  styleUrls: ['./dashboard-mobile.component.css']
})
export class DashboardMobileComponent {
    constructor(
    private router: Router
  ) {}
  gotoroutes() {
    this.router
      .navigate(['/dashboard-mobile/caminos'], { replaceUrl: true })
      .catch((/* err */) => {
        // Navigation failed (ignored)
      });
  }
   gotohistory() {
    this.router
      .navigate(['/dashboard-mobile/history'], { replaceUrl: true })
      .catch((/* err */) => {
        // Navigation failed (ignored)
      });
  }
  gotocontacs() {
    this.router
      .navigate(['/dashboard-mobile/contacts'], { replaceUrl: true })
      .catch((/* err */) => {
        // Navigation failed (ignored)
      });
  }
}


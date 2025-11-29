import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-mobile',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './dashboard-mobile.component.html',
  styleUrls: ['./dashboard-mobile.component.css']
})
export class DashboardMobileComponent implements OnInit {
  userEmail: string = '';

  menuItems = [
    { title: 'Inicio', icon: 'home-outline', route: '/dashboard' },
    { title: 'Caminos', icon: 'map-outline', route: '/caminos' },
    { title: 'Monitoreadores', icon: 'people-outline', route: '/monitoreadores' },
    { title: 'Incidentes', icon: 'alert-circle-outline', route: '/incidentes' },
    { title: 'Zonas Peligrosas', icon: 'warning-outline', route: '/zonas-peligrosas' }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.userEmail = localStorage.getItem('walksafe_user_email') || 'Usuario';
  }

  logout() {
    localStorage.removeItem('walksafe_user_logged_in');
    localStorage.removeItem('walksafe_user_email');
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}

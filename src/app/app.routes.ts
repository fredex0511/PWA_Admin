import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Register } from './components/auth/register/register';
import { DashboardComponent } from './components/layouts/dashboard/dashboard.component';
import { DashboardMobileComponent } from './components/layouts/dashboard-mobile/dashboard-mobile.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'dashboard-mobile',
    component: DashboardMobileComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      {
        path: '',
        redirectTo: 'caminos',
        pathMatch: 'full',
      },
      {
        path: 'caminos',
        loadComponent: () => import('./components/views/caminos/caminos').then(m => m.Caminos)
      },
      {
        path: 'incidentes',
        loadComponent: () => import('./components/views/incidentes/incidentes').then(m => m.Incidentes)
      },
      {
        path: 'monitoreadores',
        loadComponent: () => import('./components/views/monitoreadores/monitoreadores').then(m => m.Monitoreadores)
      },
      {
        path: 'zonas-peligrosas',
        loadComponent: () => import('./components/views/zonas-peligrosas/zonas-peligrosas').then(m => m.ZonasPeligrosas)
      }
    ]
  }
];
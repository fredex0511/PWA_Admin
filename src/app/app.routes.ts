import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Register } from './components/auth/register/register';
import { DashboardComponent } from './components/layouts/dashboard/dashboard.component';
import { DashboardMobileComponent } from './components/layouts/dashboard-mobile/dashboard-mobile.component';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard-mobile',
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
    component: DashboardMobileComponent,
    canActivate: [roleGuard],
    data: { roles: [3] },
    children: [
      {
        path: '',
        redirectTo: 'contacts',
        pathMatch: 'full',
      },
      {
        path: 'caminos',
        loadComponent: () => import('./components/views/caminos-mobile/caminos-mobile.component').then(m => m.CaminosMobileComponent)
      },
      {
        path: 'history',
        loadComponent: () => import('./components/views/history-mobile/history-mobile.component').then(m => m.HistoryMobileComponent)
      },
      {
        path: 'contacts',
        loadComponent: () => import('./components/views/contacts-mobile/contacts-mobile.component').then(m => m.ContactsMobileComponent)
      },
      // Puedes agregar más rutas móviles aquí (incidentes, monitoreadores, zonas-peligrosas, etc.)
    ]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: { roles: [1, 2] },
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
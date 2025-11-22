import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Dashboard } from './components/layouts/dashboard/dashboard';
import { Register } from './components/auth/register/register';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'dashboard', component: Dashboard },
  { path: 'register', component: Register },
  { path: '**', redirectTo: '' }
];
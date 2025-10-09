import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';

export const routes: Routes = [
  { path: '', component: Login },
  { path: '**', redirectTo: '' }  
];
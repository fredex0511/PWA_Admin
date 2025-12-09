import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PlatformDetectorService } from '../services/platform-detector';
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  
  const router = inject(Router);
  const platformDetectorService = inject(PlatformDetectorService);
  const allowedRoles = route.data?.['roles'] as number[] | undefined;

  const rawUser = localStorage.getItem('walksafe_user');
  if (!rawUser) {
    router.navigate(['/login'], { replaceUrl: true }).catch(() => {});
    return false;
  }

  let roleId: number | null = null;
  try {
    const user = JSON.parse(rawUser);
    roleId = typeof user?.role_id === 'number' ? user.role_id : null;
  } catch {
    roleId = null;
  }

  if (!roleId || !allowedRoles || !allowedRoles.includes(roleId)) {
    router.navigate(['/login'], { replaceUrl: true }).catch(() => {});
    return false;
  }

  // Validar dispositivo según el rol
  const isMobile = platformDetectorService.isMobile();
  
  // Rol 3 = Usuario (Mobile)
  if (roleId === 3 && !isMobile) {
    console.warn('Rol 3 requiere acceso desde dispositivo móvil');
    router.navigate(['/login'], { replaceUrl: true }).catch(() => {});
    return false;
  }

  // Roles 1 y 2 = Administrador y Monitoreador (Desktop)
  if ((roleId === 1 || roleId === 2) && isMobile) {
    console.warn('Roles 1 y 2 requieren acceso desde escritorio');
    router.navigate(['/login'], { replaceUrl: true }).catch(() => {});
    return false;
  }

  return true;
};

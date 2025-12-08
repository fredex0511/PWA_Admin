import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  const router = inject(Router);
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

  return true;
};

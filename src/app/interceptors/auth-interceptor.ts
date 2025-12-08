import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('walksafe_token');

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  const handleRedirect = () => {
    localStorage.clear();
    router.navigate(['/'], { replaceUrl: true }).catch(() => {});
  };

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.status === 301) {
        handleRedirect();
      }
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        handleRedirect();
      }
      return throwError(() => error);
    })
  );
}
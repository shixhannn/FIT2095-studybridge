import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // T1: Exclude login/register errors 
  const isLoginOrRegister =
    req.url === `${environment.apiBaseUrl}/auth/login` ||
    req.url === `${environment.apiBaseUrl}/auth/register`;

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // T1: Clear session when an authenticated request gets HTTP 401
      if (error.status === 401 && req.headers.has('Authorization') && !isLoginOrRegister) {
        auth.clearLocalSession();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    })
  );
};

import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // T2: Redirect logged-out user to login
  if (!auth.getToken()) {
    return router.createUrlTree(['/login'],
      { queryParams: { returnUrl: state.url } });
  }

  // T1 T2: Restore user before allowing access after refresh
  return auth.refreshCurrentUser().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login'],
        { queryParams: { returnUrl: state.url } })
    ))
  );
};

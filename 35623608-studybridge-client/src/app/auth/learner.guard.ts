import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const learnerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // T2: Check learner role after user has been loaded
  if (auth.currentUser()) {
    return auth.currentUser()?.role === 'learner' ? true
      : router.createUrlTree(['/dashboard']);
  }

  // T2: No token means the user is not logged in
  if (!auth.getToken()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // T2: Restore user before checking their role after refresh
  return auth.refreshCurrentUser().pipe(
    map(user => user.role === 'learner' ? true
      : router.createUrlTree(['/dashboard'])
    ),
    catchError(() =>
      of(router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      }))
    )
  );
};

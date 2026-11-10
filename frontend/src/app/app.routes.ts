import { Routes } from '@angular/router';
import { RegisterComponent } from './auth/register.component';
import { LoginComponent } from './auth/login.component';
import { NotFoundComponent } from './not-found/not-found';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './auth/auth.guard';
import { tutorGuard } from './auth/tutor.guard'; 
import { learnerGuard } from './auth/learner.guard'; 
import { TutorSearchForm } from './tutors/tutor-search/tutor-search';
import { TutorDetailComponent } from './tutors/tutor-detail/tutor-detail';
import { MyProfileComponent } from './tutors/my-profile/my-profile';
import { MySlotsComponent } from './slots/my-slots/my-slots';
import { MyBookings } from './bookings/my-bookings/my-bookings';
import { MySessions } from './bookings/my-sessions/my-sessions';

export const routes: Routes = [
  // T2 
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }, 
  // T3
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  // T4
  { path: 'tutors', component: TutorSearchForm, canActivate: [authGuard] },
  { path: 'tutors/:userId', component: TutorDetailComponent, canActivate: [authGuard] },
  // T5
  { path: 'my-profile', component: MyProfileComponent, canActivate: [authGuard, tutorGuard] }, 
  { path: 'my-slots', component: MySlotsComponent, canActivate: [authGuard, tutorGuard] }, 
  // T7
  { path: 'my-bookings', component: MyBookings, canActivate: [authGuard, learnerGuard] },
  { path: 'my-sessions', component: MySessions, canActivate: [authGuard, tutorGuard] },
  
  { path: '**', component: NotFoundComponent }
];
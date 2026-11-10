import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, switchMap, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthUser, RegisterPayload, LoginPayload } from '../models';

const TOKEN_KEY = 'studybridge_token';

// T1: One AuthService owns all authentication staee
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  
  // T1: Store JWT in signal, read from localStorage
  private tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  // T1: Do not log user out automatically
  currentUser = signal<AuthUser | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  getToken(): string | null {
    return this.tokenSignal();
  }

  // T1: Register through POST /auth.register 
  register(payload: RegisterPayload): Observable<unknown> {
    return this.http.post<unknown>(`${environment.apiBaseUrl}/auth/register`, 
      payload);
  }

  // T1: Login through POST /auth/login, save JWT, GET /auth/me
  login(credentials: LoginPayload): Observable<AuthUser> {
    return this.http
      .post<{ token: string }>(`${environment.apiBaseUrl}/auth/login`,
        credentials)
      .pipe(
        tap(({ token }) => this.storeToken(token)),
        switchMap(() => this.refreshCurrentUser())
      );
    }

  // T1: POST /auth/logout then clear local state
  logout(): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/auth/logout`, {})
      .pipe(finalize(() => this.clearLocalSession()));
    }

  // T1: Remove JWT when session end 
  clearLocalSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
    this.currentUser.set(null);
  }


  // T1: Save JWT to localStorage and update token signal 
  private storeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  refreshCurrentUser(): Observable<AuthUser> {
    return this.http
      .get<AuthUser>(`${environment.apiBaseUrl}/auth/me`)
      .pipe(tap((user) => this.currentUser.set(user)));
  }
}
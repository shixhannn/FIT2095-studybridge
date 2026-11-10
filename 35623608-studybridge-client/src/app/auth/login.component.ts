import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginPayload } from '../models';

// T1: Login component with reactive form 
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})

export class LoginComponent {
  private formBuilder = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  returnUrl = input<string>();
  registered = input<string>();

  errorMessage = signal<string | null>(null);

  // Validation 
  loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // T1: Show backend error when login failed (401)
    this.errorMessage.set(null);
    this.auth.login(this.loginForm.getRawValue() as LoginPayload).subscribe({
      // redirect 
      next: () => this.router.navigateByUrl(this.returnUrl() ?? '/'),
      error: (err: HttpErrorResponse) =>
        this.errorMessage.set(
          err.error?.error ?? 'Something went wrong. Please try again.'
        ),
    });
  }
}

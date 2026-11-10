import { Component, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-session-recap',
  imports: [FormsModule],
  templateUrl: './session-recap.html',
  styleUrl: './session-recap.css'
})
export class SessionRecap {
  private http = inject(HttpClient);

  bookingId = input.required<string>();
  notes = signal('');
  recap = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  generate(): void {
    // HD5: Show loading state and clear previous 
    this.loading.set(true);
    this.error.set(null);
    this.recap.set(null);
    // HD5: Send notes to backend 
    this.http.post<{ recap: string }>(
      `${environment.apiBaseUrl}/bookings/${this.bookingId()}/recap`, { 
        notes: this.notes(), 
    })
    .pipe(finalize(() => this.loading.set(false)))
    .subscribe({
      // HD5: Display returned recap text
      next: (res) => this.recap.set(res.recap),
      error: (err) => this.error.set(err.error?.error ?? "Something went wrong"),
    });
  }
}
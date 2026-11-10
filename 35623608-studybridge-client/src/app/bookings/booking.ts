import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// T3 T7: Get booking from backend
export interface Booking {
  _id: string;
  learnerId: string;
  tutorId: string;
  subjectId: string;
  slotId: string;
  agreedRate: number;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  createdDate: string;
}

// T6: Data sent to POST /bookings
export interface BookingPayload {
  slotId: string;
  subjectId: string;
}

// T8: Data sent to POST /bookings/:bookingId/review (A2 T11)
export interface ReviewPayload {
  rating: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);

  // T3, T7: Get bookings for the logged-in user
  // backend handle booking, so no filter needed
  getMine(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${environment.apiBaseUrl}/bookings/mine`);
  }

  // T6: Learner creates a booking (A2 T9)
  createBooking(payload: BookingPayload) {
    return this.http.post(`${environment.apiBaseUrl}/bookings`, payload);
  }

  // T7: Tutor confirm requested booking 
  confirmBooking(bookingId: string): Observable<Booking> {
    return this.http.patch<Booking>(
      `${environment.apiBaseUrl}/bookings/${bookingId}/confirm`, {}
    );
  }

  // T7: Tutor completes confirmed booking
  completeBooking(bookingId: string): Observable<Booking> {
    return this.http.patch<Booking>(
      `${environment.apiBaseUrl}/bookings/${bookingId}/complete`, {}
    );
  }

  // T7: Learner or tutor cancels booking
  cancelBooking(bookingId: string): Observable<Booking> {
    return this.http.patch<Booking>(
      `${environment.apiBaseUrl}/bookings/${bookingId}/cancel`, {}
    );
  }

  // T8: Learner submit review for completed booking
  submitReview(bookingId: string, payload: ReviewPayload) {
    return this.http.post(
      `${environment.apiBaseUrl}/bookings/${bookingId}/review`, payload
    );
  }
}

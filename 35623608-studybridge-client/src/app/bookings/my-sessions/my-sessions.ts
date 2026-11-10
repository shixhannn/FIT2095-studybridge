import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Booking, BookingService } from '../booking';
import { SessionRecap } from '../../session-recap/session-recap';

@Component({
  selector: 'app-my-sessions',
  imports: [DatePipe, SessionRecap],
  templateUrl: './my-sessions.html',
  styleUrl: './my-sessions.css'
})
export class MySessions implements OnInit {
  private bookingService = inject(BookingService);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  currentId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBookings();
  }

  // T7: Load tutor's bookings
  loadBookings(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.bookingService.getMine().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.error ?? 'Could not load sessions.'
        );
        this.loading.set(false);
      }
    });
  }

  // T7: Check if transition is legal for booking status
  canConfirm(booking: Booking): boolean {
    return booking.status === 'requested';
  }

  canComplete(booking: Booking): boolean {
    return booking.status === 'confirmed';
  }

  canCancel(booking: Booking): boolean {
    return booking.status === 'requested' ||
           booking.status === 'confirmed';
  }

  // T7: Confirm requested booking
  confirmBooking(booking: Booking): void {
    if (!this.canConfirm(booking) || this.currentId() !== null) {
      return;
    }
    this.currentId.set(booking._id);
    this.errorMessage.set('');

    this.bookingService.confirmBooking(booking._id).subscribe({
      next: (updatedBooking) => { this.updateBooking(updatedBooking); },
      error: (err: HttpErrorResponse) => { this.errorMessage.set(
        err.error?.error ?? 'Could not confirm booking.' );
        this.currentId.set(null);
      }
    });
  }

  // T7: Complete confirmed booking
  completeBooking(booking: Booking): void {
    if (!this.canComplete(booking) || this.currentId() !== null) {
      return;
    }
    this.currentId.set(booking._id);
    this.errorMessage.set('');

    this.bookingService.completeBooking(booking._id).subscribe({
      next: (completedBooking) => { this.updateBooking(completedBooking); },
      error: (err: HttpErrorResponse) => { this.errorMessage.set(
        err.error?.error ?? 'Could not complete booking.' );
        this.currentId.set(null);
      }
    });
  }

  // T7: Cancel requested/confirmed booking
  cancelBooking(booking: Booking): void {
    if (!this.canCancel(booking) || this.currentId() !== null) {
      return;
    }
    this.currentId.set(booking._id);
    this.errorMessage.set('');

    this.bookingService.cancelBooking(booking._id).subscribe({
      next: (cancelledBooking) => { this.updateBooking(cancelledBooking); },
      error: (err: HttpErrorResponse) => { this.errorMessage.set(
        err.error?.error ?? 'Could not cancel booking.' );
        this.currentId.set(null);
      }
    });
  }

  // T7: Update displayed booking without manual reload
  private updateBooking(updatedBooking: Booking): void {
    this.bookings.update(bookings =>
      bookings.map(booking =>
        booking._id === updatedBooking._id ? updatedBooking : booking
      )
    );
    this.currentId.set(null);
  }
}

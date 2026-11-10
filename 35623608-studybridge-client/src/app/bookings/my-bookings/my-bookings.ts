import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Booking, BookingService } from '../booking';
import { BookingReview } from '../booking-review/booking-review';
import { SubjectService } from '../../subjects/subject';
import { TutorService } from '../../tutors/tutor';

@Component({
  selector: 'app-my-bookings',
  imports: [DatePipe, BookingReview],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css'
})
export class MyBookings implements OnInit {
  private bookingService = inject(BookingService);
  private subjectService = inject(SubjectService);
  private tutorService = inject(TutorService);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  currentId = signal<string | null>(null);

  // Display names without changing booking IDs
  subjectNames = signal<Record<string, string>>({});
  tutorNames = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.loadBookings();
    this.loadSubjectNames(); 
  }

  // T7: Load learner's bookings
  loadBookings(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.bookingService.getMine().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loadTutorNames(bookings); 
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.error ?? 'Could not load bookings.'
        );
        this.loading.set(false);
      }
    });
  }

  // T10 (formatting): Get subject names using existing subject catalogue
  loadSubjectNames(): void {
    this.subjectService.getAll().subscribe({
      next: (subjects) => {
        const names: Record<string, string> = {};
        subjects.forEach(subject => { names[subject._id] = subject.name; });
        this.subjectNames.set(names);
      },
      error: (err) => console.error('Could not load subject names', err)
    });
  }
  // T10 (formatting): Get tutor names for tutors in the booking list
  loadTutorNames(bookings: Booking[]): void {
    bookings.forEach(booking => {
      if (this.tutorNames()[booking.tutorId]) return;
      this.tutorService.getTutor(booking.tutorId).subscribe({
        next: (tutor) => { this.tutorNames.update(names => ({
            ...names, [booking.tutorId]: tutor.fullName
          }));
        },
        error: (err) => console.error('Could not load tutor name', err)
      });
    });
  }

  // T7: Only requested/confirmed bookings can be cancelled
  canCancel(booking: Booking): boolean {
    return booking.status === 'requested' || 
      booking.status === 'confirmed';
  }

  // T7: Cancel booking
  cancelBooking(booking: Booking): void {
    if (!this.canCancel(booking) || this.currentId() !== null) {
      return;
    }

    this.currentId.set(booking._id);
    this.errorMessage.set('');

    this.bookingService.cancelBooking(booking._id).subscribe({
      next: (cancelledBooking) => { this.updateBooking(cancelledBooking);  },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.error ?? 'Could not cancel booking.'
        );
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

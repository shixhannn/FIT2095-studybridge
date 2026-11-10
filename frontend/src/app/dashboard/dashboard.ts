import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { BookingService, Booking } from '../bookings/booking';
import { SlotService, AvailabilitySlot } from '../slots/slot';
import { SubjectService, Subject } from '../subjects/subject';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html', 
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {

  // T3: Use the logged-in user from T1
  private authService = inject(AuthService);
  private bookingService = inject(BookingService);
  private slotService = inject(SlotService);
  private subjectService = inject(SubjectService);

  currentUser = this.authService.currentUser;

  // T3: Store data in signal
  bookings = signal<Booking[]>([]);
  slots = signal<AvailabilitySlot[]>([]);
  subjects = signal<Subject[]>([]);

  // T3: Count bookings by status (requested, confirmed, completed, cancelled)
  requestedCount = computed(() => (this.bookings())
    .filter( booking => booking.status === 'requested' ).length
  );

  confirmedCount = computed(() => (this.bookings())
    .filter( booking => booking.status === 'confirmed' ).length
  );

  completedCount = computed(() => (this.bookings())
    .filter( booking => booking.status === 'completed' ).length
  );

  cancelledCount = computed(() => (this.bookings())
    .filter( booking => booking.status === 'cancelled' ).length
  );

  // T3: Count the tutor's unbooked slots
  openSlotCount = computed(() => (this.slots())
    .filter( slot => !slot.isBooked ).length
  );

  // T3: Count all subjects 
  subjectCount = computed(() => (this.subjects()).length);

  // T3: Store timer so it can be stopped later
  // when component first created, time not started
  private refreshTimer?: ReturnType<typeof setInterval>;
  constructor() {
    // T3: Load data once user authenticated
    effect(() => {
      const user = this.currentUser();
      if (user) { this.loadDashboard(user.role) }
    });
  }

  // T3: Start timer - refresh figures every 30 seconds without reloading page
  ngOnInit(): void { 
    this.refreshTimer = setInterval(() => {
      const user = this.currentUser();
      if (user) { 
        this.loadDashboard(user.role); }
      }, 30000);  // 30 seconds = 30000 milliseconds 
  }

  // T3: Only fetch data for the role 
  private loadDashboard(role: string): void {
    if (role === 'learner' || role === 'tutor') {
      this.bookingService.getMine().subscribe(
        bookings => this.bookings.set(bookings) 
      );
    }

    if (role === 'tutor') {
      this.slotService.getMine().subscribe(
        slots => this.slots.set(slots)
      );
    }

    if (role === 'admin') {
      this.subjectService.getAll().subscribe(
        subjects => this.subjects.set(subjects) 
      );
    }
  }

  // T3: Stop timer - when dashboard component destroyed 
  ngOnDestroy(): void {
    if (this.refreshTimer !== undefined) { 
      clearInterval(this.refreshTimer) 
    }
  }
}

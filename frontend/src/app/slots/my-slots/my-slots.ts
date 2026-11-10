import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { SlotService, AvailabilitySlot, CreateSlotPayload } from '../slot';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-my-slots',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, ConfirmDialogComponent],
  templateUrl: './my-slots.html',
  styleUrl: './my-slots.css'
})
export class MySlotsComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private slotService = inject(SlotService);

  // T5: Store tutor's slots and errors
  slots = signal<AvailabilitySlot[]>([]);
  loading = signal(true);
  profileRequired = signal(false);
  saving = signal(false);
  deleting = signal(false);
  
  listError = signal('');
  createError = signal('');
  deleteError = signal('');

  showConfirm = signal(false);
  selectedSlot = signal<AvailabilitySlot | null>(null);

  // T5: Publish new slot form
  slotForm = this.formBuilder.group({
    date: ['', Validators.required],
    startTime: ['', Validators.required],
    durationMinutes: [ null as number | null, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.loadSlots();
  }

  // T5: GET /slots/mine
  loadSlots(): void {
    this.loading.set(true);
    this.listError.set('');   // clear previous error 

    this.slotService.getMine().subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.listError.set(
          err.error?.error ?? 'Could not load your slots.'
        );
        this.loading.set(false);
      }
    });
  }

  // T5: POST /slots with validation
  onCreate(): void {
    if (this.saving()) {
      return;
    }

    if (this.slotForm.invalid) {
      this.slotForm.markAllAsTouched();
      return;
    }

    this.createError.set('');
    this.profileRequired.set(false);

    // get values from the form
    const formValue = this.slotForm.getRawValue();
    const payload: CreateSlotPayload = {
      date: formValue.date!,
      startTime: formValue.startTime!,
      durationMinutes: formValue.durationMinutes!
    };
    this.saving.set(true);

    this.slotService.createSlot(payload).subscribe({
      next: () => {
        // T5: Refresh list after creating
        this.slotForm.reset();
        this.saving.set(false);
        this.loadSlots();
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.error ?? 'Could not create slot.';
        this.createError.set(message);
        
        // T5: Check if no tutor profile 
        const needsProfile = err.status === 409 &&
          message.toLowerCase().includes('profile');
        this.profileRequired.set(needsProfile);
        this.saving.set(false);
      }
    });
  }

  // T5: Open confirmation before deleting
  requestDelete(slot: AvailabilitySlot): void {
    if (slot.isBooked || this.deleting()) {
      return;
    }
    this.selectedSlot.set(slot);
    this.showConfirm.set(true);
  }

  // T5: Delete after confirmation
  onConfirmed(): void {
    const slot = this.selectedSlot();
    if (!slot || slot.isBooked || this.deleting()) {
      return;
    }
    this.showConfirm.set(false);
    this.deleting.set(true);
    this.deleteError.set('');

    this.slotService.deleteSlot(slot._id).subscribe({
      next: () => {
        // T5: Remove deleted slot from list
        this.slots.update(slots => slots.filter(s => s._id !== slot._id));
        this.selectedSlot.set(null);
        this.deleting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.deleteError.set(
          err.error?.error ?? 'Could not delete the slot.'
        );
        this.selectedSlot.set(null);
        this.deleting.set(false);
      }
    });
  }
}

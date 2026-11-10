import { Component, ElementRef, effect, input, model, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html', 
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialogComponent {
  open = model.required<boolean>();
  title = input('Are you sure?');
  message = input('This action cannot be undone.');
  confirmLabel = input('Confirm');

  // T5: Tell parent when user confirms deletion
  confirmed = output<void>();
  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');

  constructor() {
    effect(() => {
      const el = this.dialogEl().nativeElement;
      if (this.open()) {
        if (!el.open) {
          el.showModal();
        }
      } else if (el.open) {
        el.close();
      }
    });
  }

  // T5: Cancel without deleting anything
  cancel(): void {
    this.open.set(false);
  }

  // T5: Confirm and notify parent to delete
  confirm(): void {
    this.open.set(false);
    this.confirmed.emit();
  }
}
import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

// T10: Paylod used by backend events 
export interface SlotEvent {
  slotId: string;
  tutorId: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly socket: Socket = io('http://localhost:3000');

// T10: Store latest broadcast 
  readonly slotBooked = signal<SlotEvent | null>(null);
  readonly slotFreed = signal<SlotEvent | null>(null);

  constructor() {
    this.socket.on('slot:booked', (event: SlotEvent) => {
      this.slotBooked.set(event);
    });

    this.socket.on('slot:freed', (event: SlotEvent) => {
      this.slotFreed.set(event);
    });
  }
}
import { Directive, ElementRef, output, OnDestroy } from '@angular/core';

export interface HoldCompleteEvent {
  x: number;
  y: number;
}

@Directive({
  selector: '[appHoldToPlace]',
  standalone: true
})
export class HoldToPlaceDirective implements OnDestroy {
  // Emits the container (x, y) coordinates when the 1s hold finishes
  holdComplete = output<HoldCompleteEvent>();

  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private startX = 0;
  private startY = 0;

  constructor(private el: ElementRef<HTMLElement>) {
    this.setupListeners();
  }

  private setupListeners(): void {
    const container = this.el.nativeElement;

    container.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.cancelHold);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return; // Only primary click / touch

    const rect = this.el.nativeElement.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;

    const containerX = e.clientX - rect.left;
    const containerY = e.clientY - rect.top;

    // Start 1-second timer
    this.holdTimer = setTimeout(() => {
      console.log('1-second hold finished inside directive!');
      this.holdComplete.emit({ x: containerX, y: containerY });
      this.holdTimer = null;
    }, 1000);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.holdTimer) return;

    // If dragged more than 8px, user is rotating/panning -> cancel!
    const dist = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
    if (dist > 8) {
      this.cancelHold();
    }
  };

  private onPointerUp = (): void => {
    this.cancelHold();
  };

  private cancelHold = (): void => {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  };

  ngOnDestroy(): void {
    this.cancelHold();
    const container = this.el.nativeElement;
    container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.cancelHold);
  }
}

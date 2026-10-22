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
  holdComplete = output<HoldCompleteEvent>();

  private holdDurationMs = 1000;
  private cancelThresholdPx = 8;
  private circumference = 2 * Math.PI * 46; // radius 46

  private startX = 0;
  private startY = 0;
  private containerX = 0;
  private containerY = 0;
  private holdStartTime = 0;
  private animFrameId: number | null = null;
  private isHolding = false;

  // Visual overlay elements
  private ringEl!: SVGSVGElement;
  private fillCircle!: SVGCircleElement;
  private pingEl!: HTMLDivElement;

  private showDelayMs = 250; // Wait 250ms before revealing ring/cursor to avoid drag flicker
  private isRevealed = false;

  constructor(private el: ElementRef<HTMLElement>) {
    this.createDomElements();
    this.setupListeners();
  }

  private createDomElements(): void {
    const container = this.el.nativeElement;

    // Create SVG radial ring
    this.ringEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.ringEl.setAttribute('class', 'hold-ring');
    this.ringEl.setAttribute('viewBox', '0 0 120 120');

    this.ringEl.innerHTML = `
      <circle class="hr-track" cx="60" cy="60" r="46"></circle>
      <circle class="hr-fill" cx="60" cy="60" r="46"></circle>
      <circle class="hr-dot" cx="60" cy="60" r="4"></circle>
    `;

    this.fillCircle = this.ringEl.querySelector('.hr-fill') as SVGCircleElement;

    // Create ping ripple element
    this.pingEl = document.createElement('div');
    this.pingEl.className = 'hold-ping';

    container.appendChild(this.ringEl);
    container.appendChild(this.pingEl);
  }

  private setupListeners(): void {
    const container = this.el.nativeElement;

    container.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.cancelHold);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return; // Only primary button/touch

    const rect = this.el.nativeElement.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.containerX = e.clientX - rect.left;
    this.containerY = e.clientY - rect.top;

    this.isHolding = true;
    this.isRevealed = false;
    this.holdStartTime = performance.now();

    // Position ring at click point, but keep it hidden until showDelayMs passes
    this.ringEl.style.left = `${this.containerX}px`;
    this.ringEl.style.top = `${this.containerY}px`;
    this.ringEl.classList.remove('completed', 'visible');

    // Reset fill
    this.fillCircle.style.strokeDashoffset = `${this.circumference}`;

    this.tick();
  };

  private tick = (): void => {
    if (!this.isHolding) return;

    const elapsed = performance.now() - this.holdStartTime;
    const progress = Math.min(1, elapsed / this.holdDurationMs);

    // Reveal the cursor and ring only after the user has held still for the delay
    if (elapsed >= this.showDelayMs && !this.isRevealed) {
      this.isRevealed = true;
      this.el.nativeElement.classList.add('holding');
      this.ringEl.classList.add('visible');
    }

    // Fill circle clockwise
    const offset = this.circumference * (1 - progress);
    this.fillCircle.style.strokeDashoffset = `${offset}`;

    if (progress >= 1) {
      this.completeHold();
    } else {
      this.animFrameId = requestAnimationFrame(this.tick);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isHolding) return;

    const dist = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
    if (dist > this.cancelThresholdPx) {
      this.cancelHold();
    }
  };

  private onPointerUp = (): void => {
    this.cancelHold();
  };

  private cancelHold = (): void => {
    this.isHolding = false;
    this.isRevealed = false;
    // reset cursor
    this.el.nativeElement.classList.remove('holding');
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.ringEl.classList.remove('visible', 'completed');
  };

  private completeHold(): void {
    this.isHolding = false;
    // reset cursor
    this.el.nativeElement.classList.remove('holding');
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Trigger haptics on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Green pop animation
    this.ringEl.classList.add('completed');

    // Trigger ripple ping
    this.pingEl.style.left = `${this.containerX}px`;
    this.pingEl.style.top = `${this.containerY}px`;
    this.pingEl.classList.remove('animate');
    void this.pingEl.offsetWidth; // Trigger reflow to restart animation
    this.pingEl.classList.add('animate');

    // Hide ring after pop
    setTimeout(() => {
      this.ringEl.classList.remove('visible', 'completed');
    }, 220);

    // Emit event with the click coordinates
    this.holdComplete.emit({ x: this.containerX, y: this.containerY });
  }

  ngOnDestroy(): void {
    this.cancelHold();
    const container = this.el.nativeElement;
    container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.cancelHold);

    this.ringEl?.remove();
    this.pingEl?.remove();
  }
}

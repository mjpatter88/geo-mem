import { Component, signal } from '@angular/core';
import { GlobeComponent } from './components/globe/globe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GlobeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('app');
  lastPin = signal<{ lng: number; lat: number } | null>(null);

  onPinDropped(coords: { lng: number; lat: number }): void {
    this.lastPin.set(coords);
  }
}

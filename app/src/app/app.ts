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
}

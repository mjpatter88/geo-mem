import { Component, inject, output } from '@angular/core';
import { GameMode, GameService } from '../../services/game';

@Component({
  selector: 'app-mode-selector',
  standalone: true,
  templateUrl: './mode-selector.html',
  styleUrl: './mode-selector.scss'
})
export class ModeSelectorComponent {
  protected gameService = inject(GameService);
  modeChanged = output<GameMode>();

  selectMode(newMode: GameMode): void {
    if (this.gameService.mode() === newMode) return;
    this.modeChanged.emit(newMode);
  }
}

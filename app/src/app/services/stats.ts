import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from './auth';
import { GameMode } from './game';
import { EvaluationResult } from './spatial';

export interface AttemptLog {
  itemId: string;
  itemType: GameMode;
  targetName: string;
  targetCoords?: { lng: number; lat: number };
  guessCoords: { lng: number; lat: number };
  distanceKm: number;
  distanceMiles: number;
  score: number;
  isInside: boolean;
  isInRightCountry?: boolean;
  guessedCountry?: string;
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private firestore = inject<Firestore>('FIREBASE_FIRESTORE' as any);
  private authService = inject(AuthService);

  /**
   * Log an attempt to Firestore under users/{uid}/attempts
   */
  async recordAttempt(data: {
    itemId: string;
    mode: GameMode;
    targetName: string;
    targetCoords?: { lng: number; lat: number };
    guessCoords: { lng: number; lat: number };
    evaluation: EvaluationResult;
  }): Promise<void> {
    const user = this.authService.user();
    if (!user) {
      // Guest mode - not signed in, nothing saved to cloud
      console.log('Not signed in, not saving to Firestore');
      return;
    }

    try {
      const attemptsCollection = collection(this.firestore, `users/${user.uid}/attempts`);

      const logData: AttemptLog = {
        itemId: data.itemId,
        itemType: data.mode,
        targetName: data.targetName,
        ...(data.targetCoords ? { targetCoords: data.targetCoords } : {}),
        guessCoords: data.guessCoords,
        distanceKm: data.evaluation.distanceKm,
        distanceMiles: data.evaluation.distanceMiles,
        score: data.evaluation.score,
        isInside: data.evaluation.isInside,
        isInRightCountry: data.evaluation.isInRightCountry ?? false,
        guessedCountry: data.evaluation.guessedCountry ?? '',
        createdAt: serverTimestamp()
      };

      await addDoc(attemptsCollection, logData);
      console.log('Recorded attempt in Firestore for', data.targetName);
    } catch (err) {
      console.error('Failed to log attempt to Firestore:', err);
    }
  }
}

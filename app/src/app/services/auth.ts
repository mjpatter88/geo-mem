import { inject, Injectable, signal } from '@angular/core';
import { Auth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject<Auth>('FIREBASE_AUTH' as any);

  readonly user = signal<User | null>(null);
  readonly isLoading = signal(true);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.isLoading.set(false);
      console.log('Auth state changed:', user?.displayName ?? 'Signed out');
    });
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(this.auth, provider);
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Google sign-out error:', error);
    }
  }
}

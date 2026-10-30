import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { app } from '../environments/environment';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: 'FIREBASE_AUTH', useFactory: () => getAuth(app) },
    { provide: 'FIREBASE_FIRESTORE', useFactory: () => getFirestore(app) },
  ]
};

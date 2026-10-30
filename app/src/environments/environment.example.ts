import { initializeApp } from "firebase/app";

// Copy this file to environment.ts and replace with your Firebase keys
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "G-XXXXXXXXXX"
};

export const app = initializeApp(firebaseConfig);

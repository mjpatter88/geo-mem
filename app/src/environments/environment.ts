// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBYnBKVIzf9ryFbeF19gwvZONzgcm4S5FE",
    authDomain: "geo-mem.firebaseapp.com",
    projectId: "geo-mem",
    storageBucket: "geo-mem.firebasestorage.app",
    messagingSenderId: "1060052530739",
    appId: "1:1060052530739:web:743d603ff39d61bb0b9546",
    measurementId: "G-1ELQFQSYXZ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
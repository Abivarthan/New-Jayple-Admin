import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Placeholder configuration. Values should be supplied via environment variables in production.
const firebaseConfig = {
  apiKey: "AIzaSyADuarw2vDVZo6-zgOqb9n--Z534V3wU4E",
  authDomain: "jayple-app-2026.firebaseapp.com",
  projectId: "jayple-app-2026",
  storageBucket: "jayple-app-2026.firebasestorage.app",
  messagingSenderId: "152751512014",
  appId: "1:152751512014:web:6e626e626e626e626e626e"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

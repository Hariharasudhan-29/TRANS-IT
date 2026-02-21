import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'transport-app-865cd',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export function initFirebase() {
  if (typeof window !== 'undefined' && !firebaseConfig.apiKey) {
    console.warn("Firebase API Key is missing! Check your environment variables.");
  }
  if (!getApps().length) {
    try {
      initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase Initialization Failed:", e);
    }
  }
}

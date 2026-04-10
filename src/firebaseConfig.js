import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  // IMPORTANT: Replace this placeholder with your REAL API Key from the Firebase Console 
  // (Project Settings -> General -> Your apps -> Firebase SDK snippet)
  apiKey: "AIzaSyB6Jrdv5EreERVjwRm25eLlPFxES0JNm0k",
  authDomain: "inkwell-3b69c.firebaseapp.com",
  projectId: "inkwell-3b69c",
  storageBucket: "inkwell-3b69c.firebasestorage.app",
  messagingSenderId: "314399971865",
  appId: "1:314399971865:web:531cf87378ac79af42a888",
  measurementId: "G-XRPHX3XKGN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, auth, db, analytics };

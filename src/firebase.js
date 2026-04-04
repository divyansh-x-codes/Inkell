import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6Jrdv5EreERVjwRm25eLlPFxES0JNm0k",
  authDomain: "inkwell-3b69c.firebaseapp.com",
  projectId: "inkwell-3b69c",
  storageBucket: "inkwell-3b69c.firebasestorage.app",
  messagingSenderId: "314399971865",
  appId: "1:314399971865:web:531cf87378ac79af42a888",
  measurementId: "G-XRPHX3XKGN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;

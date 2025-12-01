import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBP5cq0qE5YMNqKGlw-6YkS8W_ZHngkjIU",
  authDomain: "yumstation-menu-ceb34.firebaseapp.com",
  projectId: "yumstation-menu-ceb34",
  storageBucket: "yumstation-menu-ceb34.firebasestorage.app",
  messagingSenderId: "662207495008",
  appId: "1:662207495008:web:b9bf0d9d1d88a7d177fc05"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
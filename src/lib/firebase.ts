// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, deleteDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyASbwM0HkSjJfZZyISMQHKwqGS0lRbMvBg",
  authDomain: "real-estate-eb358.firebaseapp.com",
  projectId: "real-estate-eb358",
  storageBucket: "real-estate-eb358.firebasestorage.app",
  messagingSenderId: "31101036060",
  appId: "1:31101036060:web:3206304ce0ec5b28bfa1d9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { deleteDoc };

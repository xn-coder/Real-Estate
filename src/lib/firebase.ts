
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, deleteDoc } from "firebase/firestore";

// TODO: Add your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFW27edxQsC5eMPPvqH2bKgd3om-tgqiI",
  authDomain: "estatelink-yqp55.firebaseapp.com",
  projectId: "estatelink-yqp55",
  storageBucket: "estatelink-yqp55.appspot.com",
  messagingSenderId: "372342628141",
  appId: "1:372342628141:web:b963beca8576fbe4197da4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { deleteDoc };

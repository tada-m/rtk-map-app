import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBhyFZVgwSjiIv7J8OjqkK9-YCpoKnTyNs",
  authDomain: "rtk-map-app.firebaseapp.com",
  projectId: "rtk-map-app",
  storageBucket: "rtk-map-app.firebasestorage.app",
  messagingSenderId: "770512095150",
  appId: "1:770512095150:web:897c370a971298b55f2a3f",
  measurementId: "G-Y267HG23R7",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

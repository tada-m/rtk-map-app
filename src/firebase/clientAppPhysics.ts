// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBu4trMNDk_2ZzCq4gfn0hs7nsXGJFnJIw",
  authDomain: "physics-app-e10d2.firebaseapp.com",
  projectId: "physics-app-e10d2",
  storageBucket: "physics-app-e10d2.firebasestorage.app",
  messagingSenderId: "925210606673",
  appId: "1:925210606673:web:efd104fc824d381d484c70",
  measurementId: "G-DLZ2L7ZK3F",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

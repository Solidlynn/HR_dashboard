import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB3B67sWYpSGf8Tyd9vyHBugprspp3ImMc",
  authDomain: "hrdashboard-75faf.firebaseapp.com",
  projectId: "hrdashboard-75faf",
  storageBucket: "hrdashboard-75faf.firebasestorage.app",
  messagingSenderId: "435860246302",
  appId: "1:435860246302:web:d61b7c8aeab178a4c0030f",
  measurementId: "G-6C8371Q8B1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 
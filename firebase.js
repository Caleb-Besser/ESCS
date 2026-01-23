// Import modular SDK from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKWLxkSYAnyf5-eNyifaLNhHGBPr4z1Qw",
  authDomain: "easy-student-checkout-system.firebaseapp.com",
  projectId: "easy-student-checkout-system",
  storageBucket: "easy-student-checkout-system.firebasestorage.app",
  messagingSenderId: "174353211412",
  appId: "1:174353211412:web:54caf4ffd6e879520e0701",
  measurementId: "G-DNDZR8QNL3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

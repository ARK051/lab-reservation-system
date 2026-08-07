import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxHt1xHGO_W1b8Bp2nLCLRngKZCwZWI_g",
  authDomain: "lab-reservation-system-6a962.firebaseapp.com",
  projectId: "lab-reservation-system-6a962",
  storageBucket: "lab-reservation-system-6a962.firebasestorage.app",
  messagingSenderId: "946900296547",
  appId: "1:946900296547:web:e396a52227e99d21c1e956"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
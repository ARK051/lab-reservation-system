import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

// --- Tab switching ---
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
  });
});

// --- Login ---
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'dashboard.html';
  } catch (error) {
    loginError.textContent = 'Invalid email or password.';
    console.error(error);
  }
});

// --- Register ---
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';

  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value; // "student" or "lecturer"

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // This is what the dashboard reads to decide which section to show.
    // Firebase Auth alone has no concept of "role" -- Firestore does.
    await setDoc(doc(db, "users", uid), { name, email, role });

    window.location.href = 'dashboard.html';
  } catch (error) {
    registerError.textContent = error.message.includes('email-already-in-use')
      ? 'This email is already registered.'
      : 'Could not create account. Try a stronger password (6+ characters).';
    console.error(error);
  }
});
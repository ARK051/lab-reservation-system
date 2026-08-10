import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
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
    if (error.code === 'auth/too-many-requests') {
      loginError.textContent = 'Too many failed attempts. Please wait a few minutes before trying again.';
    } else {
      loginError.textContent = 'Invalid email or password.';
    }
    console.error(error);
  }
});

// --- Forgot password ---
const forgotPasswordLink = document.getElementById('forgot-password-link');

forgotPasswordLink.addEventListener('click', async () => {
  loginError.textContent = '';
  let email = document.getElementById('login-email').value.trim();

  if (!email) {
    email = prompt('Enter your account email to receive a password reset link:');
    if (!email) return;
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());
    loginError.style.color = '#1E7E34';
    loginError.textContent = 'Password reset email sent. Check your inbox.';
  } catch (error) {
    loginError.style.color = '';
    loginError.textContent = 'Could not send reset email. Check the address and try again.';
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
  const role = document.getElementById('reg-role').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "users", uid), { name, email, role });

    window.location.href = 'dashboard.html';
  } catch (error) {
    registerError.textContent = error.message.includes('email-already-in-use')
      ? 'This email is already registered.'
      : 'Could not create account. Try a stronger password (6+ characters).';
    console.error(error);
  }
});
import { db } from './firebase-config.js';
import {
  collection, getDocs, query, where, orderBy,
  doc, runTransaction, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const TIME_SLOTS = [
  "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
  "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"
];

const labSelect = document.getElementById('lab-select');
const dateSelect = document.getElementById('date-select');
const slotGrid = document.getElementById('slot-grid');
const reservationForm = document.getElementById('reservation-form');
const selectedSlotInput = document.getElementById('selected-slot');
const purposeInput = document.getElementById('purpose');
const bookingError = document.getElementById('booking-error');
const myReservationsContainer = document.getElementById('my-reservations');

let currentUid = null;

export function initBooking(uid) {
  currentUid = uid;

  const today = new Date().toISOString().split('T')[0];
  dateSelect.min = today;
  dateSelect.value = today;

  loadLabs();
  loadMyReservations(uid);

  labSelect.addEventListener('change', renderSlots);
  dateSelect.addEventListener('change', renderSlots);
  reservationForm.addEventListener('submit', submitReservation);
}

async function loadLabs() {
  const snapshot = await getDocs(collection(db, "labs"));
  labSelect.innerHTML = '';
  snapshot.forEach(docSnap => {
    const option = document.createElement('option');
    option.value = docSnap.id;
    option.textContent = docSnap.data().name;
    labSelect.appendChild(option);
  });
  renderSlots();
}

async function renderSlots() {
  const labId = labSelect.value;
  const date = dateSelect.value;
  slotGrid.innerHTML = '';
  reservationForm.style.display = 'none';
  if (!labId || !date) return;

  const q = query(
    collection(db, "reservations"),
    where("labId", "==", labId),
    where("date", "==", date)
  );
  const snapshot = await getDocs(q);
  const takenSlots = new Set();
  snapshot.forEach(docSnap => {
    const status = docSnap.data().status;
    if (status === 'approved' || status === 'pending') {
      takenSlots.add(docSnap.data().timeSlot);
    }
  });

  TIME_SLOTS.forEach(slot => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = slot;
    btn.className = 'slot-btn';
    if (takenSlots.has(slot)) {
      btn.classList.add('taken');
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => selectSlot(slot, btn));
    }
    slotGrid.appendChild(btn);
  });
}

function selectSlot(slot, btnEl) {
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  selectedSlotInput.value = slot;
  reservationForm.style.display = 'block';
  bookingError.textContent = '';
}

async function submitReservation(e) {
  e.preventDefault();
  bookingError.textContent = '';

  const labId = labSelect.value;
  const date = dateSelect.value;
  const timeSlot = selectedSlotInput.value;
  const purpose = purposeInput.value.trim();

  if (!labId || !date || !timeSlot || !purpose) {
    bookingError.textContent = 'Please fill in all fields.';
    return;
  }

  const reservationId = `${labId}_${date}_${timeSlot}`;
  const reservationRef = doc(db, "reservations", reservationId);

  try {
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(reservationRef);
      if (existing.exists()) {
        throw new Error('This slot was just booked by someone else. Please choose another.');
      }
      transaction.set(reservationRef, {
        labId,
        userId: currentUid,
        purpose,
        status: 'pending',
        date,
        timeSlot,
        createdAt: serverTimestamp()
      });
    });

    reservationForm.reset();
    reservationForm.style.display = 'none';
    renderSlots();
    loadMyReservations(currentUid);
  } catch (error) {
    bookingError.textContent = error.message;
    console.error(error);
  }
}

function loadMyReservations(uid) {
  const q = query(
    collection(db, "reservations"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    myReservationsContainer.innerHTML = '';
    if (snapshot.empty) {
      myReservationsContainer.innerHTML = '<p class="empty-state">No reservations yet.</p>';
      return;
    }
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const item = document.createElement('div');
      item.className = `list-item status-${data.status}`;
      item.innerHTML = `
        <div>
          <strong>${data.date} · ${data.timeSlot}</strong>
          <p>${data.purpose}</p>
        </div>
        <span class="status-badge">${data.status}</span>
      `;
      myReservationsContainer.appendChild(item);
    });
  });
}
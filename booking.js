import { db } from './firebase-config.js';
import {
  collection, getDocs, query, where, orderBy,
  doc, updateDoc, runTransaction, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const TIME_SLOTS = [
  "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
  "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"
];

const labSelect = document.getElementById('lab-select');
const dateSelect = document.getElementById('date-select');
const filterCheckbox = document.getElementById('filter-available-only');
const slotGrid = document.getElementById('slot-grid');
const reservationForm = document.getElementById('reservation-form');
const selectedSlotInput = document.getElementById('selected-slot');
const purposeInput = document.getElementById('purpose');
const bookingError = document.getElementById('booking-error');
const myReservationsContainer = document.getElementById('my-reservations');
const toggleReservationsBtn = document.getElementById('toggle-reservations-btn');

let currentUid = null;
let labNameCache = {};
let allLabs = [];
let historyVisible = true;

export function initBooking(uid) {
  currentUid = uid;

  const today = new Date().toISOString().split('T')[0];
  dateSelect.min = today;
  dateSelect.value = today;

  loadLabs();
  loadMyReservations(uid);
  buildModal();

  labSelect.addEventListener('change', renderSlots);
  dateSelect.addEventListener('change', populateLabDropdown);
  filterCheckbox.addEventListener('change', populateLabDropdown);
  reservationForm.addEventListener('submit', submitReservation);
  toggleReservationsBtn.addEventListener('click', toggleReservationsView);
}

function toggleReservationsView() {
  historyVisible = !historyVisible;
  myReservationsContainer.style.display = historyVisible ? 'flex' : 'none';
  toggleReservationsBtn.innerHTML = historyVisible
    ? '<i class="fas fa-eye"></i>'
    : '<i class="fas fa-eye-slash"></i>';
}

async function loadLabs() {
  const snapshot = await getDocs(collection(db, "labs"));
  allLabs = [];
  labNameCache = {};
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    labNameCache[docSnap.id] = data.name;
    allLabs.push({ id: docSnap.id, name: data.name });
  });
  await populateLabDropdown();
}

async function getAvailabilityMap(date) {
  const q = query(collection(db, "reservations"), where("date", "==", date));
  const snapshot = await getDocs(q);
  const map = {};
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.status === 'approved' || data.status === 'pending') {
      if (!map[data.labId]) map[data.labId] = new Set();
      map[data.labId].add(data.timeSlot);
    }
  });
  return map;
}

async function populateLabDropdown() {
  const date = dateSelect.value;
  const previousSelection = labSelect.value;
  let labsToShow = allLabs;

  if (filterCheckbox.checked && date) {
    const availabilityMap = await getAvailabilityMap(date);
    labsToShow = allLabs.filter(lab => {
      const taken = availabilityMap[lab.id] || new Set();
      return taken.size < TIME_SLOTS.length;
    });
  }

  labSelect.innerHTML = '';
  if (labsToShow.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No labs with open slots';
    option.disabled = true;
    labSelect.appendChild(option);
  } else {
    labsToShow.forEach(lab => {
      const option = document.createElement('option');
      option.value = lab.id;
      option.textContent = lab.name;
      labSelect.appendChild(option);
    });
    if (labsToShow.some(l => l.id === previousSelection)) {
      labSelect.value = previousSelection;
    }
  }

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
    populateLabDropdown();
  } catch (error) {
    bookingError.textContent = error.message;
    console.error(error);
  }
}

async function cancelReservation(reservationId) {
  if (!confirm('Cancel this reservation?')) return;
  try {
    await updateDoc(doc(db, "reservations", reservationId), { status: 'cancelled' });
  } catch (error) {
    alert('Could not cancel this reservation.');
    console.error(error);
  }
}

function loadMyReservations(uid) {
  const q = query(
    collection(db, "reservations"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    q,
    (snapshot) => {
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
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="status-badge">${data.status}</span>
            <button class="view-btn" title="View details"><i class="fas fa-eye"></i></button>
            ${['pending', 'approved'].includes(data.status) ? '<button class="cancel-btn" title="Cancel"><i class="fas fa-times"></i></button>' : ''}
          </div>
        `;
        item.querySelector('.view-btn').addEventListener('click', () => openModal(data));
        const cancelBtn = item.querySelector('.cancel-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => cancelReservation(docSnap.id));
        }
        myReservationsContainer.appendChild(item);
      });
      myReservationsContainer.style.display = historyVisible ? 'flex' : 'none';
    },
    (error) => {
      console.error('Reservations listener error:', error);
      myReservationsContainer.innerHTML = '<p class="empty-state">Could not load reservations.</p>';
    }
  );
}

// --- Eye button: view details modal ---
function buildModal() {
  if (document.getElementById('reservation-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'reservation-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" id="modal-close-btn">&times;</button>
      <h3>Reservation Details</h3>
      <div id="modal-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
}

function openModal(data) {
  const labName = labNameCache[data.labId] || 'Unknown lab';
  const submitted = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleString()
    : 'Just now';

  document.getElementById('modal-body').innerHTML = `
    <p><strong>Lab:</strong> ${labName}</p>
    <p><strong>Date:</strong> ${data.date}</p>
    <p><strong>Time:</strong> ${data.timeSlot}</p>
    <p><strong>Purpose:</strong> ${data.purpose}</p>
    <p><strong>Status:</strong> <span class="status-badge">${data.status}</span></p>
    <p><strong>Submitted:</strong> ${submitted}</p>
  `;
  document.getElementById('reservation-modal').classList.add('show');
}

function closeModal() {
  document.getElementById('reservation-modal').classList.remove('show');
}
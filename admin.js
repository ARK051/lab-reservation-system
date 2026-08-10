import { db } from './firebase-config.js';
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, where, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const pendingContainer = document.getElementById('pending-requests');
const allReservationsContainer = document.getElementById('all-reservations');
const toggleAllReservationsBtn = document.getElementById('toggle-all-reservations-btn');
const labListContainer = document.getElementById('lab-list');
const addLabForm = document.getElementById('add-lab-form');

let labNameCache = {};
let userInfoCache = {};
let allReservationsVisible = true;
let pendingRejectId = null;

export function initAdmin() {
  loadPendingRequests();
  loadAllReservations();
  loadLabs();
  addLabForm.addEventListener('submit', addLab);
  toggleAllReservationsBtn.addEventListener('click', toggleAllReservationsView);
  buildRejectModal();
}

function toggleAllReservationsView() {
  allReservationsVisible = !allReservationsVisible;
  allReservationsContainer.style.display = allReservationsVisible ? 'flex' : 'none';
  toggleAllReservationsBtn.innerHTML = allReservationsVisible
    ? '<i class="fas fa-eye"></i>'
    : '<i class="fas fa-eye-slash"></i>';
}

async function getLabNameMap() {
  const snapshot = await getDocs(collection(db, "labs"));
  const map = {};
  snapshot.forEach(docSnap => {
    map[docSnap.id] = docSnap.data().name;
  });
  return map;
}

async function getUserInfoMap() {
  const snapshot = await getDocs(collection(db, "users"));
  const map = {};
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    map[docSnap.id] = { name: data.name, role: data.role };
  });
  return map;
}

function bookerLine(userId) {
  const info = userInfoCache[userId];
  if (!info) return 'Unknown user';
  return `${info.name} (${info.role})`;
}

function loadPendingRequests() {
  const q = query(collection(db, "reservations"), where("status", "==", "pending"));

  onSnapshot(q, async (snapshot) => {
    pendingContainer.innerHTML = '';
    if (snapshot.empty) {
      pendingContainer.innerHTML = '<p class="empty-state">No pending requests.</p>';
      return;
    }

    labNameCache = await getLabNameMap();
    userInfoCache = await getUserInfoMap();

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const labName = labNameCache[data.labId] || 'Unknown lab';
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div>
          <strong>${data.date} · ${data.timeSlot} · ${labName}</strong>
          <p>${bookerLine(data.userId)}</p>
          <p>${data.purpose}</p>
          ${data.equipmentDesc ? `<p>Equipment requested: ${data.equipmentDesc}</p>` : ''}
        </div>
        <div class="actions">
          <button class="reject-btn">Reject</button>
          <button class="approve-btn">Approve</button>
        </div>
      `;
      item.querySelector('.approve-btn').addEventListener('click', () =>
        updateStatus(docSnap.id, 'approved')
      );
      item.querySelector('.reject-btn').addEventListener('click', () =>
        openRejectModal(docSnap.id)
      );
      pendingContainer.appendChild(item);
    });
  });
}

async function updateStatus(reservationId, newStatus, extraFields = {}) {
  try {
    await updateDoc(doc(db, "reservations", reservationId), { status: newStatus, ...extraFields });
  } catch (error) {
    alert('Could not update this request. Try again.');
    console.error(error);
  }
}

function buildRejectModal() {
  if (document.getElementById('reject-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'reject-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" id="reject-modal-close-btn">&times;</button>
      <h3>Reject Reservation</h3>
      <p style="margin-bottom:10px;">Let the requester know why this is being rejected (optional, but helpful).</p>
      <textarea id="reject-reason-input" class="reject-reason-textarea" placeholder="e.g. Lab already reserved for maintenance that day"></textarea>
      <button id="confirm-reject-btn" class="primary-btn" style="margin-top:12px; background:#C62828;">
        <i class="fas fa-times"></i> Confirm Reject
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeRejectModal();
  });
  document.getElementById('reject-modal-close-btn').addEventListener('click', closeRejectModal);
  document.getElementById('confirm-reject-btn').addEventListener('click', submitRejection);
}

function openRejectModal(reservationId) {
  pendingRejectId = reservationId;
  document.getElementById('reject-reason-input').value = '';
  document.getElementById('reject-modal').classList.add('show');
}

function closeRejectModal() {
  document.getElementById('reject-modal').classList.remove('show');
  pendingRejectId = null;
}

async function submitRejection() {
  if (!pendingRejectId) return;
  const reason = document.getElementById('reject-reason-input').value.trim();
  await updateStatus(pendingRejectId, 'rejected', { rejectionReason: reason });
  closeRejectModal();
}

async function hideFromAdminView(reservationId) {
  if (!confirm("Remove this from the admin view? This only hides it here, the record stays in the system and is unaffected for the student/lecturer.")) return;
  try {
    await updateDoc(doc(db, "reservations", reservationId), { hiddenForAdmin: true });
  } catch (error) {
    alert('Could not remove this from view.');
    console.error(error);
  }
}

function loadAllReservations() {
  onSnapshot(collection(db, "reservations"), async (snapshot) => {
    allReservationsContainer.innerHTML = '';
    const visibleDocs = snapshot.docs.filter(d => d.data().hiddenForAdmin !== true);

    if (visibleDocs.length === 0) {
      allReservationsContainer.innerHTML = '<p class="empty-state">No reservations yet.</p>';
      return;
    }

    const labMap = await getLabNameMap();
    userInfoCache = await getUserInfoMap();

    visibleDocs.sort((a, b) => b.data().date.localeCompare(a.data().date));

    visibleDocs.forEach(docSnap => {
      const data = docSnap.data();
      const labName = labMap[data.labId] || 'Unknown lab';
      const item = document.createElement('div');
      item.className = `list-item status-${data.status}`;
      item.innerHTML = `
        <div>
          <strong>${data.date} · ${data.timeSlot} · ${labName}</strong>
          <p>${bookerLine(data.userId)}</p>
          <p>${data.purpose}</p>
          ${data.equipmentDesc ? `<p>Equipment requested: ${data.equipmentDesc}</p>` : ''}
          ${data.status === 'rejected' && data.rejectionReason ? `<p>Reason: ${data.rejectionReason}</p>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="status-badge">${data.status}</span>
          <button class="hide-btn" title="Remove from admin view"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      item.querySelector('.hide-btn').addEventListener('click', () => hideFromAdminView(docSnap.id));
      allReservationsContainer.appendChild(item);
    });

    allReservationsContainer.style.display = allReservationsVisible ? 'flex' : 'none';
  });
}

async function loadLabs() {
  const snapshot = await getDocs(collection(db, "labs"));
  labListContainer.innerHTML = '';
  if (snapshot.empty) {
    labListContainer.innerHTML = '<p class="empty-state">No labs added yet.</p>';
    return;
  }
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div>
        <strong>${data.name}</strong>
        <p>Capacity: ${data.capacity}${data.equipment ? ' · ' + data.equipment : ''}</p>
      </div>
      <button class="reject-btn delete-lab-btn">Delete</button>
    `;
    item.querySelector('.delete-lab-btn').addEventListener('click', () =>
      deleteLab(docSnap.id, data.name)
    );
    labListContainer.appendChild(item);
  });
}

async function addLab(e) {
  e.preventDefault();
  const name = document.getElementById('new-lab-name').value.trim();
  const capacity = Number(document.getElementById('new-lab-capacity').value);
  const equipment = document.getElementById('new-lab-equipment').value.trim();
  if (!name || !capacity) return;

  await addDoc(collection(db, "labs"), { name, capacity, equipment });
  document.getElementById('new-lab-name').value = '';
  document.getElementById('new-lab-capacity').value = '';
  document.getElementById('new-lab-equipment').value = '';
  loadLabs();
}

async function deleteLab(labId, labName) {
  if (!confirm(`Delete "${labName}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "labs", labId));
    loadLabs();
  } catch (error) {
    alert('Could not delete this lab.');
    console.error(error);
  }
}
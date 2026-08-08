import { db } from './firebase-config.js';
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, where, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const pendingContainer = document.getElementById('pending-requests');
const labListContainer = document.getElementById('lab-list');
const addLabForm = document.getElementById('add-lab-form');

let labNameCache = {};

export function initAdmin() {
  loadPendingRequests();
  loadLabs();
  addLabForm.addEventListener('submit', addLab);
}

async function getLabNameMap() {
  const snapshot = await getDocs(collection(db, "labs"));
  const map = {};
  snapshot.forEach(docSnap => {
    map[docSnap.id] = docSnap.data().name;
  });
  return map;
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

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const labName = labNameCache[data.labId] || 'Unknown lab';
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div>
          <strong>${data.date} · ${data.timeSlot} · ${labName}</strong>
          <p>${data.purpose}</p>
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
        updateStatus(docSnap.id, 'rejected')
      );
      pendingContainer.appendChild(item);
    });
  });
}

async function updateStatus(reservationId, newStatus) {
  try {
    await updateDoc(doc(db, "reservations", reservationId), { status: newStatus });
  } catch (error) {
    alert('Could not update this request. Try again.');
    console.error(error);
  }
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
        <p>Capacity: ${data.capacity}</p>
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
  if (!name || !capacity) return;

  await addDoc(collection(db, "labs"), { name, capacity });
  document.getElementById('new-lab-name').value = '';
  document.getElementById('new-lab-capacity').value = '';
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
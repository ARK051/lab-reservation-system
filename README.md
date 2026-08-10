# Lab Reservation System

A web app for booking lab time without having to track down the PIC (the person in charge of the lab) on WhatsApp or in person every time.

Built for the Cloud Computing course at University of Jakarta International, by Group 2 (Akshay & Clavio).

## The problem this solves

Right now, booking a lab means messaging the PIC directly, he checks availability from memory or a written log, then writes your booking down himself. There's no shared record anyone else can check, and if he's busy or the message gets buried, you're stuck waiting.

This app lets students, lecturers, and the PIC all see real-time lab availability, submit and manage bookings, and get approvals, without anyone needing to be personally reachable first.

## Live demo

https://ARK051.github.io/lab-reservation-system/

## Features

- Email/password login with role-based access (student, lecturer, PIC/admin)
- Real-time lab availability calendar with time slots
- Reservation form with automatic conflict prevention (no double-booking, enforced through a Firestore transaction, not just a UI check)
- PIC approval queue, approve or reject requests
- Cancel your own pending or approved reservations
- View full booking history, with a toggle to hide it if the list gets long
- Filter to only show labs with open slots on a given date
- Admin can add, view, and delete labs, including listed equipment per lab
- Optional per-booking equipment requests, separate from a lab's fixed equipment

## Tech stack

- HTML, CSS, and vanilla JavaScript (ES6 modules)
- Firebase Authentication (email/password)
- Firebase Firestore for the database
- Hosted on GitHub Pages

## Project structure

```
lab-reservation-system/
├── index.html            → Login and register page
├── dashboard.html        → Shared dashboard, role-gated sections
├── style.css              → All styling
├── firebase-config.js  → Firebase project setup
├── auth.js                    → Login, register, forgot password
├── booking.js               → Student/lecturer booking flow
├── admin.js                  → PIC approval queue and lab management
└── README.md
```

## Running this locally

1. Clone the repo:
git clone https://github.com/ARK051/lab-reservation-system.git
cd lab-reservation-system
2. Open the folder in VS Code.
3. Right-click `index.html` and select **Open with Live Server** (requires the Live Server extension).
4. You'll need access to the Firebase project to actually log in or book anything, `firebase-config.js` already points to our shared project.

## Firestore structure

Three collections:

- **users** — `uid`, `name`, `email`, `role` (student / lecturer / admin)
- **labs** — `labId`, `name`, `capacity`, `equipment`
- **reservations** — document ID is built as `labId_date_timeSlot`, which is how double-booking gets caught. Fields: `userId`, `purpose`, `equipmentDesc`, `status`, `date`, `timeSlot`, `createdAt`

## Security

Firestore Security Rules enforce role-based access server-side, not just hidden buttons in the UI. Students and lecturers can only write to their own reservations, only the PIC can approve, reject, or manage labs, and self-registering as admin is blocked at the rules level, not just missing from the signup dropdown.

## Team

- Akshay
- Clavio

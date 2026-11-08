# Mrudugandha Guesthouse Management & Services

Official property management, reservation engine, guest ledger, and operating expense management system for **Mrudugandha Guesthouse**, Kotawade, Ratnagiri.

## Property & Contact Details
- **Property:** Mrudugandha Guesthouse
- **Address:** Plot No. 13 & 14, Kokanwadi NA Plots Society, Ganapatipule Road, Kotawade, Tal., Dist. Ratnagiri, 415617, Maharashtra, India
- **Phone:** +91 9890289088
- **Email:** mrudugandhaguesthouse@gmail.com
- **Proprietor / Owner:** Rahul Vasudeo

---

## Complete Full-Stack Architecture ("Both Apps in One")

This repository bundles both critical applications required to run the guesthouse operations:

### 1. Frontend Client Application (`src/`)
- **Modern Responsive React 19 SPA:** Built with Tailwind CSS, Lucide icons, and Motion animations.
- **Reservation Lifecycle:** Fast booking intake, editing, and active deletion with confirmation prompts.
- **Flexible Guest Entry:** Flexible entry for any number of guests (from 0 to any arbitrary group size without artificial caps).
- **Custom INR Financials:** Handles odd figure amounts, balance payments, advance deposits, and channel commissions.
- **Instant Printable Invoices & Check-In Slips:** Client-side PDF generation, QR code UPI payment links, and instant thermal/A4 printing without external bloat.
- **Progressive Web App (PWA):** Installable on mobile phones and tablets in 1-click for fast home-screen access.

### 2. Backend Services & Cloud DB Application (`server.ts` & `data/`)
- **Express.js API Engine:** High-performance RESTful API powering bookings, expenses, property settings, and user management.
- **Persistent Backend Database:** JSON document store (`data/cloud_database.json`) automatically maintained across server reboots.
- **Automated Rolling Backup System:** Takes rolling snapshots, daily anchor backups, and manual point-in-time recovery archives (`data/backups/`).
- **Real-Time Multi-User Sync:** Server-Sent Events (SSE) stream (`/api/events`) keeping all front-desk, accounts, and owner devices synchronized in real-time.

---

## Units & Base Pricing
- **Full Villa:** ₹15,000 / night
- **Ground Floor:** ₹8,000 / night
- **First Floor:** ₹6,000 / night
- **Both Cottages:** ₹6,000 / night
- **Cottage 1:** ₹3,000 / night
- **Cottage 2:** ₹3,000 / night

---

## Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or bun

### Installation
```bash
# Clone the repository
git clone https://github.com/patrahul2020-max/MrudugandhaAppServices.git
cd MrudugandhaAppServices

# Install dependencies
npm install
```

### Running in Development
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### Building & Running in Production
```bash
# Build frontend assets
npm run build

# Start production server
npm start
```

---

## API Endpoints Reference
| Endpoint | Method | Description |
|---|---|---|
| `/api/data` | GET | Retrieve complete guesthouse database (bookings, expenses, settings) |
| `/api/bookings` | GET, POST | List all reservations or create/update a booking |
| `/api/bookings/:id` | DELETE | Delete a reservation and broadcast sync to all devices |
| `/api/expenses` | GET, POST | List and record operating expenses |
| `/api/expenses/:id` | DELETE | Delete an expense entry |
| `/api/events` | GET (SSE) | Real-time multi-device live synchronization event stream |
| `/api/backups` | GET | List available rolling and daily backups |
| `/api/backup/create` | POST | Trigger an immediate manual database backup snapshot |
| `/api/backup/restore` | POST | Restore database state from a backup file or uploaded JSON |
| `/api/backup/download`| GET | Download full database backup as JSON |

---

## License
Proprietary — All rights reserved for Mrudugandha Guesthouse, Kotawade, Ratnagiri.

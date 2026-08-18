# SAFAR — Full-Stack Ride-Hailing Platform

> **Ride Safe. Ride Smart. Ride SAFAR.**

SAFAR is a production-grade, full-stack ride-hailing platform built with **TypeScript**, **Node.js**, **Express**, **Socket.IO**, **Prisma ORM (SQLite / PostgreSQL)**, and **React + Leaflet + CARTO dark maps**.

It features three separate, fully integrated applications communicating with one centralized backend API and database:

1. **Rider App** (`apps/rider`) — Rider registration/login, pickup & drop destination search, vehicle category selection, fare estimation, real-time driver tracking, cash/QR payment, rating, and trip history.
2. **Driver App** (`apps/driver`) — Driver onboarding, KYC document upload (Aadhaar & Driving Licence), admin approval status, online/offline toggle, 15-second real-time ride request modal, turn-by-turn navigation view, trip lifecycle actions (`Arrived` -> `Start Ride` -> `Complete Ride`), and cash/QR payment collection.
3. **Admin Panel** (`apps/admin`) — Executive dark mobility dashboard, real-time fleet live map, driver KYC verification queue with document viewer, vehicle category & fare rules CRUD manager, driver/rider management, and ride monitor audit trail.

---

## 🏗️ Monorepo Structure

```text
safar/
├── apps/
│   ├── api/          # Express + Socket.IO API Server + Prisma ORM
│   ├── rider/        # Rider React SPA + Leaflet Maps (Port 3001)
│   ├── driver/       # Driver React SPA + GPS Tracker (Port 3002)
│   └── admin/        # Executive Admin Control Center (Port 3003)
│
├── packages/
│   └── shared/       # Shared TypeScript types, state machine, socket contracts
│
├── .env.example      # Environment variables template
├── package.json      # Workspace root package.json
└── README.md
```

---

## ⚡ Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database & Seed Initial Data
```bash
# Push Prisma Schema to database (SQLite local dev.db or PostgreSQL)
npm run db:migrate

# Seed default vehicle categories, Admin account, Rider, and Online Drivers
npm run db:seed
```

### 3. Pre-seeded Credentials

| App | Email | Password | Role / Access |
|---|---|---|---|
| **Admin Panel** | `admin@safar.app` | `Admin@123456` | Platform Admin |
| **Rider App** | `rider@safar.app` | `Rider@123456` | Passenger |
| **Driver App** | `driver.auto@safar.app` | `Driver@123456` | Approved Auto Driver |
| **Driver App** | `driver.moto@safar.app` | `Driver@123456` | Approved Moto Driver |
| **Driver App** | `driver.go@safar.app` | `Driver@123456` | Approved Safar Go Driver |

### 4. Start Applications

In separate terminal windows (or concurrently):

```bash
# Start API & Realtime Server (http://localhost:5000)
npm run dev:api

# Start Rider App (http://localhost:3001)
npm run dev:rider

# Start Driver App (http://localhost:3002)
npm run dev:driver

# Start Admin Panel (http://localhost:3003)
npm run dev:admin
```

---

## 🚖 Complete E2E Ride Flow

1. **Admin**: Log into Admin Panel (`http://localhost:3003`) $\rightarrow$ Inspect active vehicle categories (`Moto`, `Auto`, `Safar Go`, `Safar Sedan`, `SUV`) and live map.
2. **Driver**: Log into Driver App (`http://localhost:3002`) with `driver.auto@safar.app` $\rightarrow$ Toggle switch to **ONLINE**.
3. **Rider**: Log into Rider App (`http://localhost:3001`) with `rider@safar.app` $\rightarrow$ Enter destination $\rightarrow$ Select `Auto` category $\rightarrow$ View estimated fare $\rightarrow$ Click **Confirm SAFAR Ride**.
4. **Realtime Request**: Driver receives 15-second countdown request popup $\rightarrow$ Clicks **ACCEPT RIDE**.
5. **Driver Movement & Trip Progression**:
   - Rider map updates in real time showing assigned driver details and live position.
   - Driver clicks **I Have Arrived at Pickup** $\rightarrow$ Rider UI updates to `DRIVER_ARRIVED`.
   - Driver clicks **START RIDE** $\rightarrow$ Live GPS coordinates stream to Rider map and Admin live map.
   - Driver clicks **COMPLETE RIDE** $\rightarrow$ Ride transitions to `PAYMENT_PENDING`.
6. **Payment & Completion**:
   - Driver collects cash or shows UPI QR payload (`upi://pay?pa=safar@upi...`).
   - Driver clicks **Payment Received** $\rightarrow$ Payment becomes `PAID`, Ride becomes `COMPLETED`, driver earnings update in real-time.

---

## 🛡️ Production Deployment (Railway)

To deploy the backend to **Railway**:

1. Provision PostgreSQL & Redis services on Railway.
2. Deploy `apps/api` service setting environment variables:
   - `DATABASE_URL=postgresql://...`
   - `JWT_SECRET=your_production_jwt_secret`
   - `UPI_ID=safar@upi`
   - `PORT=5000`
3. Run `npx prisma db push && npx tsx prisma/seed.ts` on Railway release command.

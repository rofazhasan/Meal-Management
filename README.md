# 🍚 মিল ম্যানেজার (Meal Manager V2) — Premium Hostel & Mess Management System

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-cyan)
![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%20%7C%20Glassmorphism-sky)
![Prisma](https://img.shields.io/badge/ORM-Prisma%20v5-indigo)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Supabase-blue)
![Vite](https://img.shields.io/badge/Build-Vite%206-purple)
![Language](https://img.shields.io/badge/Language-Bangla--First%20%7C%20English-green)

A **production-grade, Bangla-first meal management platform** built for hostels, mess facilities, and residential dining facilities. Designed with a luxury dark mode glassmorphic UI, real-time 10:00 AM deadline countdown, automated wallet ledger, emergency off auto-refunds, and complete admin audit trails.

---

## 🌟 Key Features

### 👤 User Features
* **Phone + Password Authentication**: Secure registration with mandatory physical/in-person Admin approval (`PENDING` state).
* **Resident Segmentation**: Separate rule sets & pricing for **Permanent Residents** vs **Guest Members**.
* **Daily Meal Switchboard**: Interactive Breakfast, Lunch, and Dinner toggle controls.
* **10:00 AM Cutoff Engine**: Same-day meal preferences lock automatically at 10:00 AM.
* **Auto-Copy Engine**: Automatically copies previous day declaration if user misses deadline.
* **Prepaid Wallet & Ledger**: Real-time balance tracking, deduction history, and downloadable PDF receipts.
* **Calendar Heatmap & Analytics**: Visual monthly consumption trends and cost breakdowns.
* **Emergency Closure Alerts**: Instant notice display with automated wallet refund processing.

### 🛡️ Admin Power Tools
* **In-Person Approval Queue**: Approve or reject pending member registrations.
* **Wallet Top-Up Engine**: Add money to user accounts with mandatory reason logging.
* **Emergency Meal Off**: Toggle emergency off for any date with automated user refunds.
* **Pricing & Monthly Charges**: Configure tiered meal rates and monthly maintenance charges.
* **Immutable Audit Trail**: Comprehensive activity log tracking every administrative mutation.
* **User Detail Inspector**: Comprehensive profile, transaction history, and declaration manager.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend UI** | React 18, TypeScript, TailwindCSS 3.4, Lucide React Icons |
| **State & Cache** | TanStack Query v5 (React Query), LocalStorage Mock Service fallback |
| **Typography & Theme** | Bangla-First (Hind Siliguri / Noto Serif Bengali), Dynamic Dark/Light Mode |
| **ORM / Data Access** | **Prisma ORM v5** (Fully type-safe schemas, composite keys, indexes) |
| **Database DDL** | PostgreSQL (Neon Tech / Supabase / Render Postgres compatible) |
| **Build Tooling** | Vite 6, PostCSS, TypeScript 5.8 |

---

## 📁 Repository Structure

```
Meal-Management/
├── prisma/
│   └── schema.prisma         # Production Prisma ORM Schema (16 models, 11 ENUMs)
├── src/
│   ├── components/
│   │   ├── admin/            # Admin Dashboard, Approvals, Settings, Audit Logs
│   │   ├── auth/             # Login, Registration & Pending Approval UI
│   │   ├── common/           # Custom AppLogo, Navigation, Header, ReceiptModal
│   │   └── user/             # User Dashboard, Meal Declaration, Wallet, Reports
│   ├── constants/            # Bangla Copy & Text Dictionary
│   ├── services/             # Mock Storage & Data Synchronization Service
│   ├── types/                # TypeScript Model Interfaces
│   ├── App.tsx               # Primary Application Container & QueryClient Provider
│   └── index.css             # Glassmorphism Design Tokens & Custom Motion Animations
├── schema.sql                # Production PostgreSQL DDL Backup
├── seed.sql                  # Initial Database Seed Script
├── vite.config.ts            # Vite Configuration
└── package.json              # Project Dependencies
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* **PostgreSQL** (optional for local DB connection)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/rofazhasan/Meal-Management.git
   cd Meal-Management
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/meal_db?schema=public"
   ```

4. **Initialize Prisma ORM** (Optional)
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

---

## 📄 Database Schema Overview (Prisma ORM)

The database schema includes 16 tables:
* `users` — Base user credentials, role (`USER`, `ADMIN`), approval status.
* `profiles` — Resident room numbers, departments, batch.
* `wallets` — User prepaid balance with optimistic concurrency locking (`version`).
* `wallet_transactions` — Append-only ledger entries for deductions and top-ups.
* `meal_declarations` — Daily meal choices with source tracking (`MANUAL`, `COPIED`).
* `meal_consumptions` — Executed meal charges and payment statuses.
* `meal_settings` — Date-wise meal toggles and emergency off state.
* `admin_actions` & `audit_logs` — Audit trail for administrative operations.

---

## 🎨 Bangla UI Localization (বাংলা ইন্টারফেস)

All user-facing workflows feature native Bengali UI copy:

| UI Key | Bangla Copy |
|---|---|
| **App Name** | **মিল ম্যানেজার** |
| **Balance** | **বর্তমান ওয়ালেট ব্যালেন্স** |
| **Cutoff Warning** | **সকাল ১০:০০ টার পর আজকের মিল পরিবর্তন লক হয়ে যাবে** |
| **Auto Copied** | **গতকালকের মিল অনুযায়ী স্বয়ংক্রিয় যুক্ত হয়েছে** |
| **Emergency Off** | **জরুরি কারণে আজ হোস্টেল মিল বন্ধ রয়েছে** |

---

## 🛠️ Verification & Build

```bash
# Type check and production build
npm run build
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more details.

---

## 👨‍💻 Author

Developed by **MD. Rofaz Hasan Rafiu**  
[GitHub Profile](https://github.com/rofazhasan)

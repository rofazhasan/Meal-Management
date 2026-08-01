# 🔑 System Demo Accounts & Access Credentials

Below are the initial authentication credentials for testing and managing the Meal Management application. Direct unauthenticated access is strictly blocked by the application authentication middleware.

---

## 1. 🛡️ Superadmin Account (অ্যাডমিন মোড)

- **Mobile / Username**: `01822222222`
- **Password**: `admin`
- **Role**: Superadmin (`SUPERADMIN`)
- **Capabilities**:
  - Full access to Financial Dashboard, User Management, Rate Configuration & System Controls.
  - Ability to approve/reject pending member registrations.
  - Access to Daily Cook Reports and Special Meal Scheduling.

---

## 2. 👤 Regular Resident Member (স্থায়ী সদস্য)

- **Mobile / Username**: `01711111111`
- **Password**: `user`
- **Role**: Resident Member (`USER`)
- **Capabilities**:
  - Meal declaration management (Breakfast, Lunch, Dinner).
  - Indefinite vacation/meal pause toggle.
  - Personal wallet ledger history & printable expense reports.

---

## 🔐 Authentication Middleware Protection

- All application routes and screens require explicit user login authentication.
- Unauthenticated requests are automatically trapped by the authentication middleware and redirected to the login screen.
- Non-admin users attempting to access admin routes are blocked by strict route guards.

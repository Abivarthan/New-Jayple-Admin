# Jayple Admin Panel
## Complete Implementation Plan
> Version 2.0 · Production Build · May 2026
> Tech Stack: React + Vite · Firebase Admin SDK · Tailwind CSS · shadcn/ui · Recharts

---

## Table of Contents

1. [Architecture & Tech Stack](#1-architecture--tech-stack)
2. [Authentication & Role System](#2-authentication--role-system)
3. [Security Model](#3-security-model)
4. [Dashboard — Platform Overview](#4-dashboard--platform-overview)
5. [Zone Management](#5-zone-management)
6. [UI Config Editor — Per-Zone Home Screen Control](#6-ui-config-editor--per-zone-home-screen-control)
7. [Image Library Management](#7-image-library-management)
8. [Vendor Management](#8-vendor-management)
9. [Vendor Approvals](#9-vendor-approvals)
10. [Vendor Detail — Full Control Page](#10-vendor-detail--full-control-page)
11. [User Management](#11-user-management)
12. [Bookings Management](#12-bookings-management)
13. [Settlements & Payouts](#13-settlements--payouts)
14. [Promotions & Combo Packages](#14-promotions--combo-packages)
15. [Platform Configuration](#15-platform-configuration)
16. [Analytics](#16-analytics)
17. [Admin User Management](#17-admin-user-management)
18. [Audit Log](#18-audit-log)
19. [FCM Broadcast & Messaging](#19-fcm-broadcast--messaging)
20. [Waitlist Management](#20-waitlist-management)
21. [Read/Write Cost Optimization](#21-readwrite-cost-optimization)
22. [New Cloud Functions Required](#22-new-cloud-functions-required)
23. [Complete File Map](#23-complete-file-map)

---

## 1. Architecture & Tech Stack

### Why Custom React Panel (Not Sanity or Firebase Console)
- **No third-party CMS cost** — Sanity or Contentful would add recurring API costs
- **Full control** — every feature built exactly for Jayple's needs
- **Same Firebase project** — admin panel and apps share one Firestore, no sync issues
- **All writes through Cloud Functions** — admin React app NEVER writes directly to Firestore; it calls Cloud Functions which use Admin SDK. This means client-side security rules are bypassed safely only on the server, and every write is audited automatically.

### Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | React 18 + Vite | Fast dev, lightweight bundle |
| UI System | Tailwind CSS + shadcn/ui | Clean components, no heavy library |
| Server State | React Query (TanStack) | Caching, auto-refetch, loading states |
| Auth | Firebase Auth (email/password) | Separate from app phone OTP auth |
| Data Reads | Firebase Client SDK (from React) | Direct Firestore reads for non-sensitive data |
| Data Writes | Firebase Cloud Functions (Admin SDK) | All writes server-side, always audited |
| Charts | Recharts | React-native, lightweight |
| Tables | TanStack Table | Sortable, filterable, paginated, no cost |
| Images | Cloudinary Upload Widget | Direct CDN upload from admin browser |
| Hosting | Firebase Hosting | Same project, no extra cost |
| Routing | React Router v6 | Standard SPA routing |

### Project Structure
```
JaypleAdmin/
├── public/
├── src/
│   ├── pages/           → One file per admin page
│   ├── components/      → Reusable UI components
│   ├── hooks/           → Custom React Query hooks
│   ├── services/        → Firebase + Cloud Function callers
│   ├── utils/           → Helpers, formatters
│   └── context/         → Auth context
├── index.html
├── vite.config.js
└── tailwind.config.js
```

---

## 2. Authentication & Role System

### 2.1 Admin Login
- Route: `/login`
- Email + password fields (NOT phone OTP)
- Firebase Auth `signInWithEmailAndPassword`
- After login → check `adminUsers/{uid}` in Firestore
- If doc not found or `isActive: false` → sign out immediately → show "Unauthorized"
- If found → load role + permissions → proceed to dashboard

### 2.2 Role Definitions

| Role | Access Level | Description |
|------|-------------|-------------|
| `superadmin` | Full access | All pages, all actions, admin user management |
| `manager` | Operations | Vendors, zones, UI config, settlements, content |
| `support` | Read-heavy | Users, bookings read-only, no financial data |

### 2.3 Firestore: `adminUsers/{uid}`
```
{
  uid: string,
  email: "admin@jayple.in",
  name: "Jayaprakash",
  role: "superadmin | manager | support",
  permissions: ["vendors", "users", "zones", "uiconfig", "settlements", "content", "analytics"],
  isActive: true,
  createdAt: timestamp,
  lastLoginAt: timestamp,
  createdBy: adminUid
}
```

### 2.4 Route Guards
Every page wrapped in `<ProtectedRoute requiredPermission="vendors" />`:
- Checks auth context
- Checks role has required permission
- If not → redirect to `/unauthorized`
- Permission list per page enforced both in router and server-side in Cloud Functions

---

## 3. Security Model

### 3.1 Critical Rule: No Direct Firestore Writes from React
The admin React app READS from Firestore directly (safe — security rules restrict reads to `adminUsers` only for sensitive collections). But it NEVER WRITES directly to Firestore.

**All writes call Cloud Functions:**
```javascript
// ✅ Correct — admin React app
const result = await callFunction('approveVendor', { uid: vendorUid });

// ❌ Wrong — never do this from admin React
await setDoc(doc(db, 'vendors', uid), { ... });
```

Cloud Functions:
1. Verify caller UID is in `adminUsers` collection
2. Verify caller has required permission for this action
3. Execute the write using Admin SDK (bypasses security rules)
4. Write to `auditLog` in same transaction
5. Return success/failure

### 3.2 Firestore Security Rules for Admin Collections
```javascript
// adminUsers — no client reads or writes
match /adminUsers/{uid} {
  allow read, write: if false; // Admin SDK only
}

// auditLog — no client reads or writes
match /auditLog/{logId} {
  allow read, write: if false; // Admin SDK only
}

// uiConfigs — public read (customer app reads this), admin write only
match /uiConfigs/{zoneId} {
  allow read: if true;
  allow write: if false; // Cloud Function only
}

// platformConfig — public read (apps cache this), admin write only
match /platformConfig/{docId} {
  allow read: if true;
  allow write: if false; // Cloud Function only
}

// imageLibrary — public read, admin write only
match /imageLibrary/{categoryId} {
  allow read: if true;
  allow write: if false; // Cloud Function only
}

// vendorRegistrationRequests — no client read/write
match /vendorRegistrationRequests/{uid} {
  allow read, write: if false; // Admin SDK + vendor app SDK only
}
```

### 3.3 Session Management
- Firebase ID token auto-refreshes every hour
- On token refresh failure → admin signed out
- `onAuthStateChanged` listener in root component → redirect to login if null

---

## 4. Dashboard — Platform Overview

### 4.1 Page: `/dashboard`
First page after admin login. Shows platform health at a glance.

### 4.2 KPI Cards (Top Row)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Today's     │  This Week   │  Active      │  New Users   │
│  Bookings    │  Revenue     │  Vendors     │  Today       │
│  42          │  ₹84,320     │  127         │  18          │
└──────────────┴──────────────┴──────────────┴──────────────┘
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Pending     │  Pending     │  Total       │  Cancellation│
│  Approvals   │  Settlements │  Completed   │  Rate Today  │
│  3  ⚠️       │  ₹12,400     │  1,284       │  4.2%        │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

Pending Approvals card shows alert badge (orange) if count > 0 → clicking navigates to `/vendors/approvals`.

### 4.3 Charts Section

**Chart 1: Revenue by Zone (Bar Chart)**
- X-axis: Zone names
- Y-axis: Revenue in ₹
- Toggle: Last 7 days / Last 30 days / This month
- Data from: pre-aggregated `ledger/{vendorId}` grouped by zone

**Chart 2: Bookings Trend (Line Chart)**
- X-axis: Dates (last 30 days)
- Y-axis: Booking count
- Two lines: Created vs Completed (shows conversion)
- Data from: `ledger` weekly aggregates (no booking collection scan)

**Chart 3: Top 5 Vendors (Horizontal Bar)**
- By bookings count this week
- Shows shop name + booking count
- Data from: `ledger` docs, sorted

**Chart 4: User Registrations (Line)**
- X-axis: Last 30 days
- Y-axis: New users per day
- Approximated from: `users` collection `createdAt` — admin reads this once per day

### 4.4 Quick Actions
- `[Review Pending Vendors]` → `/vendors/approvals`
- `[Run Weekly Settlements]` → triggers modal confirmation → calls CF
- `[View Waitlist]` → `/waitlist`
- `[Broadcast Message]` → opens FCM broadcast modal

### 4.5 Recent Activity Feed
Last 10 entries from `auditLog`, showing: admin name, action, target, time.

---

## 5. Zone Management

### 5.1 Page: `/zones`

**Zones table:**
| Zone Name | City | Pincodes | Services | Vendors | Waitlist | Status | Actions |
|-----------|------|----------|----------|---------|---------|--------|---------|
| Chennai Central | Chennai | 12 | Salon, Home | 14 | — | 🟢 Active | Edit / Deactivate |
| Trichy East | Tiruchirappalli | 8 | Salon | 6 | — | 🟢 Active | Edit |
| Madurai North | Madurai | 0 | None | 0 | 42 | 🔴 Inactive | Edit |

### 5.2 Create / Edit Zone

**Form fields:**
- Zone name (display name for admin reference)
- City
- **Pincodes array** — input chips, type pincode + press Enter to add (primary lookup key)
- Bounding box (optional) — four lat/lng fields for fast secondary lookup: `minLat, maxLat, minLng, maxLng`
- Available services toggles: `[☑] Salon Bookings` `[☑] Home Services` `[☑] Bridal`
- Zone status: Active / Inactive
- Sponsor row mode: `Admin Curated` vs `Top Rated Auto`
- If Admin Curated: vendor picker (multi-select with search)
- Featured vendor IDs: drag-drop ordered list of vendor cards

**On Save → Cloud Function `updateZone`:**
- Validates pincodes (6 digits each)
- Writes to `serviceZones/{zoneId}`
- Increments version field
- Audit logged

### 5.3 Deactivate Zone
- Confirmation modal: "This will show 'Not available' to all users in this zone. Are you sure?"
- Sets `serviceZones/{zoneId}.isActive = false`
- Customer apps pick up on next open (reads cached availability)

---

## 6. UI Config Editor — Per-Zone Home Screen Control

### 6.1 Page: `/ui-config`
**This is the most powerful page in the admin panel.**
It controls EVERYTHING customers see on the home screen for each zone.

### 6.2 Zone Selector
Dropdown at top: "Select Zone" — shows all active zones.
Selecting a zone loads that zone's `uiConfigs/{zoneId}` document.

### 6.3 Editor Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  Zone: Chennai Central              Version: 14  Last pub: 2h   │
├─────────────────────────────┬───────────────────────────────────┤
│  SECTION LIST (left panel)  │  EDITING AREA (right panel)       │
│                             │                                   │
│  ☰ Hero Section      [ON]   │  [Selected section editor here]   │
│  ☰ Sponsor Row       [ON]   │                                   │
│  ☰ Cashback Banner   [ON]   │                                   │
│  ☰ Services Row      [ON]   │                                   │
│  ☰ Referral Banner   [OFF]  │                                   │
│  ☰ Vendor List       [ON]   │                                   │
│                             │                                   │
│  [+ Add Section]            │                                   │
├─────────────────────────────┴───────────────────────────────────┤
│  [📱 Preview on Phone]              [Publish Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Section List (Left Panel)
- Each section has a drag handle (☰), name, and ON/OFF toggle
- Drag to reorder → changes `sectionOrder` in config
- Toggle OFF → section hidden for all users in this zone
- Click section name → loads that section's editor in right panel

### 6.5 Hero Section Editor
For each combo card in the hero section:
- Title field
- Subtitle field
- Upload PNG image (Cloudinary widget)
- Upload GIF (optional, replaces PNG on hover/loop)
- Gender target: All / Men / Women
- Linked service IDs (multi-select from this zone's services)
- Badge text (e.g. "BEST DEAL", "LIMITED TIME")
- Add/remove/reorder cards (up to 8)

### 6.6 Sponsor Row Editor
- Mode toggle: Admin Curated / Top Rated Auto
- Admin Curated: vendor search + multi-select + drag reorder (max 10)
- Auto: shows numeric input "Show top N vendors" (default 6)
- Row title: text field

### 6.7 Cashback Banner Editor
- Headline text
- Subtext
- Background color picker
- Upload background image (Cloudinary)
- Toggle: show/hide cashback amount (reads from `platformConfig.loyaltyPercentNormal`)

### 6.8 Services Row Editor
- List of service entries with: PNG image, name, gender target, linked category
- Add/remove/reorder services (up to 15)
- For each: upload PNG icon (Cloudinary), label name, gender target selector

### 6.9 Referral Banner Editor
- Headline text
- Subtext (referral %s auto-pulled from `platformConfig`)
- Upload banner image (Cloudinary)
- CTA button text
- CTA action: `refer_earn` (navigates to referral page)

### 6.10 Vendor List Editor
- Sort by selector: Rating / Distance / Bookings
- Limit: numeric input (default 20, max 50)

### 6.11 Phone Preview
Clicking `[Preview on Phone]` opens a modal showing a mock phone frame with the current config rendered visually. Shows section order, toggles, and placeholder content. Does NOT make any Firestore reads — uses in-memory config state.

### 6.12 Publish
- `[Publish Changes]` button → calls Cloud Function `publishUiConfig(zoneId, configData)`
- Cloud Function writes to `uiConfigs/{zoneId}`, increments `version`
- Shows: "Published at [time] · Version 15"
- All customer apps in this zone pick up new config on next open (version cache miss)
- **Saves are NOT auto-published** — admin must explicitly publish. This prevents accidental half-complete configs from going live.

---

## 7. Image Library Management

### 7.1 Page: `/image-library`
Controls the images shown on vendor cards and service cards in the customer app. This is the source for ALL customer-facing images.

### 7.2 Page Layout
Tabs for each service category (15 tabs):
Haircut · Facial · Waxing · Mehendi · Makeup · Beard · Threading · Manicure · Pedicure · Hair Coloring · Keratin · Bridal · Massage · Spa · Nail Art

### 7.3 Each Category Tab Shows
```
HAIRCUT & STYLING
Gender target: [Unisex ▾]     [Save category settings]

PREMIUM ASSETS (images shown for Premium-tier vendors)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  img 1   │ │  img 2   │ │  img 3   │ │  img 4   │ │    +     │
│  [⭐ D]  │ │  [D]     │ │  [D]     │ │  [D]     │ │  Add     │
│ [Replace]│ │ [Replace]│ │ [Replace]│ │ [Replace]│ │  Image   │
│ [Delete] │ │ [Delete] │ │ [Delete] │ │ [Delete] │ └──────────┘
└──────────┘ └──────────┘ └──────────┘ └──────────┘
⭐ D = Default (this is index 0, assigned to new vendors by default)

NORMAL ASSETS (images shown for Normal-tier vendors)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  img 1   │ │  img 2   │ │  img 3   │ │  img 4   │ │    +     │
│  [⭐ D]  │ │  [D]     │ │  [D]     │ │  [D]     │ │  Add     │
...
```

### 7.4 Add Image
- Opens Cloudinary Upload Widget
- Admin uploads image directly from browser → Cloudinary CDN
- Returns secure HTTPS URL
- URL pushed to `premiumAssets[]` or `normalAssets[]` array in `imageLibrary/{categoryId}`
- Image immediately available for assignment

### 7.5 Replace Image
- Same Cloudinary upload widget
- New URL replaces existing entry in the array at same index
- All vendors using that index now show the new image automatically (no app update needed)

### 7.6 Delete Image
- Warning: "X vendors are currently using image index [N]. Deleting will default them to image 0."
- If confirmed → removes from array, updates all affected vendor `imageIndex` values to 0
- Cannot delete if it's the only image in the set (minimum 1 required)

### 7.7 Set Default (⭐)
- Marks which image is assigned to NEW vendors by default (index 0 is always default)
- Reordering within the array changes default

---

## 8. Vendor Management

### 8.1 Page: `/vendors`
Sub-navigation: Approvals | All Vendors

### 8.2 All Vendors Table
Filterable, sortable, paginated (50 per page).

**Columns:**
| Shop Name | Owner | Phone | City/Zone | Tier | Status | Rating | Bookings | Earnings (week) | Actions |
|-----------|-------|-------|-----------|------|--------|--------|---------|-----------------|---------|

**Filter bar:**
- Zone (dropdown)
- Tier: All / Premium / Normal
- Status: All / Active / Pending / Suspended / Blocked
- GST: All / GST Registered / Non-GST
- Search: by shop name or phone number (debounced)

**Row actions:**
- `[View]` → opens Vendor Detail page
- `[Suspend]` → quick action with reason dialog
- `[Reactivate]` → re-enables suspended vendor

**Bulk actions:**
- Select multiple → [Activate Selected] [Suspend Selected] [Export CSV]

---

## 9. Vendor Approvals

### 9.1 Page: `/vendors/approvals`
Shown when there are pending registration requests.

**Alert banner** on this page if count > 0: "⚠️ 3 vendors are waiting for approval"

### 9.2 Approvals Table
| Owner Name | Shop Name | Phone | Requested At | Actions |
|------------|-----------|-------|-------------|---------|

### 9.3 Approve Action
- Admin clicks `[Approve]` → calls Cloud Function `approveVendor(uid)`
- Cloud Function:
  1. Verifies caller is in `adminUsers`
  2. Creates `vendors/{uid}` doc (basic setup, `status: "approved"`)
  3. Updates `vendorRegistrationRequests/{uid}.status = "approved"`, `reviewedBy`, `reviewedAt`
  4. Sends FCM to vendor: "Your Jayple vendor application has been approved! Complete your profile to go live."
  5. Writes audit log entry
- Table row immediately disappears (optimistic update)

### 9.4 Reject Action
- Admin clicks `[Reject]` → dialog opens with required "Reason" text field
- Reasons: "Incomplete information" / "Area not yet supported" / "Duplicate account" / Custom text
- Calls Cloud Function `rejectVendor(uid, reason)`
- Cloud Function:
  1. Updates request status → `rejected`
  2. Sends FCM to vendor with rejection reason
  3. Audit logged
- Vendor sees rejection reason in their app

### 9.5 Auto-Approve Toggle
- Toggle at top of Approvals page: "Auto-approve new vendors: ON/OFF"
- Reads/writes to `platformConfig/settings.autoApproveVendors`
- When ON: new requests are auto-approved immediately by Cloud Function
- Changing this calls Cloud Function `updatePlatformSetting`

---

## 10. Vendor Detail — Full Control Page

### 10.1 Page: `/vendors/:vendorId`
Most comprehensive page. Admin can control every aspect of a vendor account.

### 10.2 Section 1: Profile Info (Editable)
All shop details displayed in editable form:
- Shop name, owner name, phone, email, description
- Full address (all fields)
- GST status + GST number + GST holder name

**Read-only display:**
- Tier badge (changed in Section 2)
- Registration date, approved by, approved at
- Last active, total bookings, average rating

`[Save Profile Changes]` → calls CF `updateVendorProfile`

### 10.3 Section 2: Tier & Classification (Admin-Only)
```
Shop Tier:    [Normal ▾]  ← admin dropdown, vendor cannot see this
Commission:   [15 %]      ← editable, overrides platform default
[Save Tier & Commission]
```

Changing tier → affects which imageLibrary tier is used for ALL services.

### 10.4 Section 3: Image Assignment Panel (Most Important Visual Control)

**Cover Image (shown on vendor cards in customer app):**
```
COVER IMAGE (shown on home screen cards)
Current tier: Premium

From Premium Assets — Haircut & Styling:
[◉ Img 1]  [○ Img 2]  [○ Img 3]  [○ Img 4]
  (radio buttons showing all 4 premium images as thumbnails)

[Save Cover Image]
```

**Per-Service Image:**
For each service listed under this vendor:
```
Haircut & Styling (45 min · ₹500 · Unisex)
  Current image: [thumbnail preview]
  Category: haircut · Tier: Premium
  [◉ Img 1]  [○ Img 2]  [○ Img 3]  [○ Img 4]
  Override tier: [Use Normal instead] checkbox
  [Save Service Image]

Facial Treatment (60 min · ₹699 · Women)
  Current image: [thumbnail preview]
  [◉ Img 1]  [○ Img 2]  [○ Img 3]  [○ Img 4]
  [Save Service Image]
```

Each save → calls CF `updateVendorServiceImage(vendorId, serviceId, imageIndex)`
Change takes effect immediately in customer app (no app update).

### 10.5 Section 4: Service List Management
Table of all vendor services:
| Name | Category | Price | Tax-Inc Price | Fake Disc% | Bestseller | Active | Sort | Actions |
|------|---------|-------|--------------|-----------|----------|--------|------|---------|

**Admin controls per service (inline edit):**
- `fakeDiscountPercent`: number input (overrides platform default)
- `isBestseller`: toggle (shows ⭐ Bestseller badge in customer app)
- `isActive`: toggle (show/hide from customers)
- `sortOrder`: drag handle or number input
- `realDiscountPercent`: number input

`[Save All Service Changes]` → batch write via CF

**Admin can also:**
- Force-deactivate a service even if vendor has it active
- Permanently delete a service (with confirmation — checks no active bookings reference it)

### 10.6 Section 5: Financial Control
```
Current Wallet Balance:    ₹1,250.00
Platform Commission:       15%
COD Threshold:             ₹5,000
COD Collected (current):   ₹3,200
COD Status:                🟢 Clear

[Adjust Wallet Balance]  ← opens modal: amount + mandatory reason
[Reset COD Status]
[Override Commission %]
[Block Service]  /  [Unblock Service]
```

**Wallet Adjustment Modal:**
- Amount field (positive = credit, negative = debit)
- Reason field (mandatory, min 10 characters)
- Preview: "This will change balance from ₹1,250 to ₹1,450"
- `[Confirm Adjustment]` → CF `adjustVendorWallet(vendorId, amount, reason)`
- Audited with full before/after values

### 10.7 Section 6: Bookings History
Paginated table of all bookings for this vendor (all time):
- Filters: Status, Date range
- Columns: Customer name, Services, Date/Time, Amount, Status, Payment method

### 10.8 Section 7: Reviews
All customer reviews for this vendor:
- Rating, comment, customer name, date
- `[Flag for removal]` → moves to admin review queue
- `[Force delete review]` → superadmin only, logs reason

### 10.9 Section 8: Gallery (Admin Reference)
Shows vendor-uploaded exterior + interior photos (from Firebase Storage).
These are for admin reference when deciding tier and image assignments.
Admin cannot see these from the customer app — they're vendor-submitted.

### 10.10 Danger Zone
```
[Suspend Vendor]      ← requires reason, sends FCM, sets status: "suspended"
[Reactivate Vendor]   ← re-enables, sends FCM
[Block Service]       ← sets isServiceBlocked: true
[Force-Unblock Service] ← clears block
[Delete Vendor Account] ← superadmin only, soft delete with 30-day grace
```

---

## 11. User Management

### 11.1 Page: `/users`
**Permissions:** Support role can read. Manager/Superadmin can perform actions.

### 11.2 Users Table
| Name | Phone | City | Bookings | Wallet | Registered | Last Active | Actions |
|------|-------|------|---------|--------|-----------|------------|---------|

**Filters:** City, Registration date range, Wallet balance range, Has bookings / No bookings

**Search:** by phone number or name (debounced)

### 11.3 User Detail Panel (Slide-in drawer)
Clicking a user row opens a drawer:
- Full profile: name, phone, email, gender, city, referral code, referred by
- Wallet: current balance, transaction history (paginated)
- Booking history: paginated, all statuses
- Referral network: who they referred (names + phones)
- `[Adjust Wallet]` → adds/removes wallet balance (audited, with reason)
- `[Block Account]` → sets `users/{uid}.isBlocked = true` — with reason
- `[Reset Profile]` → clears profile data (for account recovery requests)

---

## 12. Bookings Management

### 12.1 Page: `/bookings`
Platform-wide view of all bookings.

### 12.2 Bookings Table
| Booking ID | Customer | Vendor/Shop | Services | Date/Time | Amount | Payment | Status | Actions |
|-----------|---------|-------------|---------|----------|--------|---------|--------|---------|

**Filters:**
- Zone
- Status: All / Pending / Confirmed / In Progress / Completed / Cancelled
- Payment method: All / Online / COD
- Date range
- Search by booking ID or customer phone

**Export:** `[Export CSV]` — current filtered view → downloads CSV for accounting

### 12.3 Booking Detail Drawer
Clicking a row opens full booking details:
- All booking fields (services, prices, OTPs, timestamps)
- Financial breakdown (service price, commission, vendor net, GST)
- Refund status (if applicable)
- Notification sent log (`notificationsSent` map)
- `[Force Cancel]` → superadmin can force-cancel any booking with reason
- `[Trigger Manual Refund]` → if automatic refund failed

---

## 13. Settlements & Payouts

### 13.1 Page: `/settlements`

### 13.2 Settlements Table
| Vendor | Zone | Gross (week) | Commission | Net | Carry Forward | Status | Actions |
|--------|------|-------------|-----------|-----|--------------|--------|---------|

**Filters:** Zone, Week (date picker), Status (Pending/Carried Forward/Paid)

**Sort by:** Net amount descending (highest payout first)

### 13.3 Run Weekly Settlements Button
```
[▶ Run Weekly Settlements]
```
- Opens confirmation modal: "This will process settlements for all vendors with net balance ≥ ₹500. This action cannot be undone."
- Calls Cloud Function `runWeeklySettlements`
- Shows loading state + result: "Processed 14 settlements. Total payout: ₹1,24,500. Carried forward: 8 vendors."

### 13.4 Per-Row Actions
- `[Mark as Paid]` → sets settlement `status: "PAID"`, records bank transfer reference
- `[View Transactions]` → opens all wallet transactions for that vendor this week
- `[View Ledger]` → shows `ledger/{vendorId}` with all weekly history

### 13.5 Export
`[Export CSV]` → all settlements for selected week as CSV (for finance team / CA)

Columns: Vendor name, Shop name, IFSC, Account number, Amount, Date.

---

## 14. Promotions & Combo Packages

### 14.1 Page: `/promotions`
Sub-navigation: Combo Packages | Banners | Offers

### 14.2 Combo Packages
Lists all `comboPackages` documents.

**Create / Edit Package:**
- Package name (e.g. "Bridal Ready Package")
- Description (2–3 lines)
- Upload cover PNG image (Cloudinary)
- Upload animated GIF (optional, for hero section cards)
- Gender target: All / Men / Women
- Available zones: multi-select from zones list
- Included services: multi-select from service catalog
- Original price (shown with strikethrough)
- Discounted price (actual price)
- Badge text (e.g. "SAVE 20%", "TRENDING")
- Sort order
- Is active toggle

**On Save → CF `updateComboPackage`:**
- Writes to `comboPackages/{packageId}`
- Increments version for any affected `uiConfigs/{zoneId}` where this package appears

### 14.3 Banners
- Creates/edits admin-controlled banners (hero section, referral, cashback)
- Each banner: image upload, headline text, subtext, CTA text, CTA action, zones
- Used in UI Config Editor as content source

### 14.4 Offers
- Per-vendor or zone-wide promotional offers
- Offer: vendor ID (or "all"), title, discount type (%, flat), discount value, conditions (min amount), expiry date, zones
- Active offers show as overlay badges on vendor cards

---

## 15. Platform Configuration

### 15.1 Page: `/platform-config`
Controls all dynamic values that both apps fetch. Changes here propagate to all apps on next open.

### 15.2 Tab 1: Tax Rates
```
GST Registered Tax %:     [ 18.0 %]
Non-GST Tax %:            [  5.0 %]
Convenience Fee:          [ ₹9.00  ]
Tax included in price:    [ON toggle]
Tax display label:        [ GST    ]

Version: 5   Last updated: 27 May 2026 by Jayaprakash

[Save & Publish Tax Rates]
```

On save → CF `updateTaxRates` → increments version → all apps re-fetch on next open.
Shows warning: "This change will affect all active pricing within 24 hours (next app open)."

### 15.3 Tab 2: Discount Rules
```
Default fake discount %:     [10 %]
Min % to show badge:         [ 5 %]
Max allowed discount %:      [70 %]
Badge style:                 [◉ Percent (10% OFF)] [○ Amount (₹11 OFF)]
Show strikethrough original: [ON]

[Save & Publish Discount Rules]
```

### 15.4 Tab 3: Vendor Settings
```
Auto-approve vendors:           [OFF toggle]
Default commission %:           [15 %]
Default COD threshold:          [₹5,000]
Vendor wallet block threshold:  [-₹500]
Slot lock duration:             [2 minutes]

[Save & Publish Vendor Settings]
```

### 15.5 Tab 4: Financial Rules
```
Cancellation window:         [2 hours before slot]
Cancellation penalty %:      [25 %]
Vendor cancel penalty:       [₹100]
Vendor cancel compensation:  [₹30 to customer]
No-show penalty:             [₹50]
Welcome bonus:               [₹50]
Min weekly payout:           [₹500]
Normal cashback %:           [2 %]
Referee first booking %:     [3 %]
Referrer bonus %:            [2 %]
Max wallet usage %:          [20 %]
Min wallet balance to redeem: [₹50]

[Save & Publish Financial Rules]
```

### 15.6 Tab 5: App Behavior
```
COD eligibility:             After [1] completed bookings
Max services per booking:    [10]
Max advance booking days:    [30]
Vendor re-ping interval:     [5] minutes
Auto-timeout window:         [5] minutes before slot

[Save & Publish]
```

---

## 16. Analytics

### 16.1 Page: `/analytics`
Read-only. Aggregated from pre-computed `ledger` and `settlements` docs. No scanning of `bookings` collection (expensive).

### 16.2 Charts Available

**Revenue Analytics:**
- Total platform revenue (Jayple's share = commission + CF) — bar by week
- Revenue by zone — stacked bar, select time period
- Commission collected vs payout made — shows platform profit
- Revenue growth rate week-over-week

**Booking Analytics:**
- Booking volume trend (daily, 90 days)
- Booking funnel: Created → Confirmed → Completed → Reviewed (% at each step)
- Cancellation rate by zone (line chart)
- Peak booking hours (heatmap — hour of day vs day of week)
- Top 10 services booked (pie chart)

**Vendor Analytics:**
- Top vendors by revenue this month (sortable table + bar chart)
- Vendor acquisition trend (new vendors per month)
- Vendor activity rate (vendors with ≥1 booking this week / total active vendors)
- Premium vs Normal vendor split (donut chart)
- COD vs Online payment split (donut chart)

**User Analytics:**
- User registration trend (daily/weekly)
- Returning vs new users ratio
- Gender preference usage (Both/Men/Women — from `users.genderPreference` field, sampled)
- Referral conversion rate (users who used referral code / total users)
- Wallet usage rate (bookings with wallet discount / total bookings)

**Zone Analytics:**
- Active users per zone (from `users.activeLocation.zoneId`, sampled)
- Bookings per zone (from ledger)
- Waitlist count per area (from `waitlist` collection, grouped by city)
- Zone-wise cancellation rate

### 16.3 All Data Exportable
Every chart has `[Export CSV]` button. Downloads current date-range filtered data.

---

## 17. Admin User Management

### 17.1 Page: `/admin-users`
**Permission: Superadmin only.**

### 17.2 Admin Users Table
| Name | Email | Role | Status | Last Login | Created By | Actions |
|------|-------|------|--------|-----------|-----------|---------|

### 17.3 Create Admin User
- Email, name, role selector
- CF `createAdminUser(email, name, role)`:
  1. Creates Firebase Auth user with temp password
  2. Sends email with temp password + login link
  3. Creates `adminUsers/{uid}` doc
  4. Audit logged

### 17.4 Edit Admin User
- Change role, change permissions, activate/deactivate
- CF `updateAdminUser(uid, changes)`

### 17.5 Deactivate Admin User
- Sets `isActive: false` in `adminUsers/{uid}`
- Firebase Auth account NOT deleted (for audit trail)
- Deactivated admin cannot log in (React app checks `isActive` on every login)

---

## 18. Audit Log

### 18.1 Page: `/audit-log`
**Permission: Superadmin only.**

### 18.2 Log Table
| Admin | Role | Action | Target | Old Value | New Value | Time |
|-------|------|--------|--------|----------|---------|------|

**Filters:** Admin name, Action type, Date range, Target type (vendor/user/zone/config)

**Search:** by target ID (vendor UID or booking ID)

### 18.3 What Gets Logged
Every Cloud Function write creates an audit log entry:

| Action | Logged Fields |
|--------|-------------|
| `approve_vendor` | vendorUid, shopName, approvedBy |
| `reject_vendor` | vendorUid, reason, rejectedBy |
| `update_vendor_tier` | vendorUid, before: tier, after: tier |
| `update_vendor_commission` | vendorUid, before: %, after: % |
| `swap_vendor_cover_image` | vendorUid, serviceId, before: index, after: index |
| `adjust_wallet` | vendorUid/userId, amount, reason, before: balance, after: balance |
| `suspend_vendor` | vendorUid, reason |
| `publish_ui_config` | zoneId, before: version, after: version |
| `update_tax_rates` | before: {rates}, after: {rates} |
| `run_settlements` | processedCount, totalPayout |
| `force_cancel_booking` | bookingId, reason |
| `create_admin_user` | new adminUid, email, role |
| `broadcast_fcm` | audience, message, zone |

### 18.4 Firestore: `auditLog/{logId}`
```
{
  adminUid: string,
  adminName: string,
  adminRole: string,
  action: string,
  targetType: "vendor | user | zone | booking | platformConfig | adminUser",
  targetId: string,
  before: map (old values),
  after: map (new values),
  metadata: map (extra context),
  timestamp: serverTimestamp
}
```

---

## 19. FCM Broadcast & Messaging

### 19.1 Broadcast Panel (Modal, accessible from Dashboard and Vendor pages)

**Target options:**
- Single vendor (vendor detail page → "Send Message" button)
- All vendors in a zone
- All customers in a zone
- Waitlist users for a specific city/pincode
- All platform users (superadmin only)

**Message form:**
- Title field
- Body field (max 200 chars)
- Action type: `none` / `open_home` / `open_promotions` / `open_bookings` / `custom_url`
- Schedule: Send now / Schedule for later (date+time picker)

**On Send → CF `sendBroadcastFcm(target, title, body, action)`:**
1. Verifies admin permission
2. Queries FCM tokens for target group
3. Sends via Firebase Admin Messaging in batches (500 per batch — FCM limit)
4. Returns: sent count, failed count
5. Audit logged

### 19.2 Vendor Approval Notification (Automated)
Sent automatically by CF on approval/rejection (not manual). Includes deep link to:
- Approval: opens onboarding flow
- Rejection: shows rejection screen with reason

### 19.3 Waitlist Notification
Page: `/waitlist` → `[Notify Waitlist Users for [City]]` button.

CF `notifyWaitlist(city, pincode)`:
1. Queries all `waitlist` docs where `city == city` or `pincode == pincode`
2. Gets FCM tokens from `users/{uid}` for each user
3. Sends: "Great news! Jayple is now live in [city]. Book your first service now!"
4. Includes deep link to open app to `/home`
5. Marks waitlist entries as `notified: true`

---

## 20. Waitlist Management

### 20.1 Page: `/waitlist`

### 20.2 Waitlist Table
Grouped by city:
```
Chennai — 0 users    [No waitlist]
Madurai — 42 users   [Notify All] [Export]
Coimbatore — 18 users [Notify All] [Export]
Salem — 7 users       [Notify All] [Export]
```

Expanding a city row shows individual users (name, phone, registered date).

### 20.3 Waitlist Heatmap
Simple visual: list of cities sorted by waitlist count (highest first).
This guides Jayple team on where to expand next.

### 20.4 Waitlist: Firestore
```
waitlist/{docId}
  userId, phone, lat, lng, address, city, pincode,
  createdAt, notified: bool, notifiedAt: timestamp?
```

---

## 21. Read/Write Cost Optimization

### 21.1 Admin-Specific Optimizations

| Action | Reads | Optimization |
|--------|-------|-------------|
| Load all vendors table | N (paginated, 50/page) | TanStack Table pagination — only fetch displayed page |
| Analytics charts | 0–3 | Use pre-aggregated `ledger` + `settlements` — NEVER scan `bookings` collection |
| Pending approvals badge | 1 | Real-time listener on `vendorRegistrationRequests` count only |
| Dashboard KPIs | 2–3 | Aggregated from ledger docs, not raw booking scans |
| Image library | 1 per category tab | React Query 1-hour cache — same admin session = 0 repeated reads |
| Platform config | 1 on load | React Query 5-min cache |
| Audit log | On demand | Paginated, only fetched when admin opens the page |

### 21.2 React Query Caching Strategy
```javascript
// Image library — rarely changes, cache 1 hour
useQuery(['imageLibrary', categoryId], fetchCategory, { staleTime: 60 * 60 * 1000 })

// Platform config — cache 5 minutes
useQuery(['platformConfig'], fetchConfig, { staleTime: 5 * 60 * 1000 })

// Vendor list — cache 2 minutes (changes more often)
useQuery(['vendors', filters], fetchVendors, { staleTime: 2 * 60 * 1000 })

// Pending approvals — real-time (always live)
// Uses onSnapshot listener, not React Query
```

### 21.3 Write Optimization
- All batch writes via Cloud Functions (atomic, counted as 1 write operation by Firebase)
- Incrementing `version` fields is a single field update (cheap)
- `auditLog` writes are done inside the same Cloud Function call (no extra round trip)
- Vendor table pagination: 50 per page × Firestore reads = only 50 reads per page load

---

## 22. New Cloud Functions Required

All deployed to `asia-south1` region. All are Callable v2 functions.

| Function | Caller | Purpose |
|----------|--------|---------|
| `approveVendor(uid)` | Admin panel | Creates vendor doc, sends FCM, audit log |
| `rejectVendor(uid, reason)` | Admin panel | Updates request status, FCM, audit log |
| `autoApproveVendorRequest(uid)` | Internal (called on registration if autoApprove=ON) | Same as approveVendor but by system |
| `updateVendorTier(vendorId, tier)` | Admin panel | Changes tier, audit log |
| `updateVendorCommission(vendorId, percent)` | Admin panel | Updates commission, audit log |
| `updateVendorServiceImage(vendorId, serviceId, index)` | Admin panel | Swaps service image index, audit log |
| `updateVendorCoverImage(vendorId, index)` | Admin panel | Swaps cover image index, audit log |
| `adjustVendorWallet(vendorId, amount, reason)` | Admin panel | Manual wallet adjustment, audit log |
| `adjustUserWallet(userId, amount, reason)` | Admin panel | Manual customer wallet adjustment, audit log |
| `publishUiConfig(zoneId, configData)` | Admin panel | Writes uiConfig, increments version, audit log |
| `updateZone(zoneId, data)` | Admin panel | Updates serviceZone, audit log |
| `updateTaxRates(rates)` | Admin panel | Updates platformConfig/taxRates, increments version |
| `updatePlatformSettings(settings)` | Admin panel | Updates platformConfig/settings, increments version |
| `updateDiscountRules(rules)` | Admin panel | Updates platformConfig/discountRules, increments version |
| `updateComboPackage(data)` | Admin panel | Creates/updates comboPackages, audit log |
| `sendBroadcastFcm(target, title, body)` | Admin panel | Batch FCM send, audit log |
| `notifyWaitlist(city, pincode)` | Admin panel | Notify waitlist users, marks as notified |
| `forceCancelBooking(bookingId, reason)` | Admin panel | Superadmin force cancel, audit log |
| `createAdminUser(email, name, role)` | Admin panel | Firebase Auth + adminUsers doc |
| `updateAdminUser(uid, changes)` | Admin panel | Updates role/permissions/status |
| `getAnalyticsSummary(period)` | Admin panel | Returns pre-aggregated analytics data |

**Existing functions that need modification:**
| Function | Change |
|----------|--------|
| `acceptBooking` | Use batch write, add `notificationsSent` flag |
| `rejectBooking` | Same |
| `startBooking` | Same |
| `completeBooking` | Same, use dynamic tax from platformConfig |
| `cancelBooking` | Same, use dynamic penalty amounts from platformConfig |
| `settleBookingEarnings` | Use dynamic commission from platformConfig |
| `onBookingCreated` | Check `notificationsSent.vendor_new_booking` before FCM |
| `onBookingUpdated` | Check `notificationsSent[type]` before every FCM |
| `scheduledReminders` | Add 2-min delay guard for vendor re-ping |

---

## 23. Complete File Map

```
JaypleAdmin/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx                          → Router setup, auth context provider
│   │
│   ├── context/
│   │   └── AuthContext.jsx              → Firebase auth state, admin user profile
│   │
│   ├── services/
│   │   ├── firebase.js                  → Firebase init (Auth + Firestore client SDK)
│   │   └── cloudFunctions.js            → Wrappers for all CF calls (typed, error-handled)
│   │
│   ├── hooks/
│   │   ├── useAdminAuth.js              → Auth check, role check hooks
│   │   ├── useVendors.js                → React Query vendor fetching
│   │   ├── useZones.js                  → React Query zones
│   │   ├── useImageLibrary.js           → React Query image library (1hr cache)
│   │   ├── usePlatformConfig.js         → React Query platformConfig (5min cache)
│   │   ├── useAnalytics.js              → React Query analytics data
│   │   └── usePendingApprovals.js       → Real-time listener for pending count
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx              → Main nav sidebar
│   │   │   ├── TopBar.jsx               → Page header + user menu
│   │   │   └── ProtectedRoute.jsx       → Auth + permission guard wrapper
│   │   ├── ui/
│   │   │   ├── KPICard.jsx              → Dashboard metric card
│   │   │   ├── DataTable.jsx            → TanStack Table wrapper with filters
│   │   │   ├── ImagePicker.jsx          → Cloudinary upload widget wrapper
│   │   │   ├── StatusBadge.jsx          → Color-coded status pills
│   │   │   └── ConfirmModal.jsx         → Reusable confirmation dialog
│   │   ├── vendor/
│   │   │   ├── ImageAssignment.jsx      → Service + cover image swap panel
│   │   │   └── WalletAdjustModal.jsx    → Admin wallet adjustment form
│   │   └── uiconfig/
│   │       ├── SectionList.jsx          → Drag-drop section reorder
│   │       ├── HeroSectionEditor.jsx    → Hero section form
│   │       ├── SponsorRowEditor.jsx
│   │       ├── ServicesRowEditor.jsx
│   │       └── PhonePreview.jsx         → Mock phone preview modal
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Unauthorized.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Zones.jsx
│   │   ├── UIConfigEditor.jsx
│   │   ├── ImageLibrary.jsx
│   │   ├── vendors/
│   │   │   ├── VendorApprovals.jsx
│   │   │   ├── AllVendors.jsx
│   │   │   └── VendorDetail.jsx
│   │   ├── Users.jsx
│   │   ├── Bookings.jsx
│   │   ├── Settlements.jsx
│   │   ├── Promotions.jsx
│   │   ├── PlatformConfig.jsx
│   │   ├── Analytics.jsx
│   │   ├── AdminUsers.jsx
│   │   ├── AuditLog.jsx
│   │   └── Waitlist.jsx
│   │
│   └── utils/
│       ├── formatters.js                → Currency, date, phone formatters
│       ├── validators.js                → GST, IFSC, PAN validation (shared with CF)
│       └── constants.js                 → Role permissions map, category lists
│
└── package.json
```

---

*Admin Panel Implementation Plan — Complete*
*All 23 sections documented · 20 new Cloud Functions · Full security model · Ready for development*

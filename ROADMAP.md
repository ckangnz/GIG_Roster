# GIG Roster Development Roadmap

This roadmap outlines the planned improvements, refactorings, and feature expansions for the GIG Roster application.

---

## 🛠 Phase 1: Code Health & Security (Refactoring)

High-priority technical debt and security infrastructure.

- [x] **Firestore Security Rules**: Implement robust `firestore.rules` to restrict data access (e.g., users can only edit their own profile, only admins can manage teams).
- [x] **Decompose `RosterCell.tsx`**: Refactor into a strategy pattern (e.g., `StandardCell`, `AbsenceCell`, `SummaryCell`) to reduce complexity.
- [x] **Split `useRosterBaseLogic.ts`**: Break the "God Hook" into smaller, focused hooks:
  - `useRosterData` (Data fetching/subscriptions)
  - `useRosterActions` (State updates/saving)
  - `useRosterUI` (Focus/Selection/View modes)
- [x] **Redux Slice Cleanup**: Audit slices for redundant state and ensure consistent normalization (especially for Timestamps).

---

## 🚀 Phase 2: UX & Visual Polish

Enhancing the day-to-day experience for members and leads.

- [x] **Conflict Detection Visuals**: Show a "soft warning" (e.g., yellow dot) in the roster when a user is assigned to multiple positions/teams on the same day.
- [ ] **Enhanced Loading States**: Implement skeleton screens for the Roster grid to replace the full-page spinner.

---

## 💡 Phase 3: New Feature Implementation

Adding high-value functional modules.

- [x] **"Shift Swap" / Coverage Marketplace**:
  - Members can "Request Swap" via Absence table (automated).
  - Slot turns orange and becomes "Claimable" in Roster and Dashboard.
  - Leader notified via in-app indicator and bottom nav badge.
- [ ] **Run Sheet / Event Metadata**:
  - Add a "Details" drawer to date headers.
  - Support listing songs, themes, or special notes for specific Sundays.
- [ ] **AI "Draft Roster" (Auto-Fill)**:
  - Logic-based drafting considering frequency of play, gender balance, and availability.
  - Pop-in animation sequence when the draft is generated.
- [ ] **Team "Vibe Check"**:
  - Analytics for admins to see general team sentiment based on Thought activity/hearts.

---

## 💰 Phase 4: Scalability & Monetization

Preparing the app to support multiple organizations.

- [ ] **Multi-Tenancy Architecture**:
  - Add `organizationId` to all core models.
  - Implement "Join via Invite Code" flow.
- [ ] **Member Management Dashboard**:
  - More granular permissions (e.g., "Team Lead" vs "Global Admin").
  - User activity logs.
- [ ] **Subscription Tiering**:
  - Standard (Free): Manual scheduling, limited members.
  - Pro (Paid): Auto-Fill, Shift Swap Marketplace, Service Run Sheets.
- [ ] **Native PWA Push Notifications**: Integrate Web Push API for critical roster changes (without Firebase Functions where possible, or as a Pro feature).

---

## ✅ Completed Recently

- [x] **iOS Midnight Theme**: High-contrast dark mode implementation.
- [x] **Modal-based Workflow**: Refactored team/position creation into sleek modals.
- [x] **Real-time Animations**: Implemented Heart bursts, Roster pop-ins, and rubber-band dragging.
- [x] **Thought Expiration**: Implemented 7-day soft-expiry and revival system.
- [x] **Gender-Aware Theming**: Dynamic color shifts based on user profile (Rose vs Blue).
- [x] **Presence System**: Real-time cursor and location tracking for all online users.

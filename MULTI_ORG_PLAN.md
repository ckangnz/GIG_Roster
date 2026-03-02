# 🌐 Multi-Organisation & SaaS Implementation Plan

This document tracks the progress of transitioning GIG Roster into a multi-tenant SaaS platform.

## 🎯 Core Objectives
1.  **Multi-Org Membership**: Users can belong to multiple organisations.
2.  **Device-Specific Sessions**: Active organisation is tracked per device (localStorage), not globally.
3.  **Organisation Creation**: Tiered pricing (Small/Medium/Large) with 1-month trials.
4.  **Team-Scoped Presence**: Online indicators are strictly limited to common team memberships.
5.  **Governance**: Unique organisation names and owner-based restrictions.

---

## 🏗 1. Data Architecture (Member Decoupling)
Currently, user data is monolithic. We must move organisation-specific data into sub-collections.

- [ ] **Global User Profile**: `users/{userId}` (Name, Email, Gender, Language)
- [ ] **Organisation Membership**: `organisations/{orgId}/members/{userId}`
    - `isApproved`: boolean
    - `isAdmin`: boolean
    - `teams`: string[]
    - `teamPositions`: Record<string, string[]>
- [ ] **Active Org Management**:
    - [ ] Store `activeOrgId` in Redux + LocalStorage (device-specific).
    - [ ] Update all Roster/Thought/Setting queries to use `activeOrgId`.

---

## 🏬 2. Organisation Creation & SaaS Tiers
- [ ] **Name Uniqueness**: Use a Firestore Transaction with a `reservedOrgNames` collection.
- [ ] **Creation Limit**: Users can only be the `ownerId` of **one** organisation.
- [ ] **Pricing Tiers (NZD)**:
    - [ ] **Small ($9/mo)**: 30 Users, 3 Teams. (ENABLED)
    - [ ] **Medium ($24/mo)**: 100 Users, 10 Teams. (DISABLED)
    - [ ] **Large ($49/mo)**: Unlimited. (DISABLED)
- [ ] **Promotions**: 
    - [ ] 1-month automatic trial for all new Orgs.
    - [ ] `isSuperOrg` flag for your personal admin org (Unlimited Free).
    - [ ] Coupon/Promo code system for 6/12 month extensions.

---

## 🟢 3. Online Presence Logic (Scoped)
Presence must respect both Organisation and Team boundaries to ensure privacy and relevance.

### Visibility Rules:
1.  **Same Org + Same Team**: A and B see each other.
2.  **Same Org + Different Team**: A and B **DO NOT** see each other.
3.  **Different Org**: A and B **DO NOT** see each other.
4.  **Context Sensitivity**: 
    - If B is in TeamA roster, and A (who is in TeamA and TeamB) switches to TeamB roster, B should see A go "offline" or disappear from that specific context.
5.  **Admin Stealth**:
    - If Admin A is on an admin-only page, non-admin B **DO NOT** see A.
    - If Admin A and Admin B are both on admin pages, they **DO** see each other.

- [ ] **Implementation**: Refactor `usePresence` and `presenceSlice` to include `teamId` and `currentPath` in the heartbeat.

---

## 🧭 4. Navigation & UI
- [ ] **Org Switcher**: Popover in SideNav listing up to 3 orgs + "Show All" link.
- [ ] **Membership Management**: A page to view all enrolled organisations and "Leave" or "Switch" buttons.
- [ ] **Create Org Wizard**: Carousel-based plan selection with 1-month trial highlight.

---

## 📝 Task Checklist

### Phase A: Infrastructure Refactor
- [ ] Update `model.ts` with new `Member` and `Organisation` fields.
- [ ] Create `leaveOrganisation` logic in `authSlice`.
- [ ] Implement `activeOrgId` persistence in Redux.

### Phase B: Onboarding & Creation
- [ ] Build `CreateOrgStep` with Plan Carousel.
- [ ] Implement `reservedOrgNames` uniqueness check.
- [ ] Add `isSuperOrg` auto-detection for your email.

### Phase C: Presence Refinement
- [ ] Update Firebase Heartbeat to include `orgId` and `teamId`.
- [ ] Filter `OnlineUsers` component based on `activeOrgId` and `activeTeamId`.

### Phase D: Multi-Org UI
- [ ] Build the `OrgSwitcher` popover for SideNav.
- [ ] Create the "My Organisations" management page.

---

## ⚠️ Risks
- **Data Migration**: Existing users in the "Legacy Org" need to be moved to the new membership sub-collection.
- **Query Complexity**: Filtering online users by both Org and Team in real-time requires efficient indexing.

# GIG Roster: Strategic Roadmap

## 📜 Development Guidelines (Strict)
*These rules must be followed for all contributions to maintain code quality and scalability.*

- **Component First**: Always reuse existing common components. Create new ones only if a reusable pattern doesn't exist.
- **Refactoring is Core**: Never "bolt on" code. Clean structure over quick fixes.
- **Organisation-Scoped**: All new data must include an `orgId`.
- **Data Atomicity**: Avoid monolithic documents. Break data into the smallest queryable units (e.g., Team-Date vs. just Date).
- **Decentralized Auth**: Teams are managed by Creators/Admins, not just global Admins.

---

## 🏗 Phase 1: Scalable Foundation (Architecture)
- [x] **ID-Based Infrastructure**
- [x] **Data Migration**
- [x] **Granular Time Roster (Slotted Mode)**
- [x] **Team/Position Deletion Cleanup**

---

## 🏢 Phase 2: Multi-Tenancy & Data Atomicity
*Objective: Transform the flat app into a multi-tenant platform with isolated, performant data.*

### 🎯 Goals
- [x] **Organisation Entity**: Created `Organisation` model and scoped all data (Teams, Positions, Users, Thoughts).
- [x] **Atomic Roster Structure**: Refactored monolithic date documents into per-team-per-date documents (`organisations/{orgId}/roster/{teamId}_{date}`).
- [ ] **Organisation Onboarding**: Implement "Option A" - Invite Codes and Searchable Join Requests for new users.
- [ ] **Searchable Position Picker**: Refactor UI to use Autocomplete.

### 🛠 Implementation Guidelines
- [x] **Step 0: Preparation & Simplification (Minimize Effort)**:
    - [x] Clean up all remaining `id || name` fallbacks to rely strictly on stable UUIDs.
    - [x] **Abstract Data Access**: Ensure all components use `getAssignmentsForTeam` and `getAbsenceForUser` helpers instead of direct object indexing. This makes the storage structural change transparent to the UI.
    - [x] **Decouple Redux Sync**: Refactor `rosterSlice` to accept a `teamId` in every remote sync action, even before the database structure changes.
- [x] **Step 1: The Organisation Entity**:
    - [x] Define `Organisation` model in `model.ts`.
    - [x] Create `organisations` collection in Firestore.
    - [x] Add `orgId` to `AppUser` (mandatory).
- [x] **Atomic Roster Structure**:
    - **Old Path**: `roster/{date}` (Monolithic)
    - **New Path**: `organisations/{orgId}/roster/{teamId}_{date}` (Atomic)
    - This allows fetching only the specific team data needed and enables per-team security rules.
- [x] **Absence Decoupling**:
    - [x] Move `absence` data to its own collection: `organisations/{orgId}/absences/{userId}_{date}`.
    - This ensures a user's absence is Org-wide but doesn't bloat team roster documents.
- [x] **Scoped Data Migration**:
    - [x] Create a script to explode existing monolithic date docs into individual team-date docs.
    - [x] Assign all existing data to a default "Legacy Org".
- [ ] **Onboarding Flow (Option A)**:
    - **Guest Page**: Add search/input for "Join Organisation".
    - **Approval Pipeline**: Ensure unapproved users with an `orgId` appear in that Org's Admin dashboard.
- [ ] **UX Update**:
    - Replace "Pill Cloud" in `TeamPositionEditor` and `ProfileSettings` with a Searchable Multi-select.

---

## 🛡 Phase 3: Team Governance & Discovery
*Objective: Decentralized management where teams control their own membership.*

### 🎯 Goals
- **Team Authority**: Roles like `Creator`, `Admin`, and `Member`.
- **Visibility**: `Public` (Searchable in Org directory) vs `Private` (Invite only).
- **Discovery Flow**: Users request to join public teams; Admins approve/deny.
- **User Command Center**: Allow users to leave teams, browse public ones, and see their status.

### 🛠 Implementation Guidelines
- [ ] **Team Ownership Model**:
    - Add `creatorId` (string) and `admins` (string[]) to `Team` model.
    - Add `visibility` ('public' | 'private') to `Team` model.
- [ ] **Permissions Logic**:
    - Update `TeamEditModal` to only allow edits by Team Admins or the Creator.
- [ ] **The Discovery Flow**:
    - **Browse Page**: Create a view to list all `public` teams in the Org.
    - **Membership Workflow**: Implement `Request to Join` (new `requests` collection) and `Leave Team` logic.

---

## ⚠️ Risks & Solutions

| Risk | Impact | Solution |
| :--- | :--- | :--- |
| **Global Roster Leak** | High | Every query MUST include `orgId`. Use hierarchical paths (`organisations/{id}/roster/...`) to enforce this via Rules. |
| **Monolithic Bloat** | High | (Resolved by Data Atomicity) Moving to `{teamId}_{date}` docs prevents document size limits and slow loads. |
| **Position Duplication** | Medium | Use Searchable Picker to check Org pool before allowing new position creation. |
| **Migration Complexity** | Medium | Use a "Shadow Write" strategy where new data writes to both old and new structures during transition. |

---

## ✅ Completed Recently
- [x] **Slotted Mode UI Refinements**: Unified layout, fixed 24h rollover, and 2x2 grid for events.
- [x] **Absence Settings Cleanup**: Simplified UI with direct toggle integration.
- [x] **Granular Time Roster (Slotted Mode)**: Functional implementation complete.
- [x] **Team/Position Deletion Cleanup**: Dead data is now scrubbed from user profiles.
- [x] **Settings Table Borders**: Improved visual hierarchy with sticky headers and specific border logic.

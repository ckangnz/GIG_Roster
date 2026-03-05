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
- [x] **Internationalization (i18n)**: Multi-language support (English NZ, Korean) with user preference.
- [x] **Organisation Onboarding**:
    - [x] **Step 1: Profile Setup**: User provides Name and Gender (Male/Female/Undefined).
    - [x] **Step 2: Selection**: "Join Organisation" (Search with autocomplete, min 3 chars) or "Create Organisation" (Disabled).
    - [x] **Step 3: Approval**: User remains in Guest state until specific Org Admin approves them.
- [x] **Searchable Position Picker**: Refactor UI to use Autocomplete.

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
- [x] **Onboarding Flow (Option A)**:
    - [x] **Guest Page**: Add search/input for "Join Organisation".
    - [x] **Approval Pipeline**: Ensure unapproved users with an `orgId` appear in that Org's Admin dashboard.
- [x] **UX Update**:
    - [x] Replace "Pill Cloud" in `TeamPositionEditor` and `ProfileSettings` with a Searchable Multi-select.

- [ ] Organisation selection
  - the user should be able to click on Organisation identifier button on the sidenav title.
    - the side nav title should be 
    - tablet: [OrgIcon] [Tab.NavName] [Collapse (if on tablet view)]
    - mobile: [OrgIcon] [Tab.NavName] [ThemeSelector] [OnlineIndicator]
  - on clicking OrgIcon, it should show a popover, showing list of orgs the user is listed in. (max 3)
      - on selecting org from the popover, it should change their org
      - it should have 'show all' button if more than 3. This should take the user to a page that shows all orgs they're enrolled in a table view. Clicking Change button changes their current org
      - it should also have manage org button. This should take the user to either join or create org(Disabled for now)

- [x] Online indicator is scoped to organisation > team. it should only show the users that are within the same org and have been assigned/enrolled to the same team. 
  - [x] if A is assigned to TeamA and TeamB, and B is only assigned to TeamA, both should see each other
  - [x] if A is assigned to TeamA and B is assigned to TeamB, they shouldn't see each other
  - [x] if A is assigned to OrgA.TeamA and B is assigned to OrgB.TeamB, they shouldn't see each other
  - [x] if A is assigned to TeamA and TeamB, and B is only assigned to TeamA, and if B clicks on A when he's in TeamA roster, B should not be able to see A anymore (because A is in a place B is not allowed)
  - [x] if A is an admin, and is on admin only page, and B is not an admin, B shouldn't be able to see A anymore.
  - [x] if A is an admin, and B is also an admin, they should be able to see each other when they're on admin only settings page



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

## 💰 Phase 4: SaaS & Monetization
*Objective: Transform the platform into a sustainable service.*

### 🎯 Goals
- **Tiered Planning**: 
    - **Free Tier**: Limited users/teams, Google AdSense visible on Roster tables.
    - **Standard/Premium**: Subscription-based per user/team volume.
- **Promo System**: Support for "Free for a year" codes or X-months-free event vouchers.
- **Org Creation Flow**: Enable the "Create Organisation" wizard with payment/tier selection.

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

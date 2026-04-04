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
    - [x] **Step 2: Selection**: "Join Organisation" (Search with autocomplete, min 3 chars) or "Create Organisation".
    - [x] **Step 3: Approval**: User remains in Guest state until specific Org Admin approves them.
- [x] **Searchable Position Picker**: Refactor UI to use Autocomplete.
- [x] **Organisation Management (Settings Page)**: Users can switch org, create org, update org, and delete org from the Settings page.
- [x] **Online Indicator**: Scoped to organisation > team. Only shows users within the same org assigned to overlapping teams.

### 🛠 Implementation Guidelines
- [x] **Step 0: Preparation & Simplification**
- [x] **Step 1: The Organisation Entity**
- [x] **Atomic Roster Structure**
- [x] **Absence Decoupling**: `organisations/{orgId}/absences/{userId}_{date}`
- [x] **Scoped Data Migration**
- [x] **Onboarding Flow**
- [x] **UX Update**: Searchable Multi-select for TeamPositionEditor and ProfileSettings

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

## 🧱 Phase 4: Resilience & New Member Experience
*Objective: Make the app robust and welcoming for new orgs and new members.*

### 🎯 Goals

#### Error Boundaries
- [ ] Add a top-level React error boundary that catches unhandled component errors.
- [ ] Show a friendly "Something went wrong — reload" UI instead of a blank crash screen.
- [ ] Optionally scope boundaries per page/tab so a crash in one tab doesn't kill the whole app.

#### Empty State for New Orgs
- [ ] When a new org is created with zero teams/positions, show a guided empty state instead of a blank roster.
- [ ] "Set up your first team" wizard flow — walks the admin through creating a team, adding positions, and inviting members.
- [ ] Per-tab empty states: Roster, Thoughts, Dashboard should each have contextual empty states with clear calls-to-action.

#### Team Notice Board / Description
- [ ] Add a `description` field to the `Team` model (rich text / markdown).
- [ ] Surface this as a collapsible "Notice Board" panel at the top of the team roster view.
- [ ] Admins can edit it; all members can read it.
- [ ] Use cases: onboarding docs, welcome message, team rules, guidelines, weekly notices.
- [ ] Consider a "pinned" flag so important notices stay visible.

---

## 📋 Phase 5: Date Attachments & Team Content
*Objective: Let teams attach context, setlists, and documents to specific roster dates.*

### 🎯 Goals

#### Date-Level Attachments (per Team)
- [ ] Allow teams to attach content to a specific date on their roster.
- [ ] **Text / Setlist**: A simple text/rich-text field (e.g. song list, running order, notes).
    - Stored at `organisations/{orgId}/rosterMeta/{teamId}_{date}`.
    - Real-time collaborative editing (Firestore onSnapshot).
- [ ] **File Uploads**: Upload PDFs, images, or documents to a date.
    - Use Firebase Storage: `organisations/{orgId}/attachments/{teamId}/{date}/{filename}`.
    - Display as a list of downloadable attachments on the roster date card.
    - ⚠️ Firebase Storage costs: Free tier includes 5GB storage + 1GB/day download. Monitor usage.
- [ ] **PDF Viewer**: In-app PDF viewer (e.g. `react-pdf`) so members don't need to download.
- [ ] **Collaborative PDF Annotation** *(Stretch goal — complex)*:
    - Real-time annotation/notes on PDF using Apple Pencil or touch input.
    - Would require a dedicated annotation layer (e.g. Fabric.js or PDF.js + custom canvas).
    - Data stored as annotation JSON in Firestore alongside the PDF reference.
    - ⚠️ High complexity — evaluate after simpler attachment features are stable.

---

## 📊 Phase 6: Analytics & Milestones
*Objective: Celebrate participation, surface insights, and build community identity.*

### 🎯 Goals

#### Per-Person Analytics
- [ ] **Roster Activity**: How many times each person has been rostered per position, per team, per month/year.
- [ ] **Absence Rate**: Absences vs. total rostered days (shown sensitively — not punitive).
- [ ] **Thoughts Engagement**: How active a member is on the Thoughts page (posts, hearts given/received).
- [ ] **Coverage Hero**: Track how often a member stepped up to cover someone else's slot.

#### Analytics Dashboard
- [ ] Per-person analytics card (viewable by self + admins).
- [ ] Org-wide leaderboard / participation summary (opt-in, admin-configurable).
- [ ] Team-level analytics: most active day, busiest positions, coverage request trends.
- [ ] Date range filters: weekly, monthly, yearly.

#### Milestones & Sharing
- [ ] Define milestone events: "First roster", "50th service", "1 year streak", "Most hearts this month", etc.
- [ ] Generate a shareable milestone card (image/PNG) that members can save or share.
- [ ] In-app milestone feed: celebrate achievements in a dedicated section or as a toast/notification.
- [ ] Admin can configure which milestones are active for their org.

---

## 💰 Phase 7: SaaS & Monetization
*Objective: Transform the platform into a sustainable service.*

### 🎯 Goals
- **Tiered Planning**:
    - **Free Tier**: Limited users/teams, Google AdSense visible on Roster tables.
    - **Standard/Premium**: Subscription-based per user/team volume. Unlocks attachments, analytics, and advanced features.
- **Promo System**: Support for "Free for a year" codes or X-months-free event vouchers.
- **Org Creation Flow**: Enable the "Create Organisation" wizard with payment/tier selection.

---

## ⚠️ Risks & Solutions

| Risk | Impact | Solution |
| :--- | :--- | :--- |
| **Global Roster Leak** | High | Every query MUST include `orgId`. Use hierarchical paths (`organisations/{id}/roster/...`) to enforce this via Rules. |
| **Monolithic Bloat** | High | (Resolved by Data Atomicity) Moving to `{teamId}_{date}` docs prevents document size limits and slow loads. |
| **Position Duplication** | Medium | Use Searchable Picker to check Org pool before allowing new position creation. |
| **Firebase Storage Costs** | Medium | File uploads use Firebase Storage. Free tier: 5GB / 1GB download per day. Gate behind paid plan tier. |
| **PDF Annotation Complexity** | High | Treat as a stretch goal only after basic attachment/viewer is stable. Requires canvas rendering + Firestore sync. |
| **Analytics Data Volume** | Medium | Aggregate on write (increment counters) rather than scanning all roster docs on read. |
| **Migration Complexity** | Medium | Use a "Shadow Write" strategy where new data writes to both old and new structures during transition. |

---

## ✅ Completed Recently
- [x] **Code Cleanup**: Removed dead code, unused Redux exports, noisy comments. Added Prettier pre-commit hook via husky.
- [x] **Organisation Management**: Switch, create, update, delete org — all from the Settings page.
- [x] **Online Indicator Scoping**: Presence scoped to org > overlapping teams. Admin-only page awareness.
- [x] **Slotted Mode UI Refinements**: Unified layout, fixed 24h rollover, and 2x2 grid for events.
- [x] **Absence Settings Cleanup**: Simplified UI with direct toggle integration.
- [x] **Granular Time Roster (Slotted Mode)**: Functional implementation complete.
- [x] **Team/Position Deletion Cleanup**: Dead data is now scrubbed from user profiles.
- [x] **Settings Table Borders**: Improved visual hierarchy with sticky headers and specific border logic.

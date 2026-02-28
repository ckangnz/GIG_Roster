# GIG Roster: Strategic Roadmap

## 📜 Development Guidelines (Strict)
*These rules must be followed for all contributions to maintain code quality and scalability.*

- **Component First**: Always reuse existing common components. Create new ones only if a reusable pattern doesn't exist.
- **Refactoring is Core**: Never "bolt on" code. Refactor existing logic to support new features cleanly.
- **No Inline Styles**: All styling must reside in `.module.css` files.
- **Modular CSS**: Transition any legacy global CSS into module CSS without breaking existing visuals.
- **Clean Structure**: Maintain a logical, flat, and intuitive folder structure.
- **Minimal Comments**: Code should be self-documenting. Remove unnecessary comments; keep only high-value "why" notes if requested.
- **Theme-Only Colors**: NEVER hardcode hex/rgb values. Use existing CSS variables from the theme engine.
- **Dynamic Roadmap**: Update this file immediately as tasks are completed or new requirements emerge.
- **Branch Strategy**: Always perform large features or structural changes on a new branch.

---

## 🏗 Phase 1: Scalable Foundation (Architecture)
*Objective: Stabilize the data model before multi-tenancy complicates it.*

- [x] **ID-Based Infrastructure**: Updated models, hooks, and slices to support stable IDs.
- [x] **Data Migration**: Run script/manual save to populate `id` fields in production metadata.
- [x] **Legacy Cleanup**: Remove name-as-ID fallback logic once migration is verified.
- [x] **Granular Time Roster (Slotted Mode)**: Refactor Roster model to support sub-day shifts (e.g., 15-min intervals).
- [x] **Team/Position Deletion Cleanup**: Dead data is now scrubbed from user profiles upon deletion.

---

## 🏢 Phase 2: Multi-Tenancy & Organisation Layer
*Objective: Establish the root entities to support multiple independent groups.*

### 🎯 Goals
- Create `Organisation` entity (Name, Owner, Settings).
- Add `orgId` to `AppUser`, `Team`, and `Position`.
- Move from "System Global" to "Org Global" positions.
- **Searchable Position Picker**: Refactor UI to use Autocomplete instead of listing all pills.

### 🛠 Implementation Guidelines
- [ ] **The Organisation Entity**:
    - Define `Organisation` model in `model.ts`.
    - Create `organisations` collection in Firestore.
    - Add `orgId` to `AppUser` (mandatory).
- [ ] **SaaS Management Strategy**:
    - Each Team will have a `Creator` (Owner) and `Team Admins`.
    - Teams can be `Public` (Searchable) or `Private` (Invite-only).
- [ ] **Membership & Join Request Flow**:
    - Implement a "Join Team" request system where Team Admins approve/deny.
    - Users can browse and search for public teams within their Organisation.
- [ ] **Scoped Data Migration**:
    - Create a one-time migration script.
    - Move `metadata/teams` and `metadata/positions` to `organisations/{orgId}/metadata`.
    - Add `orgId` field to every document in the `roster` collection.
- [ ] **Redux/Logic Scoping**:
    - Update `authSlice` to fetch Organisation data on login.
    - Update `teamsSlice`, `positionsSlice`, and `rosterSlice` to filter by `orgId`.
- [ ] **UX Update**:
    - Replace "Pill Cloud" in `TeamPositionEditor` and `ProfileSettings` with a Searchable Multi-select.
    - Allow "Quick Create" for new positions directly from the search field if not found in Org pool.

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
    - Ensure `Creator` can invite users and assign/revoke `Team Admin` roles.
- [ ] **The Discovery Flow**:
    - **Browse Page**: Create a view to list all `public` teams in the Org.
    - **Membership Workflow**: Implement `Request to Join` (new `requests` collection) and `Leave Team` logic.
- [ ] **Invitation System**: Allow Team Admins to generate invite links or send invites to specific Org users.

---

## ⚙️ Phase 4: Advanced Logic & Configuration
*Objective: Flexible rules for diverse team needs.*

- [ ] **Custom Roster Enhancement**:
    - **Unique IDs**: Generate UUIDs for "fake" users/groups in custom rosters.
    - **Hybrid Assignment**: Allow both real users and custom entries in the same roster.
- [ ] **Configurable Absence Logic**: 
    - Toggle per Org/Team: "Auto-Approve Absence" vs "Require Admin Approval".
- [ ] **Scalable "Thoughts" Engine**: 
    - **Refactor**: Feed/Grid view for large teams (>50 members).
    - **Interaction**: Configurable "Like Expiry" (daily reset).
- [ ] **Position Constraints**: Define "Minimum Required" counts per slot.

---

## 🚀 Phase 5: Production & Scale
*Objective: Professional hosting and high-value analytics.*

- [ ] **Personal Statistics**: Attendance heatmaps, role distribution, social engagement metrics.
- [ ] **AI / MCP Auto-Roster**: Chat agent for natural language assignments and "One-Click Draft".
- [ ] **Collaborative File Hub**: PDF upload with live annotation/markup.
- [ ] **Infrastructure Migration**: 
    - Migrate from GitHub Pages to AWS S3 + CloudFront (or Vercel).
    - Purchase and configure custom domain (SSL/TLS).
- [ ] **Native PWA Push**: Robust notification system for approvals and urgent coverage needs.

---

## ⚠️ Risks & Solutions

| Risk | Impact | Solution |
| :--- | :--- | :--- |
| **Global Roster Leak** | High | Every query MUST include `where('orgId', '==', userOrgId)`. Enforce via Firestore Security Rules. |
| **Position Duplication** | Medium | Use Searchable Picker to check Org pool before allowing new position creation. |
| **Orphaned Teams** | Low | Implement "Auto-promote next Admin" logic if a Creator leaves. |
| **UX Complexity** | Medium | Gradual roll-out: Keep "Join Team" simple while implementing the "Request/Approve" backend. |

---

## ✅ Completed Recently
- [x] **Granular Time Roster (Slotted Mode)**: Functional implementation complete.
- [x] **Team/Position Deletion Cleanup**: Dead data is now scrubbed from user profiles upon deletion.
- [x] **Shift Swap / Coverage Marketplace (Self-Cleaning)**
- [x] **Firestore Security Rules (Registration Fixed)**
- [x] **Global Undo System (Ctrl+Z)**
- [x] **Conflict Detection Visuals**
- [x] **iOS Midnight Theme & Gender-Aware Styling**

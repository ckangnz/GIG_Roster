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
- [x] **Granular Time Roster**: Refactor Roster model to support sub-day shifts (e.g., 15-min intervals). *Note: Implementation complete, pending production review.*

---

## 🏢 Phase 2: Multi-Tenancy & User Journey (The SaaS Pivot)
*Objective: Support multiple organizations with distinct billing and governance.*

- [ ] **Organisation Root Entity**: Implement `Organisation` model. All data queries become scoped by `orgId`.
- [ ] **New User Onboarding**: 
    - **Flow**: Login -> "Join Existing Org" (via Invite Code) OR "Create New Org".
    - **Approval System**: Joining requires Org Admin approval (Notification via In-App + Email/Push).
- [ ] **Monetization Infrastructure**:
    - **Free Tier**: AdSense integration for non-paying orgs. Limited users/teams.
    - **Pro Tier**: Ad-free, unlimited history, advanced analytics.
    - **Limits**: Enforce user count limits per tier (e.g., Free = 50 users).
- [ ] **Public vs. Private Teams**: 
    - **Private**: Invite-only within the Org.
    - **Public**: Open to anyone in the Org.

---

## ⚙️ Phase 3: Advanced Logic & Configuration
*Objective: Flexible rules for diverse team needs.*

- [ ] **Custom Roster Enhancement**:
    - **Unique IDs**: Generate UUIDs for "fake" users/groups in custom rosters (currently uses raw text).
    - **Cleanup**: Ensure deleting a custom entry removes it from all dates.
- [ ] **Mixed Roster Type**:
    - **Hybrid Assignment**: Allow both real users (auth) and custom entries (fake users) in the same roster.
    - **Merge Flow**: "Claim" or "Merge" feature to convert a custom entry into a real user profile (e.g., when "James" finally signs up).
- [ ] **Configurable Absence Logic**: 
    - Toggle per Org/Team: "Auto-Approve Absence" vs "Require Admin Approval".
- [ ] **Scalable "Thoughts" Engine**: 
    - **Refactor**: Move from "Wheel" UI to a "Feed/Grid" for teams >50 members.
    - **Interaction**: Configurable "Like Expiry" (e.g., daily reset to encourage engagement).
    - **Controls**: Org-level toggle to enable/disable Thoughts entirely.
- [ ] **Position Constraints**: Define "Minimum Required" counts per slot.

---

## 📊 Phase 4: Intelligence, Analytics & Collaboration
*Objective: High-value features for Pro users.*

- [ ] **Personal Statistics**: Attendance heatmaps, role distribution, social engagement metrics.
- [ ] **AI / MCP Auto-Roster**: Chat agent for natural language assignments and "One-Click Draft".
- [ ] **Collaborative File Hub**: PDF upload with live annotation/markup.
- [ ] **Advanced Event Metadata**: Detailed run sheets per date.

---

## 🚀 Phase 5: Production & Scale
*Objective: Professional hosting and domain management.*

- [ ] **Infrastructure Migration**: 
    - Migrate from GitHub Pages to AWS S3 + CloudFront (or Vercel/Netlify for easier CI/CD).
    - Purchase and configure custom domain (SSL/TLS).
- [ ] **Native PWA Push**: Robust notification system for approvals and urgent coverage needs.

---

## ✅ Completed Recently
- [x] **Shift Swap / Coverage Marketplace (Self-Cleaning)**
- [x] **Firestore Security Rules (Registration Fixed)**
- [x] **Global Undo System (Ctrl+Z)**
- [x] **Conflict Detection Visuals**
- [x] **iOS Midnight Theme & Gender-Aware Styling**
- [x] **Granular Time Roster (Slotted Mode)**: Functional implementation complete. (Awaiting production review)

# 🚀 Real-Time Collaboration & Presence Roadmap

This plan outlines the transition from a "Stage and Save" model to an "Instant Sync" model, ensuring multiple users can work together without overwriting data.

---

## 🟢 Phase 1: Real-Time Roster (Logic)
**Goal:** Eliminate the "Save" button. Move to field-level updates to prevent data loss between multiple admins.

### 1. Atomic Firestore Writes
- [ ] Implement **Firestore Dot Notation** for updates.
  - *Logic:* Instead of `setDoc` (whole day), use `updateDoc` for specific fields: `updateDoc(doc, { "teams.Worship.user@email_com": ["Vocal"] })`.
- [ ] Refactor `rosterSlice.ts` to remove `dirtyEntries` buffer.
- [ ] Create AsyncThunks for direct writes:
  - `toggleAssignment`: Updates specific user assignments.
  - `updateAbsence`: Updates specific absence records.
  - `updateEventName`: Updates the day's title.

### 2. Optimistic UI Updates
- [ ] Implement local state updates in Redux before Firestore confirms the write.
- [ ] Add "Saving..." / "Saved" status indicators in the `TopControls` or Header.
- [ ] Remove `SaveFooter.tsx` and `handleCancel` logic from all roster views.

---

## 🔵 Phase 2: Flying Cursors (Visual Presence)
**Goal:** Visualize which cells are being focused on by other users using the existing `sessionColor` system.

### 1. Focus Tracking Logic
- [ ] Update `presenceSlice.ts` and `presence` collection schema to include a `focus` object:
  ```json
  {
    "focus": {
      "type": "roster",
      "date": "2026-02-19",
      "userEmail": "john@doe.com"
    }
  }
  ```
- [ ] Modify `useTrackPresence` to accept and broadcast the current focus state.
- [ ] Add `onFocus` and `onBlur` listeners to `RosterCell.tsx` to update Redux/Firestore (debounced).

### 2. Remote Cursor Rendering
- [ ] Create a `RemoteCursor.tsx` indicator.
- [ ] Update `RosterCell.tsx` to subscribe to the `presence` state.
- [ ] Render a colored border (using `user.color`) around cells that match another user's focus.
- [ ] Add a floating name tag above the focused cell on hover.

---

## 🔴 Phase 3: Real-Time Settings (Architecture)
**Goal:** Allow concurrent editing of Teams and Positions by changing the data structure.

### 1. Data Migration
- [ ] Move `metadata/teams` (Array) to a `teams` **Collection**.
  - *Reason:* Multiple users cannot safely edit different items in a single array simultaneously.
- [ ] Move `metadata/positions` (Array) to a `positions` **Collection**.

### 2. Refactor Settings UI
- [ ] Update `useAppListeners.ts` to use `onSnapshot` on the new collections.
- [ ] Update `TeamManagement.tsx` and `PositionManager.tsx` to perform immediate `updateDoc` or `deleteDoc` calls on individual items.
- [ ] Implement "Edit Locking": If User A is editing Team X, show User B that the inputs for Team X are currently "busy."

---

## 🛠 Technical Notes
*   **Firestore SDK:** Ensure we keep the hardened listener logic to prevent the `ID: b815` assertion error during rapid focus changes.
*   **Cost Management:** Keep focus updates debounced (e.g., 500ms) to stay within the Firebase free tier.
*   **Sorting:** Since data will now be in collections (Phase 3), ensure the frontend handles the `order` field for consistent display.

---

## ✅ Progress Summary
*   [x] Responsive Peek Header.
*   [x] Multi-session Presence with Colors.
*   [x] Automated Absence conflict resolution.
*   [x] Global Confirmation Modal.
*   [x] Modular Roster Architecture.
*   [ ] **Next Up:** Phase 1 - Atomic Roster Writes.

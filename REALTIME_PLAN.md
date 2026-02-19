# 🚀 Real-Time Collaboration & Presence Roadmap

This plan outlines the transition from a "Stage and Save" model to an "Instant Sync" model, ensuring multiple users can work together without overwriting data.

---

## ✅ Phase 1: Real-Time Roster (Logic) - DONE
**Goal:** Eliminate the "Save" button. Move to field-level updates to prevent data loss between multiple admins.

### 1. Atomic Firestore Writes
- [x] Implement **Firestore Dot Notation** for updates.
- [x] Refactor `rosterSlice.ts` to remove `dirtyEntries` buffer.
- [x] Create AsyncThunks for direct writes:
  - `updateAssignmentRemote`: Updates specific user assignments.
  - `updateAbsenceRemote`: Updates specific absence records.
  - `updateEventNameRemote`: Updates the day's title.

### 2. Optimistic UI Updates
- [x] Implement local state updates in Redux before Firestore confirms the write.
- [x] Add "Syncing..." status indicators.
- [x] Remove `SaveFooter.tsx` and `handleCancel` logic from all roster views.

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
      "userEmail": "john@doe.com",
      "colId": "Vocal"
    }
  }
  ```
- [ ] Modify `usePresence` hook to accept and broadcast the current focus state.
- [ ] Add `onFocus` listeners to `RosterCell.tsx` to update Redux/Firestore (debounced).

### 2. Remote Cursor Rendering
- [ ] Create a `RemoteCursor.tsx` indicator or border effect.
- [ ] Update `RosterCell.tsx` to subscribe to the `presence` state.
- [ ] Render a colored border (using `user.color`) around cells that match another user's focus.
- [ ] Add a floating name tag above the focused cell on hover.

---

## 🔴 Phase 3: Real-Time Settings (Architecture)
**Goal:** Allow concurrent editing of Teams and Positions by changing the data structure.

### 1. Data Migration
- [ ] Move `metadata/teams` (Array) to a `teams` **Collection**.
- [ ] Move `metadata/positions` (Array) to a `positions` **Collection**.

### 2. Refactor Settings UI
- [ ] Update `useAppListeners.ts` to use `onSnapshot` on the new collections.
- [ ] Update `TeamManagement.tsx` and `PositionManager.tsx` to perform immediate `updateDoc` or `deleteDoc` calls on individual items.
- [ ] Implement "Edit Locking" or "Busy" indicators for settings fields.

---

## ✅ Progress Summary
*   [x] Responsive Peek Header.
*   [x] Multi-session Presence with Colors.
*   [x] Automated Absence conflict resolution.
*   [x] Modular Roster Architecture.
*   [x] **Phase 1: Real-Time Logic (Roster)**.
*   [ ] **Next Up:** Phase 2 - Visual Cursors.

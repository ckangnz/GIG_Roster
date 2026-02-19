# 🚀 Real-Time Collaboration & Presence Roadmap

This plan outlines the transition from a "Stage and Save" model to an "Instant Sync" model, ensuring multiple users can work together without overwriting data.

---

## ✅ Phase 1: Real-Time Roster (Logic) - DONE
**Goal:** Eliminate the "Save" button. Move to field-level updates to prevent data loss between multiple admins.

### 1. Atomic Firestore Writes
- [x] Implement **Firestore Dot Notation** for updates.
- [x] Refactor `rosterSlice.ts` to remove `dirtyEntries` buffer.
- [x] Create AsyncThunks for direct writes:
  - `syncAssignmentRemote`: Updates specific user assignments.
  - `syncAbsenceRemote`: Updates specific absence records.
  - `syncEventNameRemote`: Updates the day's title.

### 2. Optimistic UI Updates
- [x] Implement local state updates in Redux before Firestore confirms the write.
- [x] Add "Syncing..." status indicators.
- [x] Remove `SaveFooter.tsx` and `handleCancel` logic from all roster views.

---

## ✅ Phase 2: Flying Cursors (Visual Presence) - DONE
**Goal:** Visualize which cells are being focused on by other users using the existing `sessionColor` system.

### 1. Focus Tracking Logic
- [x] Update `uiSlice.ts` to include global `focusedCell` state.
- [x] Update `presence` collection schema to include a `focus` object:
  ```json
  {
    "focus": {
      "date": "2026-02-19",
      "identifier": "john@doe.com",
      "teamName": "Worship"
    }
  }
  ```
- [x] Modify `useTrackPresence` hook to broadcast the current focus state (debounced).
- [x] Refactor `useRosterBaseLogic.ts` to use Redux-based focus tracking.

### 2. Remote Cursor Rendering
- [x] Create `remoteCursorBorder` and `remoteCursorBadge` styles.
- [x] Update `RosterCell.tsx` to subscribe to the `presence` state.
- [x] Render a colored border (using `user.color`) around cells that match another user's focus.
- [x] Add a floating name tag badge above the focused cell.

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
*   [x] **Phase 2: Flying Cursors (Visual Presence)**.
*   [ ] **Next Up:** Phase 3 - Real-Time Settings.

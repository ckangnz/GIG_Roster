# Implementation Checklist - Redux + Router + Roster

## Phase 1: Foundation (Week 1)

### Step 1.1: Add models to `src/model/model.ts`
- [ ] Add `RosterEntry` interface
- [ ] Add `Absence` interface
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 1.2: Create Redux store structure
- [ ] Create `src/store/index.ts`
- [ ] Install deps: `@reduxjs/toolkit`, `react-redux`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 1.3: Create auth slice
- [ ] Create `src/store/slices/authSlice.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 1.4: Create auth middleware
- [ ] Create `src/store/middleware/authMiddleware.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 1.5: Create Redux hooks
- [ ] Create `src/hooks/redux.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 1.6: Create router
- [ ] Install: `react-router-dom`
- [ ] Create `src/router/routes.tsx`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 1.7: Update entry point
- [ ] Update `src/main.tsx` with Provider + RouterProvider
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

---

## Phase 2: Navigation State (Week 2)

### Step 2.1: Create UI slice
- [ ] Create `src/store/slices/uiSlice.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 2.2: Create UI selectors
- [ ] Create `src/store/selectors/uiSelectors.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 2.3: Update App.tsx
- [ ] Remove 4 useState hooks
- [ ] Add `useAppDispatch`, `useAppSelector`
- [ ] Add `Outlet` component
- [ ] Dispatch metadata fetches
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 2.4: Update MainLayout.tsx
- [ ] Remove all props except children
- [ ] Add URL ↔ Redux sync logic
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 2.5: Update SideNav.tsx
- [ ] Remove useAuth hook call
- [ ] Use Redux selectors instead
- [ ] Use `useNavigate` instead of callbacks
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

---

## Phase 3: Metadata Caching (Week 3)

### Step 3.1: Create teams slice
- [ ] Create `src/store/slices/teamsSlice.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 3.2: Create teams selectors
- [ ] Create `src/store/selectors/teamsSelectors.ts`
- [ ] Add memoized selectors
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 3.3: Create positions slice
- [ ] Create `src/store/slices/positionsSlice.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 3.4: Create positions selectors
- [ ] Create `src/store/selectors/positionsSelectors.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 3.5: Update ProfileSettings
- [ ] Remove fetch logic
- [ ] Use Redux selectors for teams
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 3.6: Update UserManagement
- [ ] Remove fetch logic
- [ ] Use Redux selectors
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 3.7: Update TeamManagement
- [ ] Remove fetch logic
- [ ] Use Redux selectors
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 3.8: Update PositionManager
- [ ] Remove fetch logic
- [ ] Use Redux selectors
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

---

## Phase 4: Roster Pages (Week 4)

### Step 4.1: Create roster slice
- [ ] Create `src/store/slices/rosterSlice.ts`
- [ ] Keep existing functionality (users by position)
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 4.2: Create roster selectors
- [ ] Create `src/store/selectors/rosterSelectors.ts`
- [ ] Add memoized selectors
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 4.3: Create rostDataSlice
- [ ] Create `src/store/slices/rosterDataSlice.ts`
- [ ] Add thunks for fetching/updating
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 4.4: Create rosterData selectors
- [ ] Create `src/store/selectors/rosterDataSelectors.ts`
- [ ] Add memoized selectors
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 4.5: Update RosterPage
- [ ] Use URL params (useParams)
- [ ] Use Redux selectors
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 4.6: Update RosterTable
- [ ] Display assignments from Redux
- [ ] Display absence reasons
- [ ] Remove fetch logic
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

---

## Phase 5: Settings Pages (Week 5)

### Step 5.1: Create userManagement slice
- [ ] Create `src/store/slices/userManagementSlice.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 5.2: Create theme slice
- [ ] Create `src/store/slices/themeSlice.ts`
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 5.3: Update SettingsPage routing
- [ ] Use URL params
- [ ] Route to correct section
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 5.4: Update ThemeToggleButton
- [ ] Use Redux instead of context
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

### Step 5.5: Create export index for selectors
- [ ] Create `src/store/selectors/index.ts`
- [ ] Export all selectors
- [ ] Lint check ✓
- [ ] Typecheck ✓
- [ ] Review & Approve

---

## Phase 6: Final Polish (Week 6)

### Step 6.1: Test all features
- [ ] Login works
- [ ] Navigation works
- [ ] Roster displays correctly
- [ ] Settings pages work
- [ ] All URLs work (bookmarks, back button)
- [ ] No console errors

### Step 6.2: Performance verification
- [ ] Redux DevTools shows clean state
- [ ] No unnecessary re-renders
- [ ] Firestore calls reduced

### Step 6.3: Cleanup
- [ ] Remove unused imports
- [ ] Remove old code (useAuth from non-root places)
- [ ] Final lint check
- [ ] Final typecheck

---

## Running Checks

### After each step:
```bash
# Check for lint errors
npm run lint

# Check for TypeScript errors
npm run typecheck

# If tests exist
npm test
```

### What we're looking for:
- No ESLint errors
- No TypeScript errors
- No unused variables
- No import errors

---

## Commit Strategy

After each completed step:
1. Run lint + typecheck
2. Wait for your review
3. You approve changes
4. Then proceed to next step

This prevents breaking changes and allows verification at each stage.

---

## Notes

- Reuse existing patterns (no duplication)
- Clean code (no inline comments)
- Small, focused changes
- One thing at a time
- Verify each step works

Ready to start? We'll begin with **Step 1.1: Add models**

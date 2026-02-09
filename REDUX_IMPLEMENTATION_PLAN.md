# Redux Implementation Plan for GIG Roster

## Current Architecture Analysis

### **Current State Management Issues**

#### 1. **Prop Drilling Problem**
- `activeTab`, `activeTeamName`, `activeSideItem` passed through:
  - `App.tsx` → `MainLayout.tsx` → `SideNav.tsx` (5+ levels)
  - Multiple callbacks being passed: `onTabChange`, `onActiveSelectionChange` chained through levels
  - This causes unnecessary re-renders of intermediate components

#### 2. **Data Management Fragmentation**
Multiple components independently fetch the same data:
- **Teams data** fetched in:
  - `SideNav.tsx` (line 63)
  - `RosterTable.tsx` (line 124)
  - `ProfileSettings.tsx` (line 36)
  - `UserManagement.tsx` (line 28)
  - `TeamManagement.tsx` (line 36)

- **Positions data** fetched in:
  - `ProfileSettings.tsx` (via useComputedPositions hook)
  - `UserManagement.tsx` (line 28)
  - `TeamManagement.tsx` (line 30)
  - `PositionManager.tsx` (line 37)

- **Users by position** fetched in:
  - `RosterTable.tsx` (line 84)

#### 3. **Re-rendering Problems**
- **App.tsx** rerenders entire tree when activeTab/activeSideItem changes
- **SideNav.tsx** calls `useAuth()` separately, causing double subscription
- **RosterTable.tsx** fetches fresh data on every position change
- **SettingsPage** rerenders all tab content
- Theme toggle in `SideNav` might cause full layout rerenders

#### 4. **Data Inconsistency**
- Each component maintains its own loading/error state
- No single source of truth for team/position data
- Race conditions possible when same data is updated in different pages
- No normalization of fetched data

---

## Proposed Redux Store Structure

```typescript
{
  // Authentication & User Data
  auth: {
    firebaseUser: User | null,           // Firebase Auth user
    userData: AppUser | null,            // App user profile
    loading: boolean,
    isAuthenticated: boolean
  },

  // Global UI State
  ui: {
    activeTab: string,                   // AppTab.ROSTER | AppTab.SETTINGS
    activeSideItem: string | null,       // position/settings name
    activeTeamName: string | null,       // selected team
    isMobileSidebarOpen: boolean,
    isDesktopSidebarExpanded: boolean
  },

  // Teams Data (Metadata)
  teams: {
    list: Team[],
    loading: boolean,
    error: string | null,
    expandedTeams: Set<string>           // which teams expanded in sidebar
  },

  // Positions Data (Metadata)
  positions: {
    list: Position[],
    loading: boolean,
    error: string | null
  },

  // Roster Page Data
  roster: {
    users: AppUser[],                    // users in selected position
    rosterDates: Date[],                 // upcoming dates for selected team
    currentTeamData: Team | null,        // detailed data of active team
    loadingUsers: boolean,
    loadingTeam: boolean,
    error: string | null
  },

  // User Management Page Data
  userManagement: {
    allUsers: (AppUser & { id: string })[],
    availableTeams: Team[],              // cached from teams
    loading: boolean,
    error: string | null,
    hasChanges: boolean
  },

  // Theme
  theme: {
    mode: 'light' | 'dark'
  }
}
```

---

## Implementation Strategy

### **Phase 1: Setup Redux Infrastructure**

1. **Install Dependencies**
   ```bash
   npm install redux react-redux @reduxjs/toolkit
   ```

2. **Create Store Structure**
   - `src/store/index.ts` - Store configuration
   - `src/store/slices/` - Individual slice files
   - `src/store/middleware/` - Custom middleware (Firebase integration)

3. **Create Slices** (using Redux Toolkit)
   - `authSlice.ts` - Auth state & actions
   - `uiSlice.ts` - UI state & navigation actions
   - `teamsSlice.ts` - Teams metadata & actions
   - `positionsSlice.ts` - Positions metadata & actions
   - `rosterSlice.ts` - Roster page data & actions
   - `userManagementSlice.ts` - User management data & actions
   - `themeSlice.ts` - Theme state & actions

### **Phase 2: Implement Firebase Integration**

1. **Create Async Thunks** for Firebase operations
   - `fetchTeams` - Load teams from Firestore
   - `fetchPositions` - Load positions from Firestore
   - `fetchUsersByPosition` - Query users by position
   - `fetchAllUsers` - Load all users (admin only)
   - `updateUserData` - Save user profile changes
   - `saveUserManagementChanges` - Batch update users

2. **Create Middleware** for Firebase subscriptions
   - Real-time listeners for auth state
   - Real-time listeners for teams (for live updates if needed)
   - Unsubscribe on cleanup

### **Phase 3: Replace Components Incrementally**

1. **Replace App.tsx**
   - Remove useState for activeTab, activeSideItem, activeTeamName
   - Use `useSelector` for these values
   - Use `useDispatch` to dispatch UI actions

2. **Replace SideNav.tsx**
   - Use `useSelector` for:
     - `activeTab`, `activeSideItem`, `activeTeamName`
     - `allTeams`, `expandedTeams`
     - `userData`
   - Use `useDispatch` for:
     - Tab selection
     - Team expansion toggle
     - Position selection

3. **Replace RosterTable.tsx**
   - Use `useSelector` for:
     - `activePosition`, `activeTeamName`
     - `users` (from roster slice)
     - `rosterDates`, `teamData`
   - Use `useDispatch` to fetch data on mount
   - Remove local state loading/error

4. **Replace SettingsPage components**
   - `ProfileSettings.tsx` - access userData from Redux
   - `UserManagement.tsx` - access allUsers from Redux
   - `TeamManagement.tsx` - access teams from Redux
   - `PositionManager.tsx` - access positions from Redux

5. **Replace MainLayout.tsx**
   - Remove prop drilling
   - Use Redux for state directly in SideNav

### **Phase 4: Optimize Selectors & Memoization**

1. **Create Selector Functions** (`src/store/selectors/`)
   ```typescript
   // Memoized selectors to prevent unnecessary rerenders
   export const selectActiveTeamData = createSelector(
     state => state.teams.list,
     state => state.ui.activeTeamName,
     (teams, teamName) => teams.find(t => t.name === teamName)
   );

   export const selectComputedPositions = createSelector(
     state => state.ui.selectedTeamNames,
     state => state.teams.list,
     // ... computation logic
   );
   ```

2. **Use Reselect** for computed values
   - Replace `useComputedPositions` hook with selector

---

## Benefits After Implementation

| Issue | Before | After |
|-------|--------|-------|
| **Prop Drilling** | 5+ levels of props | Direct access via `useSelector` |
| **Data Fetching** | Duplicated in 5+ places | Single source in store |
| **Re-renders** | Entire tree on nav change | Only affected components |
| **Loading States** | Multiple local states | Centralized in Redux |
| **Data Consistency** | Eventually consistent | Atomic updates via actions |
| **Time to add feature** | Manual prop threading | Drop in selector usage |

---

## Component Changes Summary

### Components That Will Be Significantly Simplified

1. **App.tsx**
   - Lines 15-18: Remove 4 useState hooks
   - Remove callback: `handleActiveSelectionChange`
   - Props to MainLayout reduced from 6 to 1

2. **MainLayout.tsx**
   - Props reduced from 6 to 1 (children only)
   - Remove layout state management
   - Much simpler JSX

3. **SideNav.tsx**
   - Remove 3 useEffect hooks for data fetching
   - Remove expandedTeams state
   - Direct selector access to data
   - No parent callback handling needed

4. **RosterTable.tsx**
   - Remove 2 useState hooks for local state
   - Remove useEffect for fetching
   - All data from Redux selectors

5. **Settings Pages** (each)
   - Remove independent fetchData logic
   - Access teams/positions from Redux
   - Simpler component logic

---

## Data Flow Example: Before vs After

### **BEFORE: Position Selection**
```
SideNav.tsx receives:
  - activeTeamName (from App.tsx)
  - activeSideItem (from App.tsx)
  - onActiveSelectionChange callback

User clicks position →
  SideNav calls onActiveSelectionChange →
  App.tsx setActiveSideItem/setActiveTeamName →
  RosterTable component gets new props →
  RosterTable useEffect triggers →
  RosterTable fetches users again
  (Other components also re-fetch independently)
```

### **AFTER: Position Selection**
```
SideNav uses Redux:
  - selectActiveTeamName selector
  - selectActiveSideItem selector
  - selectAllTeams selector

User clicks position →
  SideNav dispatches setActiveSelection action →
  Redux state updates atomically →
  RosterTable selector automatically updates →
  useEffect in RosterSlice fetches users once (cached) →
  All components reading from store auto-update
```

---

## Migration Checklist

- [ ] Setup Redux store and slices
- [ ] Create Firebase async thunks
- [ ] Create selector functions
- [ ] Update App.tsx to use Redux
- [ ] Update MainLayout.tsx to use Redux
- [ ] Update SideNav.tsx to use Redux
- [ ] Update RosterPage/RosterTable to use Redux
- [ ] Update ProfileSettings.tsx to use Redux
- [ ] Update UserManagement.tsx to use Redux
- [ ] Update TeamManagement.tsx to use Redux
- [ ] Update PositionManager.tsx to use Redux
- [ ] Remove useAuth hook from non-root components
- [ ] Replace useComputedPositions with selector
- [ ] Test all features work correctly
- [ ] Performance testing & optimization

---

## Priority Slices (Implement in Order)

1. **authSlice** → Foundational (other slices depend on)
2. **uiSlice** → Removes most prop drilling
3. **teamsSlice** → Shared by multiple pages
4. **positionsSlice** → Shared by multiple pages
5. **rosterSlice** → Fixes RosterTable data fetching
6. **userManagementSlice** → Fixes UserManagement page
7. **themeSlice** → Nice to have, handles theme globally

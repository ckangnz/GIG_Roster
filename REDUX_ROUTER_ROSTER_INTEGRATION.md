# Redux + Router + Roster Data Integration Guide

## Updated Redux Implementation Plan with Router & Roster Data

Your Redux plan stays the same, but now we add two more slices and Router integration:

---

## Updated Timeline: 5-6 weeks

```
Week 1: Foundation + Router Setup
├─ Install dependencies (@reduxjs/toolkit, react-redux, react-router-dom)
├─ Create store configuration
├─ Implement authSlice + authMiddleware
├─ CREATE ROUTER: src/router/routes.tsx
├─ UPDATE main.tsx with RouterProvider
└─ ✅ Auth + Routing foundation complete

Week 2: Navigation State + URL Sync
├─ Implement uiSlice
├─ Create uiSelectors
├─ UPDATE App.tsx (add Outlet for routing)
├─ UPDATE MainLayout.tsx (sync Redux ↔ URL)
├─ UPDATE SideNav.tsx to use router navigate()
└─ ✅ App navigates via URLs, Redux state synced

Week 3: Metadata (Teams & Positions)
├─ Implement teamsSlice, positionsSlice
├─ Create memoized selectors
├─ Update ProfileSettings, TeamManagement, PositionManager
└─ ✅ Metadata fetched once, shared

Week 4: Roster Pages
├─ Implement rosterDataSlice (NEW)
├─ Create rosterDataSelectors (NEW)
├─ UPDATE RosterPage.tsx (use URL params + Redux)
├─ UPDATE RosterTable.tsx (display assignments + absences)
└─ ✅ Roster pages working with data

Week 5: Settings Pages
├─ Implement userManagementSlice
├─ UPDATE SettingsPage to route to correct section
├─ UPDATE all settings pages (use URL params)
└─ ✅ Settings navigation working

Week 6: QA & Optimization
├─ Performance testing
├─ Test all navigation flows
├─ Test deep linking (bookmarks, shares)
├─ Browser history (back/forward)
└─ ✅ Everything polished and optimized
```

---

## New Slices to Create

### 1. `rosterDataSlice.ts` (Roster Assignments)
**Purpose**: Store actual roster assignments/absences for each date

```typescript
// Path: src/store/slices/rosterDataSlice.ts

Interface:
{
  entries: Map<string, RosterEntry>  // date -> roster data
  currentYear: number
  loading: boolean
  error: string | null
}

Thunks:
- fetchRosterEntries(year, teamName)
- fetchRosterEntry(year, teamName, date)
- createOrUpdateRosterEntry(year, entry)
```

**When to use**: RosterTable.tsx needs actual assignments/absences

### 2. `rosterSlice.ts` (Query Results)
**Purpose**: User list filtered by position (what you had before)

```typescript
// Path: src/store/slices/rosterSlice.ts

Interface:
{
  users: AppUser[]
  rosterDates: Date[]
  currentTeamData: Team | null
  loadingUsers: boolean
  loadingTeam: boolean
  error: string | null
}

Thunks:
- fetchUsersByPosition(positionName)
- fetchTeamData(teamName)
```

**When to use**: Get users assigned to specific position

### Difference 🎯
- **rosterSlice**: Filtered users for a position (side data)
- **rosterDataSlice**: Actual roster assignments (main data)

Both are needed! They work together.

---

## Updated Store Structure

```typescript
store: {
  auth: { /* existing */ },
  ui: { /* existing */ },
  teams: { /* existing */ },
  positions: { /* existing */ },
  
  // Used to be: roster queries for users
  roster: {
    users: AppUser[],
    rosterDates: Date[],
    currentTeamData: Team | null,
    loadingUsers, loadingTeam
  },
  
  // NEW: Actual roster data
  rosterData: {
    entries: Map<string, RosterEntry>,
    currentYear: number,
    loading, error
  },
  
  userManagement: { /* existing */ },
  theme: { /* existing */ }
}
```

---

## File Structure (New & Modified)

### New Files to Create
```
src/
├── router/
│   └── routes.tsx                          (NEW)
├── store/
│   ├── slices/
│   │   ├── rosterDataSlice.ts              (NEW)
│   │   └── [existing slices]
│   └── selectors/
│       ├── rosterDataSelectors.ts          (NEW)
│       └── [existing selectors]
└── [other files]
```

### Modified Files
```
src/
├── main.tsx                  (ADD RouterProvider)
├── App.tsx                   (ADD Outlet)
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx    (ADD URL sync logic)
│   └── navigation/
│       └── SideNav.tsx       (USE useNavigate)
└── page/
    └── roster-page/
        └── RosterPage.tsx    (USE useParams)
```

---

## Component Update Patterns

### Pattern 1: Reading from URL + Redux

**Before (Props)**:
```typescript
interface RosterPageProps {
  uid: string
  activePosition: string | null
  activeTeamName: string | null
}

const RosterPage = ({ activePosition, activeTeamName }: RosterPageProps) => {
  return <RosterTable ... />
}
```

**After (Router + Redux)**:
```typescript
const RosterPage = () => {
  const { teamName, positionName } = useParams()
  const dispatch = useAppDispatch()
  
  // Fetch roster data when URL params change
  useEffect(() => {
    if (teamName && positionName) {
      dispatch(fetchUsersByPosition(positionName))
      dispatch(fetchTeamData(teamName))
    }
  }, [teamName, positionName, dispatch])
  
  return <RosterTable />
}
```

### Pattern 2: Navigation via Router

**Before (Callback Props)**:
```typescript
<SideNav
  onActiveSelectionChange={(teamName, positionName) => {
    // App.tsx updates state, MainLayout gets new props
  }}
/>
```

**After (Router)**:
```typescript
const SideNav = () => {
  const navigate = useNavigate()
  
  const handleNavItemClick = (teamName: string, positionName: string) => {
    navigate(`/roster/${teamName}/${positionName}`)
  }
  
  return <button onClick={() => handleNavItemClick(...)} />
}
```

### Pattern 3: Settings Pages with URL Routes

**Before (Conditional Rendering)**:
```typescript
{activeSection === SettingsSection.PROFILE && <ProfileSettings />}
{activeSection === SettingsSection.USER_MANAGEMENT && <UserManagement />}
{activeSection === SettingsSection.TEAMS && <TeamManagement />}
```

**After (Router)**:
```typescript
// routes.tsx
{
  path: 'settings/:section?',
  element: <SettingsPage />,
  children: [
    { path: 'profile', element: <ProfileSettings /> },
    { path: 'users', element: <UserManagement /> },
    { path: 'teams', element: <TeamManagement /> },
    { path: 'positions', element: <PositionManager /> },
  ],
}

// SettingsPage.tsx
const SettingsPage = () => {
  const { section } = useParams()
  
  return (
    <div className="settings-container">
      {section === 'profile' && <ProfileSettings />}
      {section === 'users' && <UserManagement />}
      {section === 'teams' && <TeamManagement />}
      {section === 'positions' && <PositionManager />}
    </div>
  )
}
```

Or even better with nested routes:
```typescript
// SettingsPage.tsx (simplified)
const SettingsPage = () => {
  return (
    <div className="settings-container">
      <Outlet /> {/* Child route renders here */}
    </div>
  )
}
```

---

## Key Implementation Files

### 1. `src/router/routes.tsx` (Priority: Week 1)
```typescript
import { createBrowserRouter, RouteObject } from 'react-router-dom'
import App from '../App'
import RosterPage from '../page/roster-page/RosterPage'
import SettingsPage from '../page/settings-page/SettingsPage'
import LoginPage from '../page/login-page/LoginPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { path: 'roster/:teamName/:positionName?', element: <RosterPage /> },
      { path: 'settings/:section?', element: <SettingsPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/guest-page', element: <GuestPage /> },
]

export const router = createBrowserRouter(routes)
```

### 2. `src/store/slices/rosterDataSlice.ts` (Priority: Week 4)
```typescript
// See full example in ROSTER_STRUCTURE_AND_ROUTING.md
// This handles: fetching, storing, and managing actual roster assignments

export const fetchRosterEntries = createAsyncThunk(...)
export const rosterDataSlice = createSlice({...})
export const rosterDataReducer = rosterDataSlice.reducer
```

### 3. `src/store/selectors/rosterDataSelectors.ts` (Priority: Week 4)
```typescript
// Memoized selectors for accessing roster data
export const selectRosterEntries = (state: RootState) => 
  state.rosterData.entries

export const selectRosterEntryForDateAndTeam = createSelector(...)
export const selectRosterEntryUsers = createSelector(...)
```

### 4. `src/components/layout/MainLayout.tsx` (Priority: Week 2)
```typescript
// Sync Redux state ↔ URL changes
useEffect(() => {
  // When URL changes, update Redux
}, [location])

useEffect(() => {
  // When Redux state changes, update URL
}, [activeTab, activeTeamName, activeSideItem])
```

---

## Roster Data Operations

### Creating/Updating Roster Entry

```typescript
// In RosterTable.tsx or a new component
const dispatch = useAppDispatch()
const year = new Date().getFullYear()

// Update user assignment
const updateUserPosition = async (
  date: string,
  teamName: string,
  userEmail: string,
  positions: string[]
) => {
  const entry: RosterEntry = {
    id: `${date}-${teamName}`,
    date,
    teamName,
    assignments: {
      [userEmail]: positions
    },
    absence: {},  // Empty initially, no absences
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  
  await dispatch(
    createOrUpdateRosterEntry({ year, entry })
  )
}

// Mark user absent with reason
const markUserAbsent = async (
  date: string,
  teamName: string,
  userEmail: string,
  reason: string
) => {
  const entry: RosterEntry = {
    id: `${date}-${teamName}`,
    date,
    teamName,
    assignments: { /* existing assignments */ },
    absence: {
      [userEmail]: {
        reason  // e.g. "Medical appointment", "Annual leave"
      }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  
  await dispatch(
    createOrUpdateRosterEntry({ year, entry })
  )
}

// Remove user from absence list (mark as present)
const markUserPresent = async (
  date: string,
  teamName: string,
  userEmail: string
) => {
  const entry: RosterEntry = {
    id: `${date}-${teamName}`,
    date,
    teamName,
    assignments: { /* existing assignments */ },
    absence: {},  // Remove the user from absence
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  
  await dispatch(
    createOrUpdateRosterEntry({ year, entry })
  )
}
```

---

## Testing Checklist

### Router Tests
```
✅ /login shows LoginPage
✅ /roster/:team/:position loads RosterPage
✅ /settings/:section loads correct settings page
✅ /roster/Team%20A/Lead updates state correctly
✅ Back button navigates correctly
✅ Bookmarked URLs work on page reload
✅ Sharable URLs work
✅ Invalid routes handled gracefully
```

### Redux + Router Integration
```
✅ URL changes dispatch correct Redux actions
✅ Redux state changes update URL
✅ Deep links populate Redux state correctly
✅ Browser history works with both
✅ No infinite loops between state ↔ URL sync
✅ Roster assignments display correctly
✅ Absence tracking works
✅ Child positions display in same roster
```

---

## Order of Implementation

### Week 1 (Foundation)
1. ✅ Create `src/router/routes.tsx`
2. ✅ Install react-router-dom
3. ✅ Update `src/main.tsx` with RouterProvider
4. ✅ Create Redux store (already planned)
5. ✅ Quick test: Pages load at correct URLs

### Week 2 (Navigation State)
1. ✅ Implement uiSlice
2. ✅ Update `App.tsx` with Outlet
3. ✅ Update `MainLayout.tsx` to sync URL ↔ Redux
4. ✅ Update `SideNav.tsx` to use navigate()
5. ✅ Test: Clicking nav updates URL

### Week 3 (Metadata)
- Continue as planned (teams, positions)

### Week 4 (Roster Pages)
1. ✅ Create `rosterDataSlice.ts`
2. ✅ Create `rosterDataSelectors.ts`
3. ✅ Update `RosterPage.tsx` to use URL params
4. ✅ Update `RosterTable.tsx` to show assignments
5. ✅ Update `RosterTable.tsx` to show absences
6. ✅ Test: Roster displays correct data

### Week 5-6 (Settings & Polish)
- Continue as planned

---

## Benefits This Brings

| Aspect | Benefit |
|--------|---------|
| **URLs** | Users can share: `/roster/Team%20A/Lead` |
| **Bookmarks** | Save important roster pages |
| **Browser History** | Back/Forward buttons work |
| **Deep Linking** | Fresh page load goes to correct roster |
| **Redux + Router** | Best of both worlds - state mgmt + navigation |
| **Testability** | Navigate to state easily in tests |
| **Debugging** | Redux DevTools shows state from any URL |
| **User Experience** | App feels more like traditional websites |

---

## Quick Decision Matrix

| Question | Answer |
|----------|--------|
| Q: Keep both Redux AND Router? | YES - they complement each other perfectly |
| Q: Conflict between state & URL? | NO - MainLayout syncs them automatically |
| Q: Add Router to existing Redux plan? | YES - modifies ~5 existing files + adds router setup |
| Q: Start with Router or Redux first? | ROUTER FIRST (simpler, can do before Redux) |
| Q: Do I need both `rosterSlice` and `rosterDataSlice`? | YES - different purposes, both needed |
| Q: Can I just use URL params without Redux? | Possible but NOT recommended - lose caching benefits |

---

## Recommended Approach

**Start with Router in Week 1**, then add Redux incrementally:

```
Week 1: 
  - Install react-router-dom
  - Create routes
  - Update main.tsx & App.tsx
  - Pages load at URLs (without Redux yet)

Week 2-3:
  - Add Redux Store (don't need Router for this)
  - Sync URL ↔ Redux in MainLayout

Week 4+:
  - Add slices one by one
  - Each slice works with or without Router
```

**Result**: Working router immediately, Redux benefits added gradually

---

## What to Create Next

Based on your needs, here's what I recommend creating:

1. **`ROUTER_SETUP_GUIDE.md`** - Step-by-step router implementation
2. **`ROSTER_DATA_REDUX_SLICE.md`** - Complete rosterDataSlice code
3. **Start implementation** following the timeline

Want me to create these guides? Or start implementing?

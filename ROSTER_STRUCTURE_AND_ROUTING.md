# Roster Data Structure & React Router Integration

## Part 1: Roster Data Structure Design

### Your Proposed Structure (Refined)
```typescript
{
  date: "2026-01-23", 
  teamName: "Team A",
  assignments: {
    userEmail: [positionName1, positionName2],
    userEmail2: [positionName3]
  },
  absence: {
    userEmail: {
      reason: "Medical appointment"  // Presence of key = absent
    }
  }
}
```

**Storage**: `roster/{year}/list[{rosterData}, {...}]`
**Note**: Existence of email in `absence` object means that person is away. If email not in object, they're present.

---

## Analysis & Refinement

### Current Structure - Good Points ✅
- Date as string (easy querying, sorting)
- Per-year collection (scales well, easy archive)
- Teams grouping (makes sense for roster organization)
- User-position mapping (clear relationships)
- Absence tracking with reason (better than boolean - know why they're absent)

### Suggested Refinements

#### 1. **TypeScript Model** (Add to `src/model/model.ts`)
```typescript
export interface RosterEntry {
  id: string;                    // Firestore doc ID (unique identifier)
  date: string;                  // "2026-01-23" format (ISO 8601)
  teamName: string;              // "Team A", "Team B"
  assignments: {
    [userEmail: string]: string[] // userEmail: [positionName1, positionName2]
  };
  absence: {
    [userEmail: string]: {
      reason: string  // e.g. "Medical appointment", "Annual leave"
    }
  };
  createdAt: Date;               // When entry was created
  updatedAt: Date;               // When entry was last modified
}

// Check if user is absent:
// const isAbsent = userEmail in rosterEntry.absence;
// Get absence reason:
// const reason = rosterEntry.absence[userEmail]?.reason;

// For easier access, normalize the structure when fetching
export interface RosterState {
  entries: Map<string, RosterEntry>; // date -> entry mapping
  loading: boolean;
  error: string | null;
}
```

#### 2. **Firestore Collection Structure**
```
firestore:
  roster/
    2026/
      list/
        doc1: { date: "2026-01-23", teamName: "Team A", assignments: {...} }
        doc2: { date: "2026-01-24", teamName: "Team A", assignments: {...} }
        doc3: { date: "2026-01-23", teamName: "Team B", assignments: {...} }
    2027/
      list/
        doc1: { date: "2027-01-15", teamName: "Team A", assignments: {...} }
```

**Why this works:**
- Year-based partitioning prevents collections from getting too large
- Easy to archive past years
- Per-team-per-date entries (can have multiple teams on same date)
- Prevents document size limits (Firestore has 1MB limit per doc)

---

## Part 2: Handling Child Positions

### Challenge
You mentioned: "if so, that child should be in the same roster page instead of having its own"

### Solution: Child Position Flattening

#### Current Position Structure (from PositionManager.tsx)
```typescript
interface Position {
  name: string;
  emoji: string;
  colour: string;
  parentId?: string;  // Reference to parent position
}

// Example:
// Position 1: Lead Guitar (no parent)
// Position 2: Rhythm Guitar (parentId: "Lead Guitar")
// Position 3: Bass (no parent)
```

#### Roster Display Logic
```typescript
// When rendering roster for a team:
// 1. Get all positions in team
// 2. Find all positions with NO parent (root positions)
// 3. For each root position, include its children in same row/section

// Example display:
export const selectRosterPositions = createSelector(
  state => state.ui.activeTeamName,
  state => state.ui.activeSideItem,
  state => state.teams.list,
  state => state.positions.list,
  (teamName, selectedPosition, teams, positions) => {
    if (!teamName) return {};

    const team = teams.find(t => t.name === teamName);
    if (!team) return {};

    const teamPositions = team.positions || [];
    
    // Group parent positions with their children
    const positionGroups = new Map<string, Position[]>();
    
    teamPositions.forEach(pos => {
      // Find the root position (walk up parentId chain)
      let root = pos;
      while (root.parentId) {
        const parent = positions.find(p => p.name === root.parentId);
        if (!parent) break;
        root = parent;
      }
      
      if (!positionGroups.has(root.name)) {
        positionGroups.set(root.name, []);
      }
      positionGroups.get(root.name)!.push(pos);
    });

    return Array.from(positionGroups.entries()).map(([root, children]) => ({
      rootPosition: positions.find(p => p.name === root),
      allPositions: [root, ...children.map(c => c.name)]
    }));
  }
);
```

#### Roster Table Rendering
```typescript
// In RosterTable.tsx, instead of rendering one column per position:
// Render one column per ROOT position (with child positions stacked)

<table>
  <thead>
    <tr>
      <th>Date</th>
      {rosterPositions.map(group => (
        <th key={group.rootPosition.name} colSpan={group.allPositions.length}>
          {group.rootPosition.emoji} {group.rootPosition.name}
        </th>
      ))}
    </tr>
    {/* Sub-header with child positions */}
    <tr>
      <th></th>
      {rosterPositions.map(group =>
        group.allPositions.map(posName => (
          <th key={posName} style={{fontSize: '0.8em'}}>
            {posName}
          </th>
        ))
      )}
    </tr>
  </thead>
  <tbody>
    {/* Roster cells organized by position group */}
  </tbody>
</table>
```

---

## Part 3: Redux Integration for Roster Data

### Add to Redux Store

#### New Slice: `src/store/slices/rosterDataSlice.ts`
```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { RosterEntry } from '../../model/model'

interface RosterDataState {
  entries: Map<string, RosterEntry>  // date -> entry
  currentYear: number
  loading: boolean
  error: string | null
}

const initialState: RosterDataState = {
  entries: new Map(),
  currentYear: new Date().getFullYear(),
  loading: false,
  error: null,
}

// Fetch all roster entries for a given year and team
export const fetchRosterEntries = createAsyncThunk(
  'rosterData/fetchEntries',
  async (
    { year, teamName }: { year: number; teamName: string },
    { rejectWithValue }
  ) => {
    try {
      const rosterCollectionRef = collection(db, 'roster', year.toString(), 'list')
      const q = query(rosterCollectionRef, where('teamName', '==', teamName))
      const querySnapshot = await getDocs(q)

      const entries = new Map<string, RosterEntry>()
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<RosterEntry, 'id'>
        entries.set(data.date, { ...data, id: doc.id })
      })

      return entries
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch roster entries'
      )
    }
  }
)

// Fetch single roster entry for a specific date/team
export const fetchRosterEntry = createAsyncThunk(
  'rosterData/fetchEntry',
  async (
    { year, teamName, date }: { year: number; teamName: string; date: string },
    { rejectWithValue }
  ) => {
    try {
      const rosterCollectionRef = collection(db, 'roster', year.toString(), 'list')
      const q = query(
        rosterCollectionRef,
        where('teamName', '==', teamName),
        where('date', '==', date)
      )
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null // No entry for this date
      }

      const doc = querySnapshot.docs[0]
      return { ...(doc.data() as Omit<RosterEntry, 'id'>), id: doc.id }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch roster entry'
      )
    }
  }
)

const rosterDataSlice = createSlice({
  name: 'rosterData',
  initialState,
  reducers: {
    setCurrentYear: (state, action) => {
      state.currentYear = action.payload
    },
    updateRosterEntry: (state, action) => {
      const entry: RosterEntry = action.payload
      state.entries.set(entry.date, entry)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRosterEntries.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRosterEntries.fulfilled, (state, action) => {
        state.entries = action.payload
        state.loading = false
      })
      .addCase(fetchRosterEntries.rejected, (state, action) => {
        state.error = action.payload as string
        state.loading = false
      })
  },
})

export const { setCurrentYear, updateRosterEntry } = rosterDataSlice.actions
export const rosterDataReducer = rosterDataSlice.reducer
```

#### Selectors: `src/store/selectors/rosterDataSelectors.ts`
```typescript
import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

export const selectRosterEntries = (state: RootState) =>
  state.rosterData.entries

export const selectCurrentYear = (state: RootState) =>
  state.rosterData.currentYear

export const selectRosterLoading = (state: RootState) =>
  state.rosterData.loading

export const selectRosterError = (state: RootState) =>
  state.rosterData.error

// Memoized: Get roster entry for current date/team
export const selectRosterEntryForDateAndTeam = createSelector(
  [
    selectRosterEntries,
    (state: RootState) => state.ui.activeTeamName,
  ],
  (entries, teamName) => {
    if (!teamName) return null

    // Find entry for this team and today's date
    const today = new Date().toISOString().split('T')[0]
    const entry = Array.from(entries.values()).find(
      e => e.date === today && e.teamName === teamName
    )
    return entry || null
  }
)

// Memoized: Get users and their positions for a roster entry
export const selectRosterEntryUsers = createSelector(
  [selectRosterEntryForDateAndTeam],
  (entry) => {
    if (!entry) return []

    return Object.entries(entry.assignments).map(([userEmail, positions]) => ({
      userEmail,
      positions,
      isAbsent: userEmail in entry.absence,  // Key exists = absent
      absenceReason: entry.absence[userEmail]?.reason || null,
    }))
  }
)
```

---

## Part 4: React Router Setup

### Installation
```bash
npm install react-router-dom
```

### Router Configuration

#### New File: `src/router/routes.tsx`
```typescript
import { createBrowserRouter, RouteObject } from 'react-router-dom'
import App from '../App'
import GuestPage from '../page/guest-page/GuestPage'
import LoginPage from '../page/login-page/LoginPage'
import LoadingPage from '../page/loading-page/LoadingPage'
import RosterPage from '../page/roster-page/RosterPage'
import SettingsPage from '../page/settings-page/SettingsPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      // Authenticated pages
      {
        path: 'roster/:teamName/:positionName?',
        element: <RosterPage />,
      },
      {
        path: 'settings/:section?',
        element: <SettingsPage />,
      },
    ],
  },
  // Public pages (outside main layout)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/guest-page',
    element: <GuestPage />,
  },
  {
    path: '/loading',
    element: <LoadingPage />,
  },
]

export const router = createBrowserRouter(routes)
```

#### Update `src/main.tsx`
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { store } from './store'
import { router } from './router/routes'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
)
```

#### Update `src/App.tsx`
```typescript
import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './hooks/redux'
import { fetchTeams } from './store/slices/teamsSlice'
import { fetchPositions } from './store/slices/positionsSlice'
import { selectAuthLoading, selectFirebaseUser, selectUserData } from './store/selectors/authSelectors'
import MainLayout from './components/layout/MainLayout'
import LoadingPage from './page/loading-page/LoadingPage'
import LoginPage from './page/login-page/LoginPage'
import GuestPage from './page/guest-page/GuestPage'
import './App.css'

const App = () => {
  const dispatch = useAppDispatch()
  const loading = useAppSelector(selectAuthLoading)
  const user = useAppSelector(selectFirebaseUser)
  const userData = useAppSelector(selectUserData)

  // Initialize metadata on mount
  useEffect(() => {
    dispatch(fetchTeams())
    dispatch(fetchPositions())
  }, [dispatch])

  if (loading) return <LoadingPage />
  if (!user) return <Navigate to="/login" replace />
  if (!userData) return <LoadingPage />

  if (userData && !userData.isApproved) {
    return <GuestPage user={userData} uid={user.uid} />
  }

  return (
    <MainLayout>
      <Outlet /> {/* Pages render here */}
    </MainLayout>
  )
}

export default App
```

#### Update `src/components/layout/MainLayout.tsx`
```typescript
import { useEffect } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/redux'
import {
  selectActiveTab,
  selectActiveSideItem,
  selectActiveTeamName,
  setActiveSideItem,
  setActiveTeamName,
  setActiveTab,
} from '../../store/slices/uiSlice'
import { selectTeamsList } from '../../store/selectors/teamsSelectors'
import { AppTab } from '../../constants/navigation'
import MobileHeader from './Mobile-Header'
import BottomNav from '../navigation/BottomNav'
import SideNav from '../navigation/SideNav'
import './main-layout.css'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const activeTab = useAppSelector(selectActiveTab)
  const activeSideItem = useAppSelector(selectActiveSideItem)
  const activeTeamName = useAppSelector(selectActiveTeamName)
  const teams = useAppSelector(selectTeamsList)

  // Sync URL changes to Redux state
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean)

    if (pathParts[0] === 'roster') {
      dispatch(setActiveTab(AppTab.ROSTER))
      if (params.teamName) {
        dispatch(setActiveTeamName(params.teamName))
      }
      if (params.positionName) {
        dispatch(setActiveSideItem(params.positionName))
      } else if (teams.length > 0 && teams[0].positions.length > 0) {
        // Default to first position if not specified
        dispatch(setActiveSideItem(teams[0].positions[0].name))
      }
    } else if (pathParts[0] === 'settings') {
      dispatch(setActiveTab(AppTab.SETTINGS))
      dispatch(setActiveTeamName(null))
      if (params.section) {
        dispatch(setActiveSideItem(params.section))
      }
    }
  }, [location, params, dispatch, teams])

  // Sync Redux state changes to URL
  useEffect(() => {
    if (activeTab === AppTab.ROSTER && activeTeamName && activeSideItem) {
      navigate(`/roster/${activeTeamName}/${activeSideItem}`)
    } else if (activeTab === AppTab.SETTINGS && activeSideItem) {
      navigate(`/settings/${activeSideItem}`)
    }
  }, [activeTab, activeTeamName, activeSideItem, navigate])

  // ... rest of MainLayout code (sidebar, mobile header, etc.)
  return (
    <>
      <MobileHeader />
      <div className="app-shell">
        <SideNav />
        <main className="main-content">
          <div className="content-container">{children}</div>
        </main>
        <BottomNav />
      </div>
    </>
  )
}

export default MainLayout
```

---

## Integration: How It Works Together

### Example User Flow with Router + Redux

```
User Action: Click on "Team A • Lead Guitar"
  ↓
SideNav.tsx dispatches setActiveTeamName('Team A'), setActiveSideItem('Lead Guitar')
  ↓
Redux state updates
  ↓
useEffect in MainLayout detects state change
  ↓
navigate() updates URL to /roster/Team%20A/Lead%20Guitar
  ↓
Browser address bar shows new URL
  ↓
RosterPage renders with new params
  ↓
useEffect triggers fetchRosterEntries for Team A
  ↓
Roster data displayed
```

### Browser history also works!
```
User clicks back button
  ↓
URL changes to previous /roster/Team%20B/Bass
  ↓
useEffect in MainLayout detects URL change
  ↓
Dispatches appropriately to Redux
  ↓
Pages update accordingly
```

### Deep linking works!
```
User bookmarks: /roster/Team%20A/Lead%20Guitar
User opens bookmark later
  ↓
React Router loads that route
  ↓
MainLayout syncs URL to Redux state
  ↓
Page renders with correct team/position
  ↓
Roster data fetched and displayed
```

---

## URL Examples

After implementation, your app will have these URLs:

```
Authentication:
  /login                           ← Login page

After login (approved user):
  /roster/Team%20A/Lead            ← Team A, Lead position roster
  /roster/Team%20B/Bass            ← Team B, Bass position roster
  /settings/profile                ← Profile settings
  /settings/users                  ← User management (admin only)
  /settings/teams                  ← Team management (admin only)
  /settings/positions              ← Position management (admin only)

Not approved user:
  /guest-page                      ← Waiting for approval page

Loading states:
  /loading                         ← Loading page (if needed)
```

---

## Updated Redux Store

Add to your `store/index.ts`:

```typescript
import { rosterDataReducer } from './slices/rosterDataSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    teams: teamsReducer,
    positions: positionsReducer,
    roster: rosterReducer,          // Existing
    rosterData: rosterDataReducer,  // NEW - actual roster assignment data
    userManagement: userManagementReducer,
    theme: themeReducer,
  },
  // ... middleware config
})
```

---

## Benefits of Router + Redux

| Feature | Benefit |
|---------|---------|
| **URL State** | Users can bookmark and share links |
| **Browser History** | Back/forward buttons work naturally |
| **Deep Linking** | Fresh page load goes to correct state |
| **SEO** (if needed) | Can be crawled by search engines |
| **Redux Device Tools** | Can replay state from URL |
| **Testing** | Easy to test navigation flows |

---

## Migration Steps

1. Install React Router: `npm install react-router-dom`
2. Create `src/router/routes.tsx`
3. Update `src/main.tsx` with RouterProvider
4. Update `src/App.tsx` with Outlet
5. Update `src/components/layout/MainLayout.tsx` with URL sync
6. Update `src/components/navigation/SideNav.tsx` to use route navigation
7. Create `rosterDataSlice.ts` for roster entries
8. Test navigation and URL changes

---

## Summary

✅ **Roster Data Structure**
- Year-based partitioning in Firestore
- Per-team-per-date entries
- Child positions handled by selector logic
- New Redux slice for roster entries

✅ **React Router Integration**
- Full URL-based navigation
- Deep linking support
- Browser history support
- Works perfectly with Redux
- No conflicts, they complement each other

✅ **Both Together**
- URL synced to Redux state
- Redux state synced to URL
- Single source of truth maintained
- Easy to implement, test, and debug

Ready to implement both? Would you like specific code files to create first?

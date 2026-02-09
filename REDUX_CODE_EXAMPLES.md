# Redux Implementation: Code Structure & Examples

## Directory Structure

```
src/
├── store/
│   ├── index.ts                    # Store configuration
│   ├── middleware/
│   │   └── authMiddleware.ts       # Firebase auth listener
│   ├── slices/
│   │   ├── authSlice.ts           # Auth state
│   │   ├── uiSlice.ts             # Navigation & UI state
│   │   ├── teamsSlice.ts          # Teams metadata
│   │   ├── positionsSlice.ts      # Positions metadata
│   │   ├── rosterSlice.ts         # Roster page data
│   │   ├── userManagementSlice.ts # User management page
│   │   └── themeSlice.ts          # Theme toggle
│   └── selectors/
│       ├── authSelectors.ts       # Auth-related selectors
│       ├── uiSelectors.ts         # UI state selectors
│       ├── teamsSelectors.ts      # Teams selectors with memoization
│       ├── positionsSelectors.ts  # Positions selectors
│       ├── rosterSelectors.ts     # Roster computed selectors
│       └── index.ts               # Export all selectors
├── hooks/
│   ├── useAuth.ts                 # Keep for Firebase subscription setup
│   └── useTheme.tsx               # Existing
├── components/
│   └── ... (existing files)
└── ... (existing structure)
```

---

## Phase 1: Store Configuration

### Store Setup (`src/store/index.ts`)

```typescript
import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from './slices/authSlice'
import { uiReducer } from './slices/uiSlice'
import { teamsReducer } from './slices/teamsSlice'
import { positionsReducer } from './slices/positionsSlice'
import { rosterReducer } from './slices/rosterSlice'
import { userManagementReducer } from './slices/userManagementSlice'
import { themeReducer } from './slices/themeSlice'
import { authMiddleware } from './middleware/authMiddleware'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    teams: teamsReducer,
    positions: positionsReducer,
    roster: rosterReducer,
    userManagement: userManagementReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Firebase User objects (non-serializable)
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.firebaseUser'],
      },
    })
      .prepend(authMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### Typed Hooks (`src/hooks/redux.ts`)

```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../store'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

---

## Phase 2: Auth Slice & Middleware

### Auth Slice (`src/store/slices/authSlice.ts`)

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { AppUser } from '../../model/model'

interface AuthState {
  firebaseUser: User | null
  userData: AppUser | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  firebaseUser: null,
  userData: null,
  loading: true,
  error: null,
}

// Async thunk for initializing user data if first time login
export const initializeUserData = createAsyncThunk(
  'auth/initializeUserData',
  async (firebaseUser: User, { rejectWithValue }) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
        const isAutoAdmin = firebaseUser.email === adminEmail

        const newData: AppUser = {
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          isApproved: isAutoAdmin,
          isAdmin: isAutoAdmin,
          isActive: true,
          teams: [],
          positions: [],
          gender: '',
        }
        await setDoc(userRef, newData)
        return newData
      } else {
        return userSnap.data() as AppUser
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.firebaseUser = action.payload
    },
    setUserData: (state, action) => {
      state.userData = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    logout: (state) => {
      state.firebaseUser = null
      state.userData = null
      state.loading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeUserData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(initializeUserData.fulfilled, (state, action) => {
        state.userData = action.payload
        state.loading = false
      })
      .addCase(initializeUserData.rejected, (state, action) => {
        state.error = action.payload as string
        state.loading = false
      })
  },
})

export const { setUser, setUserData, setLoading, logout } = authSlice.actions
export const authReducer = authSlice.reducer
```

### Auth Middleware (`src/store/middleware/authMiddleware.ts`)

```typescript
import { Middleware } from '@reduxjs/toolkit'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import {
  setUser,
  setUserData,
  setLoading,
  logout,
  initializeUserData,
} from '../slices/authSlice'
import type { RootState, AppDispatch } from '../store'

export const authMiddleware: Middleware<{}, RootState> =
  (store) => (next) => {
    let unsubscribeSnapshot: (() => void) | null = null

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      const dispatch = store.dispatch as AppDispatch

      if (firebaseUser) {
        dispatch(setUser(firebaseUser))

        // Initialize user data if first time
        await dispatch(initializeUserData(firebaseUser))

        // Set up real-time listener for user data changes
        const userRef = doc(db, 'users', firebaseUser.uid)
        unsubscribeSnapshot = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            dispatch(setUserData(doc.data()))
          }
          dispatch(setLoading(false))
        })
      } else {
        dispatch(logout())
      }
    })

    return (action) => {
      const result = next(action)

      // Cleanup on app unmount (if needed)
      if (action.type === 'auth/logout') {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot()
        }
      }

      return result
    }
  }
```

---

## Phase 3: UI Slice

### UI Slice (`src/store/slices/uiSlice.ts`)

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AppTab, SettingsSection } from '../../constants/navigation'

interface UIState {
  activeTab: string
  activeSideItem: string | null
  activeTeamName: string | null
  expandedTeams: Set<string>
  isMobileSidebarOpen: boolean
  isDesktopSidebarExpanded: boolean
}

const initialState: UIState = {
  activeTab: AppTab.ROSTER,
  activeSideItem: null,
  activeTeamName: null,
  expandedTeams: new Set(),
  isMobileSidebarOpen: false,
  isDesktopSidebarExpanded: true,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload
      // Reset sidebar on mobile when tab changes
      if (window.innerWidth < 768) {
        state.isMobileSidebarOpen = false
      }
    },
    setActiveSideItem: (state, action: PayloadAction<string | null>) => {
      state.activeSideItem = action.payload
    },
    setActiveTeamName: (state, action: PayloadAction<string | null>) => {
      state.activeTeamName = action.payload
    },
    toggleTeamExpansion: (state, action: PayloadAction<string>) => {
      const teamName = action.payload
      if (state.expandedTeams.has(teamName)) {
        state.expandedTeams.delete(teamName)
      } else {
        state.expandedTeams.add(teamName)
      }
    },
    setTeamExpansion: (
      state,
      action: PayloadAction<{ teamName: string; isExpanded: boolean }>
    ) => {
      const { teamName, isExpanded } = action.payload
      if (isExpanded) {
        state.expandedTeams.add(teamName)
      } else {
        state.expandedTeams.delete(teamName)
      }
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileSidebarOpen = action.payload
    },
    setDesktopSidebarExpanded: (state, action: PayloadAction<boolean>) => {
      state.isDesktopSidebarExpanded = action.payload
    },
    setActiveSelection: (
      state,
      action: PayloadAction<{
        teamName: string | null
        sideItem: string | null
      }>
    ) => {
      state.activeTeamName = action.payload.teamName
      state.activeSideItem = action.payload.sideItem
    },
  },
})

export const {
  setActiveTab,
  setActiveSideItem,
  setActiveTeamName,
  toggleTeamExpansion,
  setTeamExpansion,
  setMobileSidebarOpen,
  setDesktopSidebarExpanded,
  setActiveSelection,
} = uiSlice.actions

export const uiReducer = uiSlice.reducer
```

### UI Selectors (`src/store/selectors/uiSelectors.ts`)

```typescript
import { RootState } from '../store'

export const selectActiveTab = (state: RootState) => state.ui.activeTab

export const selectActiveSideItem = (state: RootState) =>
  state.ui.activeSideItem

export const selectActiveTeamName = (state: RootState) =>
  state.ui.activeTeamName

export const selectExpandedTeams = (state: RootState) =>
  state.ui.expandedTeams

export const selectIsTeamExpanded = (teamName: string) => (
  state: RootState
) => state.ui.expandedTeams.has(teamName)

export const selectIsMobileSidebarOpen = (state: RootState) =>
  state.ui.isMobileSidebarOpen

export const selectIsDesktopSidebarExpanded = (state: RootState) =>
  state.ui.isDesktopSidebarExpanded
```

---

## Phase 4: Teams Slice

### Teams Slice (`src/store/slices/teamsSlice.ts`)

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { Team } from '../../model/model'

interface TeamsState {
  list: Team[]
  loading: boolean
  error: string | null
  fetched: boolean // To avoid re-fetching
}

const initialState: TeamsState = {
  list: [],
  loading: false,
  error: null,
  fetched: false,
}

export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (_, { rejectWithValue }) => {
    try {
      const teamsDocRef = doc(db, 'metadata', 'teams')
      const teamsSnap = await getDoc(teamsDocRef)

      if (teamsSnap.exists()) {
        const data = teamsSnap.data()
        const teamsList = Array.isArray(data.list)
          ? data.list.map((teamData: Team) => ({
              ...teamData,
              preferredDays: teamData.preferredDays || [],
              positions: teamData.positions || [],
            }))
          : []
        return teamsList
      }
      return []
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch teams'
      )
    }
  }
)

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.list = action.payload
        state.loading = false
        state.fetched = true
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.error = action.payload as string
        state.loading = false
      })
  },
})

export const teamsReducer = teamsSlice.reducer
```

### Teams Selectors with Memoization (`src/store/selectors/teamsSelectors.ts`)

```typescript
import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { Team, Position } from '../../model/model'

export const selectTeamsList = (state: RootState) => state.teams.list

export const selectTeamsLoading = (state: RootState) => state.teams.loading

export const selectTeamsError = (state: RootState) => state.teams.error

export const selectTeamsFetched = (state: RootState) => state.teams.fetched

// Memoized selector: Get active team
export const selectActiveTeam = createSelector(
  [(state: RootState) => state.teams.list, (state: RootState) => state.ui.activeTeamName],
  (teams, activeTeamName) =>
    activeTeamName ? teams.find((t) => t.name === activeTeamName) : null
)

// Memoized selector: Get computed positions from selected teams
export const selectComputedPositions = createSelector(
  [(state: RootState) => state.ui.activeTeamName, selectTeamsList],
  (activeTeamName, teams) => {
    if (!activeTeamName) return []
    const team = teams.find((t) => t.name === activeTeamName)
    return team?.positions || []
  }
)

// Memoized selector: User's available positions (from their teams)
export const selectUserAvailablePositions = createSelector(
  [(state: RootState) => state.auth.userData?.teams || [], selectTeamsList],
  (userTeams, allTeams) => {
    const uniquePositions = new Map<string, Position>()
    
    userTeams.forEach((teamName) => {
      const team = allTeams.find((t) => t.name === teamName)
      if (team?.positions) {
        team.positions.forEach((pos) => {
          if (!uniquePositions.has(pos.name)) {
            uniquePositions.set(pos.name, pos)
          }
        })
      }
    })
    
    return Array.from(uniquePositions.values())
  }
)
```

---

## Phase 5: Positions Slice

### Positions Slice (`src/store/slices/positionsSlice.ts`)

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { Position } from '../../model/model'

interface PositionsState {
  list: Position[]
  loading: boolean
  error: string | null
  fetched: boolean
}

const initialState: PositionsState = {
  list: [],
  loading: false,
  error: null,
  fetched: false,
}

export const fetchPositions = createAsyncThunk(
  'positions/fetchPositions',
  async (_, { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'metadata', 'positions')
      const snap = await getDoc(docRef)

      if (snap.exists()) {
        const data = snap.data()
        return Array.isArray(data.list) ? data.list : []
      }
      return []
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch positions'
      )
    }
  }
)

const positionsSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPositions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPositions.fulfilled, (state, action) => {
        state.list = action.payload
        state.loading = false
        state.fetched = true
      })
      .addCase(fetchPositions.rejected, (state, action) => {
        state.error = action.payload as string
        state.loading = false
      })
  },
})

export const positionsReducer = positionsSlice.reducer
```

---

## Phase 6: Roster Slice (Example of Complex Data)

### Roster Slice (`src/store/slices/rosterSlice.ts`)

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { AppUser, Team, Weekday } from '../../model/model'

interface RosterState {
  users: AppUser[]
  rosterDates: Date[]
  currentTeamData: Team | null
  loadingUsers: boolean
  loadingTeam: boolean
  error: string | null
}

const initialState: RosterState = {
  users: [],
  rosterDates: [],
  currentTeamData: null,
  loadingUsers: false,
  loadingTeam: false,
  error: null,
}

const getUpcomingDates = (preferredDays: Weekday[]): Date[] => {
  // (Implement the date logic from RosterTable.tsx)
  return []
}

// Fetch users by position
export const fetchUsersByPosition = createAsyncThunk(
  'roster/fetchUsersByPosition',
  async (positionName: string, { rejectWithValue }) => {
    try {
      if (!positionName) return []

      const usersCollectionRef = collection(db, 'users')
      const q = query(
        usersCollectionRef,
        where('positions', 'array-contains', positionName)
      )
      const querySnapshot = await getDocs(q)
      const fetchedUsers: AppUser[] = []

      querySnapshot.forEach((doc) => {
        fetchedUsers.push(doc.data() as AppUser)
      })

      return fetchedUsers.sort(
        (a, b) => (a.name || '').localeCompare(b.name || '')
      )
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch users'
      )
    }
  }
)

// Fetch team data and roster dates
export const fetchTeamData = createAsyncThunk(
  'roster/fetchTeamData',
  async (teamName: string, { rejectWithValue }) => {
    try {
      if (!teamName) return null

      const teamsDocRef = doc(db, 'metadata', 'teams')
      const teamsSnap = await getDoc(teamsDocRef)

      if (teamsSnap.exists()) {
        const data = teamsSnap.data()
        const allTeamsList = Array.isArray(data.list)
          ? data.list.map((teamData: Team) => ({
              ...teamData,
              preferredDays: teamData.preferredDays || [],
              positions: teamData.positions || [],
            }))
          : []

        const foundTeam = allTeamsList.find((team) => team.name === teamName)
        return foundTeam || null
      }
      return null
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch team data'
      )
    }
  }
)

const rosterSlice = createSlice({
  name: 'roster',
  initialState,
  reducers: {
    clearRosterData: (state) => {
      state.users = []
      state.rosterDates = []
      state.currentTeamData = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUsersByPosition
      .addCase(fetchUsersByPosition.pending, (state) => {
        state.loadingUsers = true
        state.error = null
        state.users = []
      })
      .addCase(fetchUsersByPosition.fulfilled, (state, action) => {
        state.users = action.payload
        state.loadingUsers = false
      })
      .addCase(fetchUsersByPosition.rejected, (state, action) => {
        state.error = action.payload as string
        state.loadingUsers = false
      })
      // fetchTeamData
      .addCase(fetchTeamData.pending, (state) => {
        state.loadingTeam = true
        state.error = null
        state.rosterDates = []
        state.currentTeamData = null
      })
      .addCase(fetchTeamData.fulfilled, (state, action) => {
        state.currentTeamData = action.payload
        if (action.payload?.preferredDays) {
          state.rosterDates = getUpcomingDates(action.payload.preferredDays)
        }
        state.loadingTeam = false
      })
      .addCase(fetchTeamData.rejected, (state, action) => {
        state.error = action.payload as string
        state.loadingTeam = false
      })
  },
})

export const { clearRosterData } = rosterSlice.actions
export const rosterReducer = rosterSlice.reducer
```

---

## Usage Examples: Component Conversions

### Before: App.tsx

```typescript
const App = () => {
  const { user, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(AppTab.ROSTER);
  const [activeSideItem, setActiveSideItem] = useState<string | null>(null);
  const [activeTeamName, setActiveTeamName] = useState<string | null>(null);

  const handleActiveSelectionChange = useCallback(
    (teamName: string | null, positionName: string | null) => {
      setActiveTeamName(teamName);
      setActiveSideItem(positionName);
    },
    [],
  );

  if (loading) return <Loader />;
  if (!user) return <LoginPage />;
  if (!userData) return <Loader />;

  if (userData && !userData.isApproved) {
    return <GuestPage user={userData} uid={user.uid} />;
  }

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        if (tab !== activeTab) {
          setActiveTab(tab);
          if (tab === AppTab.SETTINGS) {
            handleActiveSelectionChange(null, SettingsSection.PROFILE);
          } else {
            handleActiveSelectionChange(null, null);
          }
        }
      }}
      activeSideItem={activeSideItem}
      activeTeamName={activeTeamName}
      onActiveSelectionChange={handleActiveSelectionChange}
    >
      {activeTab === AppTab.ROSTER ? (
        <RosterPage
          uid={user.uid}
          activePosition={activeSideItem}
          activeTeamName={activeTeamName}
        />
      ) : (
        <SettingsPage
          userData={userData!}
          uid={user.uid}
          activeSection={activeSideItem}
        />
      )}
    </MainLayout>
  );
};
```

### After: App.tsx (With Redux)

```typescript
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './hooks/redux'
import { fetchTeams } from './store/slices/teamsSlice'
import { fetchPositions } from './store/slices/positionsSlice'
import {
  selectActiveTab,
  selectActiveSideItem,
  selectActiveTeamName,
} from './store/selectors/uiSelectors'
import { selectFirebaseUser, selectUserData, selectAuthLoading } from './store/selectors/authSelectors'
import MainLayout from './components/layout/MainLayout'
import { AppTab, SettingsSection } from './constants/navigation'
import GuestPage from './page/guest-page/GuestPage'
import Loader from './page/loading-page/LoadingPage'
import LoginPage from './page/login-page/LoginPage'
import RosterPage from './page/roster-page/RosterPage'
import SettingsPage from './page/settings-page/SettingsPage'
import './App.css'

const App = () => {
  const dispatch = useAppDispatch()

  // All state from Redux - no local state needed!
  const loading = useAppSelector(selectAuthLoading)
  const user = useAppSelector(selectFirebaseUser)
  const userData = useAppSelector(selectUserData)
  const activeTab = useAppSelector(selectActiveTab)
  const activeSideItem = useAppSelector(selectActiveSideItem)
  const activeTeamName = useAppSelector(selectActiveTeamName)

  // Initialize metadata on mount
  useEffect(() => {
    dispatch(fetchTeams())
    dispatch(fetchPositions())
  }, [dispatch])

  if (loading) return <Loader />
  if (!user) return <LoginPage />
  if (!userData) return <Loader />

  if (userData && !userData.isApproved) {
    return <GuestPage user={userData} uid={user.uid} />
  }

  return (
    <MainLayout>
      {activeTab === AppTab.ROSTER ? (
        <RosterPage uid={user.uid} />
      ) : (
        <SettingsPage userData={userData} uid={user.uid} />
      )}
    </MainLayout>
  )
}

export default App
```

**Changes:**
- Removed 4 useState hooks
- Removed handleActiveSelectionChange callback
- MainLayout now only needs children prop
- Simplified JSX logic

---

### Before: SideNav.tsx

```typescript
const SideNav = ({
  activeTab,
  activeSideItem,
  isSidebarOpen,
  setSidebarOpen,
  headerTitle,
  activeTeamName,
  onActiveSelectionChange,
}: SideNavProps) => {
  const { userData } = useAuth();

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);

  const toggleTeamExpansion = (teamName: string) => {
    setExpandedTeams((prev) =>
      prev.includes(teamName)
        ? prev.filter((name) => name !== teamName)
        : [...prev, teamName],
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsDocRef = doc(db, "metadata", "teams");
        const teamsSnap = await getDoc(teamsDocRef);
        // ... fetch logic
        setAllTeams(teamsList);
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    if (activeTab === AppTab.ROSTER) {
      fetchData();
    }
  }, [activeTab, activeSideItem, activeTeamName, onActiveSelectionChange]);
  // ... rest of component
}
```

### After: SideNav.tsx (With Redux)

```typescript
const SideNav = () => {
  const dispatch = useAppDispatch()

  // Direct Redux access - no props needed!
  const activeTab = useAppSelector(selectActiveTab)
  const activeSideItem = useAppSelector(selectActiveSideItem)
  const activeTeamName = useAppSelector(selectActiveTeamName)
  const expandedTeams = useAppSelector(selectExpandedTeams)
  const allTeams = useAppSelector(selectTeamsList)
  const userData = useAppSelector(selectUserData)
  const isSidebarOpen = useAppSelector(selectIsDesktopSidebarExpanded)

  const handleNavItemClick = useCallback(
    (teamName: string, positionName: string) => {
      dispatch(setActiveTeamName(teamName))
      dispatch(setActiveSideItem(positionName))
      if (window.innerWidth < 768) {
        dispatch(setMobileSidebarOpen(false))
      }
    },
    [dispatch]
  )

  // No useEffect needed! Teams already fetched by App.tsx
  // No local state management for expandedTeams
  const toggleTeamExpansion = (teamName: string) => {
    dispatch(toggleTeamExpansion(teamName))
  }

  // Rest of JSX stays mostly the same, but:
  // - Remove all prop references
  // - Use Redux dispatch instead
}
```

**Changes:**
- Removed 2 useState hooks (allTeams, expandedTeams)
- Removed useEffect for fetching
- Removed all prop parameters
- Simpler callback logic

---

## Testing Redux Slices

### Example: Testing teamsSlice

```typescript
import { configureStore } from '@reduxjs/toolkit'
import { teamsReducer, fetchTeams } from './store/slices/teamsSlice'

describe('teamsSlice', () => {
  it('should handle fetchTeams.fulfilled', () => {
    const mockTeams = [
      {
        name: 'Team A',
        emoji: '🎸',
        positions: [],
        preferredDays: ['Monday'],
      },
    ]

    const state = {
      list: [],
      loading: false,
      error: null,
      fetched: false,
    }

    // Simulate fulfilled action
    const action = {
      type: fetchTeams.fulfilled.type,
      payload: mockTeams,
    }

    const newState = teamsReducer(state, action)
    expect(newState.list).toEqual(mockTeams)
    expect(newState.fetched).toBe(true)
  })
})
```

---

## Summary of Changes Per Component

| Component | Removals | Additions |
|-----------|----------|-----------|
| **App.tsx** | 4 useState + 1 callback | useAppDispatch, useAppSelector |
| **MainLayout.tsx** | 6 props, 1 useState | Just children prop |
| **SideNav.tsx** | 2 useState, 1 useEffect, 7 props | useAppDispatch, useAppSelector |
| **RosterTable.tsx** | 3 useState, 2 useEffect | useAppDispatch, useAppSelector |
| **ProfileSettings.tsx** | 1 useEffect | useAppSelector |
| **UserManagement.tsx** | 1 useEffect | useAppDispatch, useAppSelector |
| **TeamManagement.tsx** | 1 useEffect | useAppSelector |
| **PositionManager.tsx** | 1 useEffect | useAppSelector |

**Total LOC Reduction: ~300-400 lines** (mainly prop drilling and repeated fetches)

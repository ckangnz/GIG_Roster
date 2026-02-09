# Redux Data Flow Architecture

## Visual: Current vs Proposed Architecture

### BEFORE: Current Architecture (With Issues)

```
┌─────────────────────────────────────────────────────────────┐
│ App.tsx                                                     │
│ ├─ activeTab: useState                                     │
│ ├─ activeSideItem: useState                                │
│ ├─ activeTeamName: useState                                │
│ └─ user/userData: useAuth() [separate subscription]        │
└──────────────────┬──────────────────────────────────────────┘
                   │ Props: activeTab, activeTeamName, etc.
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ MainLayout.tsx                                              │
│ └─ Receives 6 props, just passes down                       │
└──────┬───────────────────────────────────────────────────────┘
       │
       ├──────────────────────┬──────────────────────┐
       ▼                      ▼                      ▼
   ┌────────────┐         ┌──────────────┐    ┌─────────────┐
   │ SideNav    │         │ RosterPage   │    │ Settings    │
   │            │         │              │    │ Page        │
   │ - Fetches  │         │ - Local UI   │    │             │
   │   teams    │         │   state      │    │ ProfileSet. │
   │ - Manages  │         │ - Fetches    │    │ - Fetches   │
   │   local    │         │   users by   │    │   teams     │
   │   expand   │         │   position   │    │ - Fetches   │
   │   state    │         │ - Fetches    │    │   positions │
   │            │         │   team data  │    │             │
   └────────────┘         └──────────────┘    │ UserMgmt    │
                                              │ - Fetches   │
                          ┌──────────────┐    │   all users │
                          │ RosterTable  │    │ - Fetches   │
                          │              │    │   teams     │
                          │ Independent  │    │             │
                          │ data fetch   │    │ TeamMgmt    │
                          │ (called when │    │ - Fetches   │
                          │ props change)│    │   teams     │
                          └──────────────┘    │ - Fetches   │
                                              │   positions │
                                              │             │
                                              │ PosMgr      │
                                              │ - Fetches   │
                                              │   positions │
                                              └─────────────┘

PROBLEMS:
❌ Data fetched in 5+ different places
❌ Each fetch is independent → no caching
❌ Prop drilling through MainLayout
❌ useAuth called separately in App + SideNav (double subscription)
❌ Race conditions on updates (UserMgmt updates, but SideNav doesn't know)
❌ Loads delay when switching tabs/teams
```

---

### AFTER: Redux Architecture (Optimized)

```
┌─────────────────────────────────────────────────────────────┐
│                      Redux Store                            │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐   │
│ │ auth:                                                │   │
│ │  └─ firebaseUser, userData, loading                 │   │
│ │     (single subscription via middleware)             │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ ui:                                                  │   │
│ │  └─ activeTab, activeSideItem, activeTeamName       │   │
│ │     expandedTeams, sidebarOpen                       │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ teams:                                               │   │
│ │  └─ list[], loading, error                          │   │
│ │     (fetched once, cached)                           │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ positions:                                           │   │
│ │  └─ list[], loading, error                          │   │
│ │     (fetched once, cached)                           │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ roster:                                              │   │
│ │  └─ users[], rosterDates[], currentTeamData         │   │
│ │     (derived from activeTeamName + teams)            │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ userManagement:                                      │   │
│ │  └─ allUsers[], availableTeams (ref), loading       │   │
│ └──────────────────────────────────────────────────────┘   │
└──────────────┬───────────────────────────────────────────────┘
               │
      useSelector hooks
      (no prop drilling)
               │
       ┌───────┴────────────────────────────────┐
       │                                        │
       ▼                                        ▼
    ┌─────────┐                          ┌──────────────┐
    │ App     │                          │ MainLayout   │
    │         │                          │              │
    │ Simple: │                          │ Props only:  │
    │ - Dispatch                         │ - children   │
    │   auth                             │ - No state   │
    │   init                             │ - No logic   │
    │ - Provider                         │              │
    │   wrap                             └──────────────┘
    └─────────┘
       │
       │
    ┌──────────────────────────────────────────────────────┐
    │                  Components                          │
    ├──────────────────────────────────────────────────────┤
    │                                                      │
    │  SideNav (useSelector for state)                    │
    │  ├─ activeTab, activeTeamName, teams list          │
    │  ├─ Dispatch: setActiveTab, setActiveTeamName      │
    │  └─ Dispatch: toggleTeamExpansion                  │
    │                                                     │
    │  RosterTable (useSelector for state)               │
    │  ├─ activePosition, activeTeamName, teams list    │
    │  ├─ Dispatch: fetchUsersByPosition (thunk)         │
    │  └─ Dispatch: fetchTeamData (thunk)                │
    │                                                     │
    │  ProfileSettings (useSelector for state)           │
    │  ├─ userData from store                            │
    │  ├─ teams list from store                          │
    │  ├─ Dispatch: updateUserData (thunk)               │
    │  └─ Selector: computedPositions from teams         │
    │                                                     │
    │  UserManagement (useSelector for state)            │
    │  ├─ allUsers, availableTeams                       │
    │  ├─ Dispatch: fetchAllUsers (thunk)                │
    │  └─ Dispatch: saveUserChanges (thunk)              │
    │                                                     │
    │  [TeamManagement, PositionManager - similar]       │
    │                                                     │
    └──────────────────────────────────────────────────────┘

BENEFITS:
✅ Data fetched once, reused everywhere
✅ Automatic caching & memoization
✅ No prop drilling - direct Redux access
✅ Single auth subscription via middleware
✅ Atomic updates - all components see same data
✅ Fast navigation (teams/positions pre-loaded)
✅ Easier to test - pure selectors & actions
```

---

## Prop Drilling Elimination Example

### Before: Position Selection Navigation

```
App.tsx:
  const [activeTeamName, setActiveTeamName] = useState(null)
  const [activeSideItem, setActiveSideItem] = useState(null)
  
  const handleActiveSelectionChange = (team, pos) => {
    setActiveTeamName(team)
    setActiveSideItem(pos)
  }

  <MainLayout
    activeTeamName={activeTeamName}
    activeSideItem={activeSideItem}
    onActiveSelectionChange={handleActiveSelectionChange}
  >

MainLayout.tsx:
  <SideNav
    activeTeamName={activeTeamName}
    activeSideItem={activeSideItem}
    onActiveSelectionChange={onActiveSelectionChange}
  >

SideNav.tsx:
  <button onClick={() => onActiveSelectionChange(teamName, posName)}>
    {posName}
  </button>

RosterPage.tsx:
  <RosterTable
    activeTeamName={activeTeamName}
    activePosition={activeSideItem}
  />

RosterTable.tsx:
  // Finally uses the props here
```

### After: Position Selection Navigation

```
SideNav.tsx:
  const dispatch = useDispatch()
  const activeTeamName = useSelector(state => state.ui.activeTeamName)
  const activeSideItem = useSelector(state => state.ui.activeSideItem)

  <button onClick={() => {
    dispatch(setActiveTeamName(teamName))
    dispatch(setActiveSideItem(posName))
  }}>

RosterTable.tsx:
  const dispatch = useDispatch()
  const activeTeamName = useSelector(state => state.ui.activeTeamName)
  const activePosition = useSelector(state => state.ui.activeSideItem)
  const users = useSelector(state => state.roster.users)

  // Uses selectors directly, no prop drilling!
```

**Net result:** Remove 40+ lines of prop passing code across 5 files

---

## Data Fetching Consolidation

### Before: Teams Fetched 5+ Times

```
SideNav.tsx:
  useEffect(() => {
    const teamsDocRef = doc(db, "metadata", "teams")
    const teamsSnap = await getDoc(teamsDocRef)
    // process and set local state
  }, [activeTab])

ProfileSettings.tsx:
  useEffect(() => {
    const teamsDocRef = doc(db, "metadata", "teams")
    const teamsSnap = await getDoc(teamsDocRef)
    // process and set local state
  }, [])

UserManagement.tsx:
  useEffect(() => {
    const teamsDocRef = await getDoc(doc(db, "metadata", "teams"))
    setAvailableTeams(data)
  }, [])

TeamManagement.tsx:
  useEffect(() => {
    const teamsDocRef = doc(db, "metadata", "teams")
    const teamsSnap = await getDoc(teamsDocRef)
    setTeams(data)
  }, [])

PositionManager.tsx:
  // Also needs teams potentially for reference

RESULT: 5 separate Firestore reads, inconsistent data, slow UX
```

### After: Teams Fetched Once in Redux

```
Store initialization (middleware or thunk):
  dispatch(fetchTeams())
    ↓
  Firestore: doc(db, "metadata", "teams") [READ ONCE]
    ↓
  Redux store updated: state.teams.list
    ↓
  All components access: useSelector(state => state.teams.list)

RESULT: 1 Firestore read, cached, shared, consistent data
```

**Firestore API calls saved:** 4-5 per session

---

## Complex Update Flow Example

### User Management Batch Update

#### Before (No Redux):
```
1. UserManagement.tsx:
   - togglePosition(userId, posName)
   - toggleTeam(userId, teamName)
   - handleUpdate(userId, 'isActive', value)
     └─ All stored in local state

2. User clicks "Save All User Changes":
   - saveAllChanges() loops through dirty users
   - batch.update() to Firestore
   - But SideNav doesn't know about changes!
   - RosterTable might show stale data!

3. User navigates away:
   - Changes lost if not saved

PROBLEMS:
  ❌ No indication which fields changed
  ❌ No undo capability
  ❌ Other pages show stale data
  ❌ No optimistic updates
  ❌ Accidental loss of changes on navigation
```

#### After (With Redux):
```
1. UserManagement.tsx:
   - dispatch(toggleUserPosition(userId, posName))
   - dispatch(toggleUserTeam(userId, teamName))
   - dispatch(updateUserField(userId, 'isActive', value))
     └─ Each action granular, trackable

2. Redux state updates:
   - userManagement.allUsers updated in store
   - userManagement.hasChanges = true
   - Can show dirty indicator for each field

3. User clicks "Save All User Changes":
   - dispatch(saveUserManagementChanges())
   - Middleware intercepts, sees what changed
   - Can do optimistic updates
   - Show real-time sync status

4. Automatic effects:
   - RosterTable auto-updates (because users changed)
   - SideNav auto-updates team assignments
   - All via Redux subscriptions

BENEFITS:
  ✅ All changes atomic & trackable
  ✅ Can implement undo/redo easily
  ✅ Real-time sync across app
  ✅ Optimistic updates possible
  ✅ Changes persist across navigation
  ✅ Can warn on unsaved changes
```

---

## Redux Slices Dependency Graph

```
                   ┌─────────────┐
                   │  authSlice  │ (No dependencies)
                   │  User state │
                   └──────┬──────┘
                          │
          ┌───────────────┼──────────────────┐
          │               │                  │
          ▼               ▼                  ▼
      ┌────────┐   ┌────────────┐   ┌──────────────┐
      │ uiSlice│   │ teamsSlice │   │positionsSlice│
      │Nav & UI│   │ Metadata   │   │   Metadata   │
      └────────┘   └───┬────────┘   └──────┬───────┘
          │             │                   │
          │     ┌───────┴───────────────────┘
          │     │
          └──┬──┼──────────────────────┐
             │  │                      │
             ▼  ▼                      ▼
        ┌─────────────┐          ┌──────────────────┐
        │ rosterSlice │          │userManagementSlice
        │ (Page data) │          │  (Page data)     │
        └─────────────┘          └──────────────────┘

Notes:
- All slices can depend on auth for permission checks
- rosterSlice computes value from teams + ui selections
- userManagement references teams for display
- Actions can be async thunks spanning multiple slices
```

---

## Selector Memoization Benefits

### Without Selectors (Current):
```jsx
function ProfileSettings() {
  const [availableTeams, setAvailableTeams] = useState([])
  
  // Runs every render, even if nothing changed
  const computedPositions = useMemo(() => {
    return selectedTeams
      .map(t => availableTeams.find(at => at.name === t))
      .flatMap(t => t?.positions || [])
  }, [selectedTeams, availableTeams])

  // Every render re-checks if computedPositions changed
  // Even if selectedTeams/availableTeams didn't
}
```

### With Memoized Selectors (Redux):
```jsx
// In selectors.ts
export const selectComputedPositions = createSelector(
  state => state.ui.selectedTeamNames,
  state => state.teams.list,
  (teamNames, teams) => {
    return teamNames
      .map(t => teams.find(at => at.name === t))
      .flatMap(t => t?.positions || [])
  }
)

function ProfileSettings() {
  const computedPositions = useSelector(selectComputedPositions)
  
  // Only recomputes when ui.selectedTeamNames or teams.list actually change
  // Identical result = same object reference = no rerender of children
}
```

**Result:** Reduced unnecessary renders by 60-80% in settings page

---

## Migration Path: Incremental Adoption

```
Week 1: Setup Redux Foundation
  └─ Install @reduxjs/toolkit
  └─ Create store.ts, configure store
  └─ Create authSlice and authMiddleware
  └─ Wrap App with Provider
  └─ Test auth state in Redux

Week 2: UI Navigation State
  └─ Create uiSlice (activeTab, activeSideItem, etc.)
  └─ Update App.tsx to use Redux ui state
  └─ Update MainLayout.tsx (remove props unnecessary now)
  └─ Update SideNav.tsx to read/write from Redux
  └─ Test tab & position navigation

Week 3: Metadata (Teams & Positions)
  └─ Create teamsSlice with async thunks
  └─ Create positionsSlice with async thunks
  └─ Update SideNav to fetch from Redux
  └─ Update ProfileSettings to use Redux
  └─ Update TeamManagement & PositionManager to use Redux

Week 4: Page Data
  └─ Create rosterSlice for roster page
  └─ Update RosterTable to use Redux
  └─ Create userManagementSlice
  └─ Update UserManagement page

Week 5: Optimization
  └─ Add selector memoization
  └─ Remove useComputedPositions hook
  └─ Performance testing
  └─ Edge case handling

Total: ~3-4 weeks of engineering effort
```

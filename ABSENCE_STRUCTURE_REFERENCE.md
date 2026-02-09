# Absence Structure - Quick Reference

## New Absence Format

```typescript
absence: {
  [userEmail: string]: {
    reason: string
  }
}
```

**Key Concept**: If a user's email appears in the `absence` object, they are absent. If absent, the reason is stored.

---

## Examples

### Example 1: One person absent
```typescript
{
  date: "2026-01-23",
  teamName: "Team A",
  assignments: {
    "alice@example.com": ["Lead Guitar"],
    "bob@example.com": ["Bass"],
    "charlie@example.com": ["Drums"]
  },
  absence: {
    "alice@example.com": {
      reason: "Medical appointment"
    }
  }
}

// Result:
// - Alice: ABSENT (reason: "Medical appointment")
// - Bob: PRESENT
// - Charlie: PRESENT
```

### Example 2: Multiple people absent
```typescript
{
  date: "2026-01-24",
  teamName: "Team A",
  assignments: {
    "alice@example.com": ["Lead Guitar"],
    "bob@example.com": ["Bass"],
    "charlie@example.com": ["Drums"],
    "diana@example.com": ["Backup Vocals"]
  },
  absence: {
    "alice@example.com": {
      reason: "Annual leave"
    },
    "charlie@example.com": {
      reason: "Sick - Flu"
    }
  }
}

// Result:
// - Alice: ABSENT (reason: "Annual leave")
// - Bob: PRESENT
// - Charlie: ABSENT (reason: "Sick - Flu")
// - Diana: PRESENT
```

### Example 3: No one absent
```typescript
{
  date: "2026-01-25",
  teamName: "Team A",
  assignments: { /* ... */ },
  absence: {}  // Empty = everyone is present
}
```

---

## Checking Absence Status (TypeScript)

### Check if person is absent
```typescript
const isAbsent = userEmail in rosterEntry.absence;
// true if email exists in absence object, false otherwise
```

### Get absence reason
```typescript
const reason = rosterEntry.absence[userEmail]?.reason;
// Returns reason string if absent, undefined if present
```

### More defensive check
```typescript
const absence = rosterEntry.absence[userEmail];
if (absence) {
  console.log(`${userEmail} is absent: ${absence.reason}`);
} else {
  console.log(`${userEmail} is present`);
}
```

---

## Selector Example (Redux)

```typescript
export const selectRosterEntryUsers = createSelector(
  [selectRosterEntryForDateAndTeam],
  (entry) => {
    if (!entry) return []

    // Map all assigned users with their absence status
    return Object.entries(entry.assignments).map(([userEmail, positions]) => ({
      userEmail,
      positions,
      isAbsent: userEmail in entry.absence,        // true/false
      absenceReason: entry.absence[userEmail]?.reason || null,  // reason or null
    }))
  }
)
```

**Usage**:
```typescript
const users = useAppSelector(selectRosterEntryUsers)

// In component:
users.map(user => (
  <tr key={user.userEmail}>
    <td>{user.userEmail}</td>
    <td>{user.isAbsent ? '❌ Absent' : '✅ Present'}</td>
    {user.isAbsent && <td>{user.absenceReason}</td>}
  </tr>
))
```

---

## Creating/Updating Absence

### Mark user as absent
```typescript
const rosterEntry: RosterEntry = {
  id: `${date}-${teamName}`,
  date,
  teamName,
  assignments: { /* existing */ },
  absence: {
    "alice@example.com": {
      reason: "Medical appointment"
    }
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}

await dispatch(createOrUpdateRosterEntry({ year, entry }))
```

### Mark user as present (remove from absence)
```typescript
const rosterEntry: RosterEntry = {
  id: `${date}-${teamName}`,
  date,
  teamName,
  assignments: { /* existing */ },
  absence: {},  // Remove the user by updating absence
  createdAt: new Date(),
  updatedAt: new Date(),
}

await dispatch(createOrUpdateRosterEntry({ year, entry }))
```

### Add new absence to existing entry
```typescript
// Get existing entry
const existingEntry = store.getState().rosterData.entries.get(date)

// Update with new absence
const updatedEntry: RosterEntry = {
  ...existingEntry,
  absence: {
    ...existingEntry.absence,
    "bob@example.com": {
      reason: "Annual leave"
    }
  },
  updatedAt: new Date(),
}

await dispatch(createOrUpdateRosterEntry({ year, entry: updatedEntry }))
```

---

## Firestore Storage

### JSON in Firestore
```json
{
  "date": "2026-01-23",
  "teamName": "Team A",
  "assignments": {
    "alice@example.com": ["Lead Guitar"],
    "bob@example.com": ["Bass"]
  },
  "absence": {
    "alice@example.com": {
      "reason": "Medical appointment"
    }
  },
  "createdAt": Timestamp(2026, 1, 23, 9, 0, 0),
  "updatedAt": Timestamp(2026, 1, 23, 9, 0, 0)
}
```

---

## Benefits of This Structure

✅ **Clear semantics** - Presence of key = absence (no boolean confusion)
✅ **Stores reason** - Know why someone is absent
✅ **Easy queries** - "Who's absent on date X?" = get keys from absence object
✅ **Scalable** - Can add more fields to absence (approver notes, etc.)
✅ **Space efficient** - Only stores absent people (not everyone)
✅ **Type safe** - TypeScript ensures reason is always provided

---

## Common Patterns

### Pattern 1: Display roster with absence indicators
```typescript
const RosterTable = () => {
  const users = useAppSelector(selectRosterEntryUsers)

  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Status</th>
          <th>Reason</th>
          <th>Positions</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.userEmail} className={user.isAbsent ? 'absent' : ''}>
            <td>{user.userEmail}</td>
            <td>{user.isAbsent ? '❌ Absent' : '✅ Present'}</td>
            <td>{user.absenceReason || '-'}</td>
            <td>{user.positions.join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### Pattern 2: Toggle absence (UI interaction)
```typescript
const toggleAbsence = async (userEmail: string, reason?: string) => {
  const existingEntry = currentRosterEntry
  
  let updatedAbsence = { ...existingEntry.absence }
  
  if (userEmail in updatedAbsence) {
    // User is absent, mark as present
    delete updatedAbsence[userEmail]
  } else {
    // User is present, mark as absent
    updatedAbsence[userEmail] = {
      reason: reason || "No reason provided"
    }
  }
  
  const updatedEntry: RosterEntry = {
    ...existingEntry,
    absence: updatedAbsence,
    updatedAt: new Date(),
  }
  
  await dispatch(createOrUpdateRosterEntry({ year, entry: updatedEntry }))
}
```

### Pattern 3: Filter users by status
```typescript
const users = useAppSelector(selectRosterEntryUsers)

const absentUsers = users.filter(u => u.isAbsent)
const presentUsers = users.filter(u => !u.isAbsent)

console.log(`${presentUsers.length} present, ${absentUsers.length} absent`)
```

---

## Summary

- **Structure**: `absence: { [email]: { reason: string } }`
- **Check absent**: `userEmail in entry.absence`
- **Get reason**: `entry.absence[userEmail]?.reason`
- **Add to absence**: Set the key with reason object
- **Remove from absence**: Delete the key
- **Empty absence**: `absence: {}` means everyone is present

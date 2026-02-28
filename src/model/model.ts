export type Gender = "Male" | "Female" | "";
export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type RosterMode = "daily" | "slotted";

export interface Organisation {
  id: string;
  name: string;
  ownerId: string; // userUid of the creator
  createdAt: number;
  settings?: {
    allowUserRegistration?: boolean;
    requireApproval?: boolean;
  };
}

export interface RosterSlot {
  id: string;
  label: string; // e.g. "Shift 1", "08:00 - 08:15"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface AppUser {
  id?: string;
  name: string | null;
  email: string | null;
  orgId: string | null; // Multi-tenancy scoping
  teams: string[];
  teamPositions?: Record<string, string[]>; // teamId -> positionIds[]
  indexedAssignments?: string[]; // ["TeamId|PositionId", ...]
  gender: string;
  isApproved: boolean;
  isAdmin: boolean;
  isActive: boolean;
}

export interface RecurringEvent {
  id: string;
  label: string;
  day: Weekday;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface Team {
  id: string;
  orgId: string; // Scoped to an organisation
  name: string;
  emoji: string;
  positions: string[]; // Store IDs only for proper relational mapping
  preferredDays: Weekday[];
  dayEndTimes?: Partial<Record<Weekday, string>>;
  maxConflict: number;
  allowAbsence?: boolean;
  recurringEvents?: RecurringEvent[];
  // Granular Time Support
  rosterMode?: RosterMode; // Default to 'daily'
  slots?: RosterSlot[]; // Template for slots if mode is 'slotted'
}

export interface Position {
  id: string;
  orgId: string; // Scoped to an organisation
  name: string;
  emoji: string;
  colour: string;
  parentId?: string;
  sortByGender?: boolean;
  isCustom?: boolean;
  customLabels?: string[];
}

export interface Absence {
  reason: string;
}

export interface ThoughtEntry {
  id: string;
  text: string;
  hearts: Record<string, number>; // userUid -> lastHeartTimestamp
  updatedAt: number;
  isExpired?: boolean;
}

export interface Thought {
  id: string; // userUid_teamId
  orgId: string; // Scoped to an organisation
  userUid: string;
  userName: string;
  teamName: string; // This stores teamId
  entries?: ThoughtEntry[];
  updatedAt: number;
  text?: string;
  hearts?: Record<string, number>;
}

// Assignments for a single day OR a single slot
export type UserAssignments = Record<string, string[]>; // userEmail/uid -> positionIds[]

// Wrapper for a team's data within a roster date
export interface TeamRosterData {
  type: RosterMode;
  // If 'daily': assignments is Record<userEmail, positionIds[]>
  // If 'slotted': slots is Record<slotId, Record<userEmail, positionIds[]>>
  assignments?: UserAssignments; 
  slots?: Record<string, UserAssignments>;
}

export interface CoverageRequest {
  orgId: string; // Scoped to an organisation
  teamName: string; // This stores teamId
  positionName: string; // This stores positionId
  absentUserEmail: string;
  absentUserName?: string;
  requestedAt: number;
  status: "open" | "resolved" | "dismissed";
  resolvedByEmail?: string;
  slotId?: string; // Optional: reference to a specific time slot
}

export interface RosterEntry {
  id: string; // Document ID (usually date)
  orgId: string; // Scoped to an organisation
  date: string; // YYYY-MM-DD
  eventName?: string; // Special occasion name
  // teamId -> TeamRosterData
  teams: Record<string, TeamRosterData | UserAssignments>; 
  absence: Record<string, Absence>; // userIdentifier -> { reason }
  coverageRequests?: Record<string, CoverageRequest>;
  updatedAt?: number;
}

/**
 * Type guard to distinguish between TeamRosterData container and legacy UserAssignments.
 */
export const isTeamRosterData = (data: TeamRosterData | UserAssignments): data is TeamRosterData => {
  return (data as TeamRosterData).type !== undefined;
};

/**
 * Safely extracts user assignments for a specific team from a roster entry.
 * Handles both legacy flat structures and new TeamRosterData containers.
 */
export const getAssignmentsForTeam = (
  entry: RosterEntry, 
  teamId: string
): UserAssignments => {
  const teamData = entry.teams[teamId];
  if (!teamData) return {};
  
  if (isTeamRosterData(teamData)) {
    if (teamData.type === 'daily') {
      return teamData.assignments || {};
    }
    // For 'slotted', we combine all slot assignments for compatibility with daily views
    if (teamData.type === 'slotted' && teamData.slots) {
      const combined: UserAssignments = {};
      Object.values(teamData.slots).forEach(slotAssignments => {
        Object.entries(slotAssignments).forEach(([email, posIds]) => {
          if (!combined[email]) combined[email] = [];
          combined[email] = Array.from(new Set([...combined[email], ...posIds]));
        });
      });
      return combined;
    }
    return {};
  }
  
  // Legacy flat structure
  return teamData;
};

/**
 * Safely extracts absence information for a specific user from a roster entry.
 */
export const getAbsenceForUser = (
  entry: RosterEntry | undefined,
  userIdentifier: string
): Absence | null => {
  if (!entry || !entry.absence) return null;
  return entry.absence[userIdentifier] || null;
};

export const generateIndexedAssignments = (
  teamPositions: Record<string, string[]>,
): string[] => {
  const indexed: string[] = [];
  Object.entries(teamPositions).forEach(([teamId, positionIds]) => {
    positionIds.forEach((posId) => {
      indexed.push(`${teamId}|${posId}`);
    });
  });
  return indexed;
};

export const formatToDateKey = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDisplayDate = (dateString: string): string => {
  const [yyyy, mm, dd] = dateString.split("-");
  return `${dd}-${mm}-${yyyy.slice(-2)}`;
};

export const getTodayKey = (): string => {
  const nzDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return nzDate;
};

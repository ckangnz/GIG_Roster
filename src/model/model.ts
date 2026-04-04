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
  visibility: "public" | "private";
  subscription?: {
    plan: "free" | "pro" | "enterprise" | "super";
    expiresAt?: number;
  };
  settings?: {
    allowUserRegistration?: boolean;
    requireApproval?: boolean;
  };
}

export interface RosterSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

export interface OrgMembership {
  id?: string;
  isActive: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  teams: string[];
  teamPositions?: Record<string, string[]>;
  indexedAssignments?: string[];
  preferredLanguage?: string;
}

export interface AppUser {
  id?: string;
  name: string | null;
  email: string | null;
  organisations:
    | Record<
        string,
        { isActive: boolean; isAdmin: boolean; isApproved: boolean }
      >
    | string[];
  gender: string;
  photoURL?: string | null;
  hidePhoto?: boolean;
}

export interface AppUserWithMembership extends AppUser {
  activeOrgId: string | null;
  orgId: string | null; // backward compatibility
  isAdmin: boolean;
  isApproved: boolean;
  isActive: boolean;
  teams: string[];
  teamPositions: Record<string, string[]>;
  indexedAssignments: string[];
  preferredLanguage: string;
}

export interface RecurringEvent {
  id: string;
  label: string;
  day: Weekday;
  startTime: string;
  endTime: string;
}

export interface Team {
  id: string;
  orgId: string;
  name: string;
  emoji: string;
  positions: string[];
  preferredDays: Weekday[];
  dayEndTimes?: Partial<Record<Weekday, string>>;
  maxConflict: number;
  allowAbsence?: boolean;
  recurringEvents?: RecurringEvent[];
  rosterMode?: RosterMode;
  slots?: RosterSlot[];
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
  id: string;
  orgId: string;
  userUid: string;
  userName: string;
  teamName: string;
  entries?: ThoughtEntry[];
  updatedAt: number;
  text?: string;
  hearts?: Record<string, number>;
}

export type UserAssignments = Record<string, string[]>;

export interface TeamRosterData {
  type: RosterMode;
  assignments?: UserAssignments;
  slots?: Record<string, UserAssignments>;
}

export interface CoverageRequest {
  orgId: string;
  teamName: string;
  positionName: string;
  absentUserEmail: string;
  absentUserName?: string;
  requestedAt: number;
  status: "open" | "resolved" | "dismissed";
  resolvedByEmail?: string;
  slotId?: string;
}

export interface RosterEntry {
  id: string;
  orgId: string;
  date: string;
  eventName?: string;
  teams: Record<string, TeamRosterData | UserAssignments>;
  absence: Record<string, Absence>;
  coverageRequests?: Record<string, CoverageRequest>;
  updatedAt?: number;
}

/**
 * Type guard to distinguish between TeamRosterData container and legacy UserAssignments.
 */
export const isTeamRosterData = (
  data: TeamRosterData | UserAssignments,
): data is TeamRosterData => {
  return (data as TeamRosterData).type !== undefined;
};

/**
 * Safely extracts user assignments for a specific team from a roster entry.
 * Handles both legacy flat structures and new TeamRosterData containers.
 */
export const getAssignmentsForTeam = (
  entry: RosterEntry,
  teamId: string,
): UserAssignments => {
  const teamData = entry.teams[teamId];
  if (!teamData || typeof teamData !== "object") return {};

  if (isTeamRosterData(teamData)) {
    if (teamData.type === "daily") {
      return teamData.assignments || {};
    }
    // For 'slotted', we combine all slot assignments for compatibility with daily views
    if (teamData.type === "slotted" && teamData.slots) {
      const combined: UserAssignments = {};
      Object.values(teamData.slots).forEach((slotAssignments) => {
        if (slotAssignments && typeof slotAssignments === "object") {
          Object.entries(slotAssignments).forEach(([email, posIds]) => {
            if (Array.isArray(posIds)) {
              if (!combined[email]) combined[email] = [];
              combined[email] = Array.from(
                new Set([...combined[email], ...posIds]),
              );
            }
          });
        }
      });
      return combined;
    }
    return {};
  }

  // Legacy flat structure - verify it's a Record<string, string[]>
  const assignments: UserAssignments = {};
  Object.entries(teamData).forEach(([email, posIds]) => {
    if (Array.isArray(posIds)) {
      assignments[email] = posIds;
    }
  });
  return assignments;
};

/**
 * Safely extracts absence information for a specific user from a roster entry.
 */
export const getAbsenceForUser = (
  entry: RosterEntry | undefined,
  userIdentifier: string,
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

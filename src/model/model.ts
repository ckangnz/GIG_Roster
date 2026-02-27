export type Gender = "Male" | "Female" | "";
export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface AppUser {
  id?: string;
  name: string | null;
  email: string | null;
  teams: string[];
  teamPositions?: Record<string, string[]>; // teamName -> positionNames[]
  indexedAssignments?: string[]; // ["TeamName|PositionName", ...]
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
  name: string;
  emoji: string;
  positions: Position[];
  preferredDays: Weekday[];
  dayEndTimes?: Partial<Record<Weekday, string>>;
  maxConflict: number;
  allowAbsence?: boolean;
  recurringEvents?: RecurringEvent[];
}

export interface Position {
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
  id: string; // userUid_teamName
  userUid: string;
  userName: string;
  teamName: string;
  entries?: ThoughtEntry[]; // NEW
  updatedAt: number;
  
  /** 
   * LEGACY SUPPORT - To be removed after March 2026 
   * Migration logic is in thoughtsSlice.ts -> normalizeThought
   */
  text?: string;
  hearts?: Record<string, number>;
}

export type TeamAssignments = Record<string, string[]>; // userEmail/uid -> positionNames[]

export interface CoverageRequest {
  teamName: string;
  positionName: string;
  absentUserEmail: string;
  absentUserName?: string;
  requestedAt: number;
  status: "open" | "resolved" | "dismissed";
  resolvedByEmail?: string;
}

export interface RosterEntry {
  id: string; // Document ID (usually date)
  date: string; // YYYY-MM-DD
  eventName?: string; // Special occasion name
  teams: Record<string, TeamAssignments>; // teamName -> { userIdentifier -> positions[] }
  absence: Record<string, Absence>; // userIdentifier -> { reason }
  coverageRequests?: Record<string, CoverageRequest>; // key: teamName_positionName_userEmail
  updatedAt?: number;
}

export const generateIndexedAssignments = (
  teamPositions: Record<string, string[]>,
): string[] => {
  const indexed: string[] = [];
  Object.entries(teamPositions).forEach(([teamName, positions]) => {
    positions.forEach((posName) => {
      indexed.push(`${teamName}|${posName}`);
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
  // Always calculate "Today" relative to NZ time (Pacific/Auckland)
  const nzDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // en-CA returns YYYY-MM-DD
  return nzDate;
};

export type Gender = "Male" | "Female" | "";

export interface AppUser {
  name: string | null;
  email: string | null;
  positions: string[];
  gender: string;
  isApproved: boolean;
  isAdmin: boolean;
  isActive: boolean;
}

export interface Position {
  name: string;
  emoji: string;
  colour: string;
}

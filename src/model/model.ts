export interface AppUser {
  name: string | null;
  email: string | null;
  isApproved: boolean;
  isAdmin: boolean;
  isActive: boolean;
  positions: string[];
  gender: string;
}

export interface Position {
  name: string;
  emoji: string;
  colour: string;
}

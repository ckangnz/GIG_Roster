export interface AppUser {
  name: string | null;
  email: string | null;
  isApproved: boolean;
  isAdmin: boolean;
  isActive: boolean;
  roles: string[];
  gender: string;
}

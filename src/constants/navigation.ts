import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  User, 
  Users, 
  Trophy, 
  Music 
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export enum AppTab {
  DASHBOARD = "dashboard",
  ROSTER = "roster",
  SETTINGS = "settings",
}

export enum SettingsSection {
  PROFILE = "Profile",
  USER_MANAGEMENT = "Users",
  POSITIONS = "Positions",
  TEAMS = "Teams",
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: AppTab.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
  { id: AppTab.ROSTER, label: "Roster", icon: Calendar },
  { id: AppTab.SETTINGS, label: "Settings", icon: Settings },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { id: SettingsSection.PROFILE, label: "My Profile", icon: User },
  {
    id: SettingsSection.USER_MANAGEMENT,
    label: "User Management",
    icon: Users,
    adminOnly: true,
  },
  {
    id: SettingsSection.TEAMS,
    label: "Team Management",
    icon: Trophy,
    adminOnly: true,
  },
  {
    id: SettingsSection.POSITIONS,
    label: "Position Setup",
    icon: Music,
    adminOnly: true,
  },
];

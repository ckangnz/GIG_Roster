import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  User, 
  Users, 
  Trophy, 
  IdCardLanyard,
  MessageSquareHeart,
  Building2
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export enum AppTab {
  DASHBOARD = "dashboard",
  ROSTER = "roster",
  THOUGHTS = "thoughts",
  SETTINGS = "settings",
}

export enum SettingsSection {
  PROFILE = "profile",
  ORGANISATIONS = "organisations",
  USER_MANAGEMENT = "user_management",
  POSITIONS = "position_management",
  TEAMS = "team_management",
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
  { id: AppTab.THOUGHTS, label: "Thoughts", icon: MessageSquareHeart },
  { id: AppTab.SETTINGS, label: "Settings", icon: Settings },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { id: SettingsSection.PROFILE, label: "My Profile", icon: User },
  { id: SettingsSection.ORGANISATIONS, label: "Organisations", icon: Building2 },
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
    label: "Position Management",
    icon: IdCardLanyard,
    adminOnly: true,
  },
];

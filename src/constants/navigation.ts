export enum AppTab {
  ROSTER = "roster",
  SETTINGS = "settings",
}

export enum SettingsSection {
  PROFILE = "Profile",
  USER_MANAGEMENT = "Users",
  POSITIONS = "Positions",
  TEAMS = "Teams",
}

export const BOTTOM_NAV_ITEMS = [
  { id: AppTab.ROSTER, label: "Roster", icon: "🗓️" },
  { id: AppTab.SETTINGS, label: "Settings", icon: "⚙️" },
];

export const SETTINGS_NAV_ITEMS = [
  { id: SettingsSection.PROFILE, label: "My Profile", icon: "👤" },
  {
    id: SettingsSection.USER_MANAGEMENT,
    label: "User Management",
    icon: "👥",
    adminOnly: true,
  },
  {
    id: SettingsSection.TEAMS,
    label: "Team Management",
    icon: "🏆",
    adminOnly: true,
  },
  {
    id: SettingsSection.POSITIONS,
    label: "Position Setup",
    icon: "🎹",
    adminOnly: true,
  },
];

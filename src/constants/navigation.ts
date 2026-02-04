export enum AppTab {
  ROSTER = "roster",
  SETTINGS = "settings",
}

export enum SettingsSection {
  PROFILE = "Profile",
  USERS = "Users",
  POSITIONS = "Positions",
}

export const BOTTOM_NAV_ITEMS = [
  { id: AppTab.ROSTER, label: "Roster", icon: "🗓️" },
  { id: AppTab.SETTINGS, label: "Settings", icon: "⚙️" },
];

export const SETTINGS_NAV_ITEMS = [
  { id: SettingsSection.PROFILE, label: "My Profile", icon: "👤" },
  {
    id: SettingsSection.USERS,
    label: "User Management",
    icon: "👥",
    adminOnly: true,
  },
  {
    id: SettingsSection.POSITIONS,
    label: "Position Setup",
    icon: "🎹",
    adminOnly: true,
  },
];

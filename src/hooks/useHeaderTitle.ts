import { useMemo } from "react";

import { useTranslation } from "react-i18next";
import { useLocation, matchPath } from "react-router-dom";

import { useAppSelector } from "./redux";
import { AppTab, BOTTOM_NAV_ITEMS } from "../constants/navigation";
import { safeDecode } from "../utils/stringUtils";

/**
 * Shared hook to determine the consistent header title across SideNav (tablet)
 * and MobileHeader (mobile). Centralizes route detection and name resolution.
 */
export const useHeaderTitle = () => {
  const { t } = useTranslation();
  const location = useLocation();

  // 1. Data Selectors
  const { teams: allTeams, fetched: teamsFetched } = useAppSelector(
    (state) => state.teams,
  );
  const { positions: allPositions, fetched: positionsFetched } = useAppSelector(
    (state) => state.positions,
  );

  // 2. Route Matching
  const rosterFullMatch = matchPath(
    "/app/roster/:teamName/:positionName",
    location.pathname,
  );
  const rosterTeamMatch = matchPath("/app/roster/:teamName", location.pathname);
  const thoughtsFullMatch = matchPath(
    "/app/thoughts/:teamName",
    location.pathname,
  );
  const settingsFullMatch = matchPath(
    "/app/settings/:section",
    location.pathname,
  );

  // 3. Identification Resolution (Team IDs, Position IDs, etc.)
  const activeTeamName = useMemo(
    () =>
      safeDecode(
        rosterFullMatch?.params.teamName ||
          rosterTeamMatch?.params.teamName ||
          thoughtsFullMatch?.params.teamName ||
          "",
      ).trim() || undefined,
    [rosterFullMatch, rosterTeamMatch, thoughtsFullMatch],
  );

  const activeSideItem = useMemo(
    () =>
      safeDecode(
        rosterFullMatch?.params.positionName ||
          settingsFullMatch?.params.section ||
          "",
      ).trim() || undefined,
    [rosterFullMatch, settingsFullMatch],
  );

  const activeTab: AppTab = useMemo(
    () =>
      location.pathname.includes("/settings")
        ? AppTab.SETTINGS
        : location.pathname.includes("/thoughts")
          ? AppTab.THOUGHTS
          : location.pathname.includes("/dashboard")
            ? AppTab.DASHBOARD
            : AppTab.ROSTER,
    [location.pathname],
  );

  // 4. Title Logic
  const headerTitle = useMemo(() => {
    // --- Helper: Tab Label (e.g., "Roster", "Thoughts") ---
    const tabInfo = BOTTOM_NAV_ITEMS.find((item) => item.id === activeTab);
    const tabLabel = tabInfo
      ? t(`nav.${tabInfo.id.toLowerCase()}`, { defaultValue: tabInfo.label })
      : "GIG ROSTER";

    // --- Helper: Resolution ---
    const foundTeam = allTeams.find(
      (t) => t.id === activeTeamName || t.name === activeTeamName,
    );
    const foundPos = allPositions.find(
      (p) => p.id === activeSideItem || p.name === activeSideItem,
    );

    // --- State: Loading ---
    const isTeamLoading = activeTeamName?.includes("-") && !teamsFetched;
    const isPosLoading = activeSideItem?.includes("-") && !positionsFetched;
    if (isTeamLoading || isPosLoading) {
      return `${tabLabel} • ${t("common.loading")}`;
    }

    // --- Resolved Strings ---
    const teamName = foundTeam?.name || activeTeamName;
    const sideItemName =
      activeSideItem === "All" ? t("nav.all") : foundPos?.name || activeSideItem;

    // --- Dashboard ---
    if (activeTab === AppTab.DASHBOARD) {
      return tabLabel;
    }

    // --- Thoughts ---
    if (activeTab === AppTab.THOUGHTS) {
      return teamName ? `${tabLabel} • ${teamName}` : tabLabel;
    }

    // --- Settings ---
    if (activeTab === AppTab.SETTINGS) {
      if (!activeSideItem) return tabLabel;

      const keyMap: Record<string, string> = {
        Users: "user_management",
        Positions: "position_management",
        Teams: "team_management",
        Profile: "profile",
        Organisations: "organisations",
      };
      const normalizedKey =
        keyMap[activeSideItem] ||
        activeSideItem.toLowerCase().replace(/-/g, "_");
      const settingsLabel = t(`settings.${normalizedKey}`, {
        defaultValue: sideItemName,
      });

      return `${tabLabel} • ${settingsLabel}`;
    }

    // --- Roster (Default) ---
    if (teamName && sideItemName) {
      return `${teamName} • ${sideItemName}`;
    }
    return teamName || tabLabel;
  }, [
    activeTab,
    activeTeamName,
    activeSideItem,
    allTeams,
    allPositions,
    teamsFetched,
    positionsFetched,
    t,
  ]);

  return {
    headerTitle,
    activeTab,
    activeTeamName,
    activeSideItem,
  };
};

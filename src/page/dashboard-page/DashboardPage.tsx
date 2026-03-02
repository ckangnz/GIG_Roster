import {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
  Fragment,
} from "react";

import { CopyIcon, CheckCircle2, CalendarPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import ActionSheet from "../../components/common/ActionSheet";
import Button from "../../components/common/Button";
import ExpiryTimer from "../../components/common/ExpiryTimer";
import NameTag from "../../components/common/NameTag";
import Spinner from "../../components/common/Spinner";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
  Weekday,
  AppUser,
  getTodayKey,
  RecurringEvent,
  Team,
  getAssignmentsForTeam,
} from "../../model/model";
import {
  applyOptimisticAssignment,
  applyOptimisticAbsence,
  applyOptimisticEventName,
  applyOptimisticResolve,
  resolveCoverageRequestRemote,
  syncAssignmentRemote,
  syncAbsenceRemote,
  syncEventNameRemote,
} from "../../store/slices/rosterSlice";
import { getUpcomingDates } from "../../store/slices/rosterViewSlice";
import {
  generateMultiIcsString,
  generateIcsString,
  downloadIcsFile,
} from "../../utils/calendarUtils";

import styles from "./dashboard-page.module.css";

const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetDate = searchParams.get("date");

  const { userData } = useAppSelector((state) => state.auth);
  const orgId = userData?.orgId;
  const teamsState = useAppSelector((state) => state.teams);
  const allTeams = useMemo(
    () => (teamsState?.teams || []).filter((t) => t.orgId === orgId),
    [teamsState?.teams, orgId],
  );

  const { entries, loading: loadingRoster } = useAppSelector(
    (state) => state.roster,
  );
  const positionsState = useAppSelector((state) => state.positions);
  const allPositions = useMemo(
    () => (positionsState?.positions || []).filter((p) => p.orgId === orgId),
    [positionsState?.positions, orgId],
  );

  const { allUsers } = useAppSelector((state) => state.userManagement);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCalendarTeam, setActiveCalendarTeam] = useState<{
    teamName: string;
    dateStr: string;
    events: RecurringEvent[];
    positionName: string;
  } | null>(null);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use ResizeObserver to detect when the container has a width
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const getTeamEndTime = useCallback((team: Team, dateStr: string) => {
    const dateObj = new Date(dateStr);
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(dateObj) as Weekday;
    return team.dayEndTimes?.[dayName] || "23:59";
  }, []);

  const isTeamExpired = useCallback(
    (team: Team, dateStr: string) => {
      const todayKey = getTodayKey();
      if (dateStr !== todayKey) return false;

      const endTimeStr = getTeamEndTime(team, dateStr);
      const [endH, endM] = endTimeStr.split(":").map(Number);

      const now = new Date();
      const nowH = now.getHours();
      const nowM = now.getMinutes();

      return nowH > endH || (nowH === endH && nowM >= endM);
    },
    [getTeamEndTime],
  );

  const rosterDates = useMemo(() => {
    const todayKey = getTodayKey();
    if (!userData?.teams || allTeams.length === 0) return [];

    const userTeams = allTeams.filter(
      (t) => userData.teams.includes(t.id) || userData.teams.includes(t.name),
    );
    const dateSet = new Set<string>();

    userTeams.forEach((team) => {
      const upcoming = getUpcomingDates(team.preferredDays as Weekday[]);
      upcoming.forEach((d) => dateSet.add(d));
    });

    const upcomingDates = Array.from(dateSet).sort();

    if (targetDate && targetDate < todayKey) {
      return [targetDate];
    }

    return upcomingDates.filter((dateStr) => {
      const dateKey = dateStr;
      if (targetDate === dateKey) return true;

      const entry = entries[dateKey];
      if (!entry) return false;

      return userTeams.some((team) => {
        // Check if this specific team has expired if it's today
        if (isTeamExpired(team, dateKey)) return false;

        const teamAssignments = getAssignmentsForTeam(entry, team.id);
        return Object.values(teamAssignments).some(
          (posList) => Array.isArray(posList) && posList.length > 0,
        );
      });
    });
  }, [userData, allTeams, entries, targetDate, isTeamExpired]);

  // Handle initialization and programmatic scrolling
  useEffect(() => {
    if (
      loadingRoster ||
      rosterDates.length === 0 ||
      containerWidth === 0 ||
      isInitialized
    )
      return;

    const container = scrollRef.current;
    if (!container) return;

    const index = targetDate
      ? rosterDates.findIndex((d) => d === targetDate)
      : 0;
    const finalIndex = index >= 0 ? index : 0;

    isProgrammaticScroll.current = true;
    container.style.scrollSnapType = "none";
    container.scrollLeft = containerWidth * finalIndex;

    requestAnimationFrame(() => {
      if (container) container.style.scrollSnapType = "x mandatory";
      setCurrentDateIndex(finalIndex);
      setIsInitialized(true);

      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 100);
    });
  }, [loadingRoster, rosterDates, containerWidth, targetDate, isInitialized]);

  // Safety reveal
  useEffect(() => {
    if (!isInitialized && !loadingRoster && rosterDates.length > 0) {
      const timer = setTimeout(() => setIsInitialized(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, loadingRoster, rosterDates]);

  const handleClearDate = () => {
    setSearchParams({}, { replace: true });
  };

  const getDashboardDataForDate = useCallback(
    (dateStr: string | null) => {
      if (!dateStr || !userData?.teams || allTeams.length === 0) return null;
      const dateKey = dateStr;
      const entry = entries[dateKey];

      const userTeams = allTeams
        .filter(
          (t) =>
            userData.teams.includes(t.id) || userData.teams.includes(t.name),
        )
        .sort((a, b) => {
          const indexA = userData.teams.findIndex(
            (id) => id === a.id || id === a.name,
          );
          const indexB = userData.teams.findIndex(
            (id) => id === b.id || id === b.name,
          );
          return indexA - indexB;
        });

      const data = userTeams.map((team) => {
        const teamAssignments = entry
          ? getAssignmentsForTeam(entry, team.id)
          : {};
        const coverageRequests = entry?.coverageRequests || {};

        const positionGroups: {
          posId: string;
          posName: string;
          emoji: string;
          assignedUsers: {
            name: string;
            isMe: boolean;
            gender?: string | null;
          }[];
        }[] = [];

        // 1. Gather all unique position IDs that have data or are configured
        const activePosIdSet = new Set<string>(team.positions || []);

        // Add positions from assignments
        Object.values(teamAssignments).forEach((posList) => {
          if (Array.isArray(posList))
            posList.forEach((pId) => activePosIdSet.add(pId));
        });

        // Add positions from coverage requests
        Object.values(coverageRequests).forEach((req) => {
          if (req.teamName === team.id && req.status === "open") {
            activePosIdSet.add(req.positionName);
          }
        });

        // Ensure parent positions are also in the set if a child is active
        const allActiveIds = Array.from(activePosIdSet);
        allActiveIds.forEach((pId) => {
          const pos = allPositions.find((p) => p.id === pId || p.name === pId);
          if (pos?.parentId) activePosIdSet.add(pos.parentId);
        });

        // 2. Sort positions: Parents first, then their children
        // We use the team's preferred position list as the primary sort order
        const teamPositionIds = Array.from(activePosIdSet).sort((aId, bId) => {
          const posA = allPositions.find((p) => p.id === aId || p.name === aId);
          const posB = allPositions.find((p) => p.id === bId || p.name === bId);

          const effectiveParentA = posA?.parentId || aId;
          const effectiveParentB = posB?.parentId || bId;

          // If they share the same parent group
          if (effectiveParentA === effectiveParentB) {
            if (!posA?.parentId) return -1; // a is the parent
            if (!posB?.parentId) return 1; // b is the parent
            return (posA.name || "").localeCompare(posB.name || ""); // both are children
          }

          // Different groups: sort by team's configured position order
          const indexA = (team.positions || []).indexOf(effectiveParentA);
          const indexB = (team.positions || []).indexOf(effectiveParentB);

          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return (posA?.name || "").localeCompare(posB?.name || "");
        });

        let totalAssignedInTeam = 0;
        let totalRequestsInTeam = 0;
        let myPositionName = "";

        teamPositionIds.forEach((posId) => {
          const posInfo = allPositions.find(
            (p) => p.id === posId || p.name === posId,
          );
          if (!posInfo) return;

          const assignedUsers: AppUser[] = [];

          Object.entries(teamAssignments).forEach(([email, posList]) => {
            if (
              Array.isArray(posList) &&
              (posList.includes(posInfo.id) || posList.includes(posInfo.name))
            ) {
              const user = allUsers.find((u) => u.email === email);
              if (user) {
                assignedUsers.push(user);
              } else {
                assignedUsers.push({
                  email,
                  name: "...",
                  gender: "",
                } as AppUser);
              }
              totalAssignedInTeam++;
              if (email === userData.email) {
                myPositionName = posInfo.name;
              }
            }
          });

          // Check if this specific position has an open request
          const hasRequest = Object.values(coverageRequests).some(
            (req) =>
              req.teamName === team.id &&
              req.positionName === posId &&
              req.status === "open",
          );
          if (hasRequest) totalRequestsInTeam++;

          const sortedAssignedUsers = [...assignedUsers].sort((a, b) => {
            if (posInfo?.sortByGender) {
              if (a.gender !== b.gender) {
                if (a.gender === "Male") return -1;
                if (b.gender === "Male") return 1;
                return (a.gender || "").localeCompare(b.gender || "");
              }
            }
            return (a.name || "").localeCompare(b.name || "");
          });

          positionGroups.push({
            posId: posInfo.id,
            posName: posInfo.name,
            emoji: posInfo?.emoji || "❓",
            assignedUsers: sortedAssignedUsers.map((u) => ({
              name: u.name || u.email || "Unknown",
              isMe: u.email === userData.email,
              gender: u.gender,
            })),
          });
        });

        return {
          teamId: team.id,
          teamName: team.name,
          teamEmoji: team.emoji,
          positions: positionGroups,
          hasAssignments: totalAssignedInTeam > 0 || totalRequestsInTeam > 0,
          recurringEvents: team.recurringEvents || [],
          myPositionName,
          isExpired: isTeamExpired(team, dateKey),
          endTimeStr:
            dateKey === getTodayKey() ? getTeamEndTime(team, dateKey) : "",
        };
      });

      const filtered = data.filter((t) => t.hasAssignments && !t.isExpired);
      return filtered.length > 0 ? filtered : null;
    },
    [
      entries,
      userData,
      allTeams,
      allPositions,
      allUsers,
      isTeamExpired,
      getTeamEndTime,
    ],
  );

  const handleCalendarAction = (
    dateStr: string,
    event: RecurringEvent | RecurringEvent[],
    teamName: string,
    positionName: string,
  ) => {
    if (Array.isArray(event)) {
      const ics = generateMultiIcsString(
        dateStr,
        event,
        teamName,
        positionName,
      );
      downloadIcsFile(`${teamName}-All-Events.ics`, ics);
    } else {
      const ics = generateIcsString(dateStr, event, teamName, positionName);
      downloadIcsFile(`${event.label}.ics`, ics);
    }
    setActiveCalendarTeam(null);
  };

  // Close calendar dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setActiveCalendarTeam(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleCopy = (
    dateStr: string,
    teamName: string,
    teamEmoji: string,
    positions: {
      posName: string;
      emoji: string;
      assignedUsers: { name: string; isMe: boolean; gender?: string | null }[];
    }[],
    eventName?: string,
  ) => {
    const localDate = new Date(dateStr);
    const formattedDate = localDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

    let text = "";
    if (eventName) {
      text += `✨ ${eventName} ✨\n`;
    }
    text += `${teamEmoji} ${teamName} · ${formattedDate}\n`;

    const positionsText = positions
      .map((p) => {
        const namesText =
          p.assignedUsers.length > 0
            ? p.assignedUsers.map((u) => u.name).join(", ")
            : "-";
        return `${p.emoji}: ${namesText}`;
      })
      .join("\n");

    text += positionsText;

    navigator.clipboard.writeText(text).then(() => {
      const id = `${dateStr}-${teamName}`;
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleScroll = () => {
    if (
      !scrollRef.current ||
      containerWidth === 0 ||
      isProgrammaticScroll.current
    )
      return;
    const container = scrollRef.current;
    const index = Math.round(container.scrollLeft / containerWidth);

    if (index !== currentDateIndex && rosterDates[index]) {
      setCurrentDateIndex(index);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        const dateKey = rosterDates[index];
        if (targetDate !== dateKey) {
          const todayKey = getTodayKey();
          if (index === 0 && todayKey === dateKey) {
            setSearchParams({}, { replace: true });
          } else {
            setSearchParams({ date: dateKey }, { replace: true });
          }
        }
      }, 300);
    }
  };

  const handleEventNameChange = (dateStr: string, eventName: string) => {
    const payload = { date: dateStr, eventName };
    dispatch(applyOptimisticEventName(payload));
    dispatch(syncEventNameRemote(payload));
  };

  const handleClaim = (
    date: string,
    teamId: string,
    positionId: string,
    requestId: string,
  ) => {
    const userEmail = userData?.email || "";
    const payload = {
      date,
      teamName: teamId,
      userIdentifier: userEmail,
      updatedAssignments: [positionId],
    };

    dispatch(applyOptimisticAssignment(payload));
    dispatch(syncAssignmentRemote(payload));

    const resolvePayload = {
      date,
      requestId,
      status: "resolved" as const,
      resolvedByEmail: userEmail,
    };
    dispatch(applyOptimisticResolve(resolvePayload));
    dispatch(resolveCoverageRequestRemote(resolvePayload));

    // Automatically remove absence if user is claiming
    if (entries[date]?.absence?.[userEmail]) {
      const absencePayload = {
        date,
        userIdentifier: userEmail,
        isAbsent: false,
        clearedTeams: [],
        clearedPositions: {},
      };
      dispatch(applyOptimisticAbsence(absencePayload));
      dispatch(syncAbsenceRemote(absencePayload));
    }
  };

  const currentEventDate = rosterDates[currentDateIndex];
  const todayKey = getTodayKey();

  const isPast = useMemo(() => {
    if (!currentEventDate) return false;
    if (currentEventDate < todayKey) return true;
    if (currentEventDate > todayKey) return false;

    // It's today. Check if all assigned teams' end times have passed.
    const dashboardData = getDashboardDataForDate(currentEventDate);
    if (!dashboardData) return false;

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const currentWeekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(now) as Weekday;

    return dashboardData.every((teamData) => {
      const team = allTeams.find((t) => t.name === teamData.teamName);
      const endTime = team?.dayEndTimes?.[currentWeekday] || "23:59";
      return currentTimeStr >= endTime;
    });
  }, [currentEventDate, todayKey, getDashboardDataForDate, allTeams]);

  // Find dates that have an open coverage request the current user can fill
  const needsReplacementDates = useMemo(() => {
    if (!userData) return [];
    const results: string[] = [];

    rosterDates.forEach((date) => {
      const entry = entries[date];
      if (!entry?.coverageRequests) return;

      const hasQualifiedRequest = Object.values(entry.coverageRequests).some(
        (req) => {
          if (req.status !== "open") return false;
          const userQualifiedPositions =
            userData.teamPositions?.[req.teamName] || [];
          return userQualifiedPositions.includes(req.positionName);
        },
      );

      if (hasQualifiedRequest) {
        results.push(date);
      }
    });
    return results;
  }, [rosterDates, entries, userData]);

  const handleScrollToNeeds = () => {
    if (needsReplacementDates.length === 0) return;
    const firstDate = needsReplacementDates[0];
    const index = rosterDates.indexOf(firstDate);
    if (index !== -1 && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: index * containerWidth,
        behavior: "smooth",
      });
    }
  };

  if (rosterDates.length === 0 && !loadingRoster) {
    return (
      <div className={styles.dashboardEmpty}>
        <h2>
          {t("dashboard.noEvents", {
            defaultValue: "No upcoming events found",
          })}
        </h2>
        <p>{t("dashboard.noAssignments")}</p>
      </div>
    );
  }

  const currentEntry = entries[currentEventDate] || { eventName: "" };
  const showSpinner = loadingRoster || !isInitialized;

  const pageTitle = isPast
    ? t("common.previousEvent", { defaultValue: "Previous Event" })
    : t("dashboard.title");

  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const renderTeamCards = (dateStr: string, isPeek: boolean = false) => {
    const data = getDashboardDataForDate(dateStr);
    if (!data) return null;

    const entry = entries[dateStr];
    const eventName = entry?.eventName;
    const coverageRequests = entry?.coverageRequests || {};

    return (
      <div className={styles.teamCardsContainer}>
        {data.map((teamData) => {
          const isRecentlyCopied =
            copiedId === `${dateStr}-${teamData.teamName}`;
          return (
            <div key={teamData.teamName} className={styles.teamEventCard}>
              <div className={styles.teamEventHeader}>
                <h3>
                  <span className={styles.teamCardEmoji}>
                    {teamData.teamEmoji}
                  </span>
                  <span className={styles.teamCardName}>
                    {teamData.teamName}
                  </span>
                  {teamData.endTimeStr && (
                    <ExpiryTimer
                      endTimeStr={teamData.endTimeStr}
                      className={styles.dashboardExpiryTimer}
                    />
                  )}
                </h3>
                {!isPeek && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      position: "relative",
                    }}
                  >
                    {teamData.myPositionName &&
                      teamData.recurringEvents.length > 0 && (
                        <div style={{ position: "relative" }}>
                          <button
                            className={styles.calendarBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCalendarTeam({
                                teamName: teamData.teamName,
                                dateStr,
                                events: teamData.recurringEvents,
                                positionName: teamData.myPositionName,
                              });
                            }}
                            title={t("dashboard.addToCalendar")}
                          >
                            <CalendarPlus size={16} />
                          </button>
                        </div>
                      )}
                    <button
                      className={`${styles.copyRosterBtn} ${isRecentlyCopied ? styles.copyRosterBtnSuccess : ""}`}
                      onClick={() =>
                        handleCopy(
                          dateStr,
                          teamData.teamName,
                          teamData.teamEmoji,
                          teamData.positions,
                          eventName,
                        )
                      }
                      title={t("dashboard.copyToClipboard")}
                    >
                      {isRecentlyCopied ? (
                        <>
                          <CheckCircle2 size={16} /> {t("dashboard.copied")}
                        </>
                      ) : (
                        <>
                          <CopyIcon size={16} />{" "}
                          {t("common.copy", { defaultValue: "Copy" })}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.teamEventDetails}>
                {teamData.positions.map((group) => {
                  // Find ALL open coverage requests for this team and position
                  const matchingRequests = Object.entries(
                    coverageRequests,
                  ).filter(
                    ([, req]) =>
                      req.teamName === teamData.teamId &&
                      req.positionName === group.posId &&
                      req.status === "open",
                  );

                  const userQualifiedPositions =
                    userData?.teamPositions?.[teamData.teamId] || [];
                  const isQualified = userQualifiedPositions.includes(
                    group.posId,
                  );
                  const isAlreadyAssigned = group.assignedUsers.some(
                    (u) => u.isMe,
                  );

                  return (
                    <div
                      key={group.posName}
                      className={styles.posAssignmentRow}
                    >
                      <span
                        className={styles.posEmojiLabel}
                        title={group.posName}
                      >
                        {group.emoji}
                      </span>
                      <div className={styles.assignedNamesWrapper}>
                        <span
                          className={`${styles.assignedNames} ${group.assignedUsers.length === 0 && (!isQualified || matchingRequests.length === 0) ? styles.unassigned : ""}`}
                        >
                          {group.assignedUsers.length > 0
                            ? group.assignedUsers.map((user, idx) => (
                                <Fragment key={`${user.name}-${idx}`}>
                                  <NameTag
                                    displayName={user.name}
                                    isMe={user.isMe}
                                    gender={user.gender}
                                  />
                                  {idx < group.assignedUsers.length - 1 ||
                                  (isQualified &&
                                    !isAlreadyAssigned &&
                                    matchingRequests.length > 0)
                                    ? ", "
                                    : ""}
                                </Fragment>
                              ))
                            : !isQualified || matchingRequests.length === 0
                              ? t("common.unassigned")
                              : null}

                          {/* Show Claim button inline if qualified, not assigned, and there's a request */}
                          {isQualified &&
                            !isAlreadyAssigned &&
                            matchingRequests.map(
                              ([requestId, request], idx) => (
                                <Fragment key={requestId}>
                                  <Button
                                    size="small"
                                    variant="primary"
                                    onClick={() =>
                                      handleClaim(
                                        dateStr,
                                        teamData.teamId,
                                        group.posId,
                                        requestId,
                                      )
                                    }
                                    style={{
                                      marginLeft: "4px",
                                      padding: "2px 8px",
                                      height: "auto",
                                      fontSize: "0.65rem",
                                    }}
                                  >
                                    {t("dashboard.claimShift")}
                                  </Button>
                                  <span className={styles.inlineClaimInfo}>
                                    ({request.absentUserName}{" "}
                                    {t("dashboard.unavailable")})
                                  </span>
                                  {idx < matchingRequests.length - 1
                                    ? ", "
                                    : ""}
                                </Fragment>
                              ),
                            )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={styles.dashboardContainer}
      style={{ opacity: isInitialized ? 1 : 0 }}
    >
      {showSpinner && <Spinner />}

      <div className={styles.dashboardHeader}>
        <h1>{pageTitle}</h1>
        <div className={styles.dashboardHeaderActions}>
          {needsReplacementDates.length > 0 && (
            <button
              className={styles.needsReplacementAlert}
              onClick={handleScrollToNeeds}
            >
              🚨 {t("dashboard.replacementNeeded")}
            </button>
          )}
          {isPast && (
            <button className={styles.clearPastBtn} onClick={handleClearDate}>
              {t("dashboard.resetToUpcoming")}
            </button>
          )}
        </div>
      </div>

      <div className={styles.eventNameContainer}>
        <input
          type="text"
          className={`${styles.dashboardEventNameInput} ${currentEntry.eventName ? styles.dashboardEventNameInputHasEvent : ""}`}
          placeholder={t("dashboard.eventNamePlaceholder")}
          value={currentEntry.eventName || ""}
          onChange={(e) =>
            handleEventNameChange(currentEventDate, e.target.value)
          }
        />
      </div>
      <div className={styles.eventCardDate}>
        {formatDate(currentEventDate)}
        {currentEventDate === todayKey && (
          <span className={styles.dashboardTodayBadge}>TODAY</span>
        )}
      </div>

      <div className={styles.carouselOuterWrapper}>
        <div
          className={styles.eventsCarouselTrack}
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {rosterDates.map((dateStr, index) => (
            <div
              key={dateStr}
              className={`${styles.eventCardWrapper} ${index === currentDateIndex ? styles.active : styles.peek}`}
            >
              {renderTeamCards(dateStr, index !== currentDateIndex)}
            </div>
          ))}
        </div>

        <div className={styles.carouselPagination}>
          {currentDateIndex + 1} / {rosterDates.length}
        </div>
      </div>

      <ActionSheet
        isOpen={!!activeCalendarTeam}
        onClose={() => setActiveCalendarTeam(null)}
        title={t("dashboard.addToCalendar")}
      >
        {activeCalendarTeam && (
          <>
            {activeCalendarTeam.events.map((ev) => (
              <button
                key={ev.id}
                className={styles.calendarActionItem}
                onClick={() =>
                  handleCalendarAction(
                    activeCalendarTeam.dateStr,
                    ev,
                    activeCalendarTeam.teamName,
                    activeCalendarTeam.positionName,
                  )
                }
              >
                <div className={styles.calendarActionText}>
                  <div className={styles.calendarEventName}>
                    {ev.label} ({ev.day})
                  </div>
                  <div className={styles.calendarEventTime}>
                    {ev.startTime} - {ev.endTime}
                  </div>
                </div>
                <CalendarPlus size={18} className={styles.calendarActionIcon} />
              </button>
            ))}
            {activeCalendarTeam.events.length > 1 && (
              <button
                className={`${styles.calendarActionItem} ${styles.calendarAddAllItem}`}
                onClick={() =>
                  handleCalendarAction(
                    activeCalendarTeam.dateStr,
                    activeCalendarTeam.events,
                    activeCalendarTeam.teamName,
                    activeCalendarTeam.positionName,
                  )
                }
              >
                <span>{t("dashboard.addAllEvents")}</span>
                <CalendarPlus size={18} className={styles.calendarActionIcon} />
              </button>
            )}
          </>
        )}
      </ActionSheet>
    </div>
  );
};

export default DashboardPage;

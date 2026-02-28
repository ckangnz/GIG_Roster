import {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
  Fragment,
} from "react";

import { collection, query, where, getDocs } from "firebase/firestore";
import { CopyIcon, CheckCircle2, CalendarPlus } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import TeamNeeds from "./TeamNeeds";
import ActionSheet from "../../components/common/ActionSheet";
import ExpiryTimer from "../../components/common/ExpiryTimer";
import NameTag from "../../components/common/NameTag";
import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Weekday, AppUser, getTodayKey, RecurringEvent, Team } from "../../model/model";
import {
  applyOptimisticEventName,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const targetDate = searchParams.get("date");

  const { userData } = useAppSelector((state) => state.auth);
  const orgId = userData?.orgId;
  const teamsState = useAppSelector((state) => state.teams);
  const allTeams = useMemo(() => 
    (teamsState?.teams || []).filter(t => t.orgId === orgId), 
  [teamsState?.teams, orgId]);

  const {
    entries,
    loading: loadingRoster,
  } = useAppSelector((state) => state.roster);
  const positionsState = useAppSelector((state) => state.positions);
  const allPositions = useMemo(() => 
    (positionsState?.positions || []).filter(p => p.orgId === orgId), 
  [positionsState?.positions, orgId]);

  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
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
    const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
      dateObj,
    ) as Weekday;
    return team.dayEndTimes?.[dayName] || "23:59";
  }, []);

  const isTeamExpired = useCallback((team: Team, dateStr: string) => {
    const todayKey = getTodayKey();
    if (dateStr !== todayKey) return false;

    const endTimeStr = getTeamEndTime(team, dateStr);
    const [endH, endM] = endTimeStr.split(":").map(Number);
    
    const now = new Date();
    const nowH = now.getHours();
    const nowM = now.getMinutes();

    return nowH > endH || (nowH === endH && nowM >= endM);
  }, [getTeamEndTime]);

  const rosterDates = useMemo(() => {
    const todayKey = getTodayKey();
    if (!userData?.teams || allTeams.length === 0) return [];

    const userTeams = allTeams.filter((t) => 
      userData.teams.includes(t.id) || 
      userData.teams.includes(t.name)
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

        const teamAssignments = entry.teams?.[team.id] || {};
        return Object.values(teamAssignments).some(
          (posList) => Array.isArray(posList) && posList.length > 0,
        );
      });
    });
  }, [userData, allTeams, entries, targetDate, isTeamExpired]);

  // Handle initialization and programmatic scrolling
  useEffect(() => {
    if (loadingRoster || rosterDates.length === 0 || containerWidth === 0 || isInitialized) return;

    const container = scrollRef.current;
    if (!container) return;

    const index = targetDate ? rosterDates.findIndex(d => d === targetDate) : 0;
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

  useEffect(() => {
    const fetchMyTeamsUsers = async () => {
      if (!userData?.teams || userData.teams.length === 0 || !orgId) return;
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("teams", "array-contains-any", userData.teams),
          where("orgId", "==", orgId)
        );
        const snap = await getDocs(q);
        const users: AppUser[] = [];
        snap.forEach((doc) => users.push(doc.data() as AppUser));
        setTeamUsers(users);
      } catch (err) {
        console.error("Error fetching users for dashboard:", err);
      }
    };

    fetchMyTeamsUsers();
  }, [userData?.teams, orgId]);

  const getDashboardDataForDate = useCallback(
    (dateStr: string | null) => {
      if (!dateStr || !userData?.teams || allTeams.length === 0) return null;
      const dateKey = dateStr;
      const entry = entries[dateKey];

      const userTeams = allTeams
        .filter((t) => userData.teams.includes(t.id) || userData.teams.includes(t.name))
        .sort((a, b) => {
          const indexA = userData.teams.findIndex(id => id === a.id || id === a.name);
          const indexB = userData.teams.findIndex(id => id === b.id || id === b.name);
          return indexA - indexB;
        });

      const data = userTeams.map((team) => {
        const teamAssignments = entry?.teams?.[team.id] || {};

        const positionGroups: {
          posId: string;
          posName: string;
          emoji: string;
          assignedUsers: { name: string; isMe: boolean; gender?: string | null }[];
        }[] = [];
        const teamPositionIds = team.positions || [];

        let totalAssignedInTeam = 0;
        let myPositionName = "";

        teamPositionIds.forEach((posId) => {
          const posInfo = allPositions.find((p) => p.id === posId || p.name === posId);
          if (!posInfo) return;

          const assignedUsers: AppUser[] = [];

          Object.entries(teamAssignments).forEach(([email, posList]) => {
            if (Array.isArray(posList) && (posList.includes(posInfo.id) || posList.includes(posInfo.name))) {
              const user = teamUsers.find((u) => u.email === email);
              if (user) {
                assignedUsers.push(user);
              } else {
                assignedUsers.push({ email, name: email, gender: "" } as AppUser);
              }
              totalAssignedInTeam++;
              if (email === userData.email) {
                myPositionName = posInfo.name;
              }
            }
          });

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
          hasAssignments: totalAssignedInTeam > 0,
          recurringEvents: team.recurringEvents || [],
          myPositionName,
          isExpired: isTeamExpired(team, dateKey),
          endTimeStr: dateKey === getTodayKey() ? getTeamEndTime(team, dateKey) : "",
        };
      });

      const filtered = data.filter((t) => t.hasAssignments && !t.isExpired);
      return filtered.length > 0 ? filtered : null;
    },
    [entries, userData, allTeams, allPositions, teamUsers, isTeamExpired, getTeamEndTime],
  );

  const handleCalendarAction = (
    dateStr: string,
    event: RecurringEvent | RecurringEvent[],
    teamName: string,
    positionName: string,
  ) => {
    if (Array.isArray(event)) {
      const ics = generateMultiIcsString(dateStr, event, teamName, positionName);
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
    if (!scrollRef.current || containerWidth === 0 || isProgrammaticScroll.current) return;
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

  if (rosterDates.length === 0 && !loadingRoster) {
    return (
      <div className={styles.dashboardEmpty}>
        <h2>No upcoming events found</h2>
        <p>You are not rostered for any upcoming team events.</p>
      </div>
    );
  }

  const currentEntry = entries[currentEventDate] || { eventName: "" };
  const showSpinner = loadingRoster || !isInitialized;

  const pageTitle = isPast ? "Previous Event" : "Upcoming Events";

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
                                        {teamData.myPositionName && teamData.recurringEvents.length > 0 && (
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
                          title="Add to calendar"
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
                      title="Copy to clipboard"
                    >
                      {isRecentlyCopied ? (
                        <>
                          <CheckCircle2 size={16} /> Copied
                        </>
                      ) : (
                        <>
                          <CopyIcon size={16} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.teamEventDetails}>
                {teamData.positions.map((group) => (
                  <div key={group.posName} className={styles.posAssignmentRow}>
                    <span
                      className={styles.posEmojiLabel}
                      title={group.posName}
                    >
                      {group.emoji}
                    </span>
                    <span
                      className={`${styles.assignedNames} ${group.assignedUsers.length === 0 ? styles.unassigned : ""}`}
                    >
                      {group.assignedUsers.length > 0
                        ? group.assignedUsers.map((user, idx) => (
                            <Fragment key={`${user.name}-${idx}`}>
                              <NameTag
                                displayName={user.name}
                                isMe={user.isMe}
                                gender={user.gender}
                              />
                              {idx < group.assignedUsers.length - 1 ? ", " : ""}
                            </Fragment>
                          ))
                        : "Unassigned"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.dashboardContainer} style={{ opacity: isInitialized ? 1 : 0 }}>
      {showSpinner && <Spinner />}
      
      <div className={styles.dashboardHeader}>
        <h1>{pageTitle}</h1>
        <div className={styles.dashboardHeaderActions}>
          {isPast && (
            <button className={styles.clearPastBtn} onClick={handleClearDate}>
              Reset to upcoming
            </button>
          )}
        </div>
      </div>

      <div className={styles.eventNameContainer}>
        <input
          type="text"
          className={`${styles.dashboardEventNameInput} ${currentEntry.eventName ? styles.dashboardEventNameInputHasEvent : ""}`}
          placeholder="Event name (e.g. Easter Sunday)"
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

      <TeamNeeds />

      <ActionSheet
        isOpen={!!activeCalendarTeam}
        onClose={() => setActiveCalendarTeam(null)}
        title="Add to Calendar"
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
                <span>Add All Events</span>
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

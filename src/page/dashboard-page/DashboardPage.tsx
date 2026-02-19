import {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
  Fragment,
} from "react";

import { collection, query, where, getDocs } from "firebase/firestore";
import { CopyIcon, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Spinner from "../../components/common/Spinner";
import ThemeToggleButton from "../../components/common/ThemeToggleButton";
import { db } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Weekday, AppUser, getTodayKey } from "../../model/model";
import {
  applyOptimisticEventName,
  syncEventNameRemote,
} from "../../store/slices/rosterSlice";
import { getUpcomingDates } from "../../store/slices/rosterViewSlice";

import styles from "./dashboard-page.module.css";

const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetDate = searchParams.get("date");

  const { userData } = useAppSelector((state) => state.auth);
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const {
    entries,
    loading: loadingRoster,
    initialLoad,
  } = useAppSelector((state) => state.roster);
  const { positions: allPositions } = useAppSelector(
    (state) => state.positions,
  );

  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const rosterDates = useMemo(() => {
    const todayKey = getTodayKey();
    if (!userData?.teams || allTeams.length === 0) return [];

    const userTeams = allTeams.filter((t) => userData.teams.includes(t.name));
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
        const teamAssignments = entry.teams?.[team.name] || {};
        return Object.values(teamAssignments).some(
          (posList) => Array.isArray(posList) && posList.length > 0,
        );
      });
    });
  }, [userData, allTeams, entries, targetDate]);

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
      if (!userData?.teams || userData.teams.length === 0) return;
      setLoadingUsers(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("teams", "array-contains-any", userData.teams),
        );
        const snap = await getDocs(q);
        const users: AppUser[] = [];
        snap.forEach((doc) => users.push(doc.data() as AppUser));
        setTeamUsers(users);
      } catch (err) {
        console.error("Error fetching users for dashboard:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchMyTeamsUsers();
  }, [userData?.teams]);

  const getDashboardDataForDate = useCallback(
    (dateStr: string | null) => {
      if (!dateStr || !userData?.teams || allTeams.length === 0) return null;
      const dateKey = dateStr;
      const entry = entries[dateKey];

      const userTeams = allTeams
        .filter((t) => userData.teams.includes(t.name))
        .sort((a, b) => {
          const indexA = userData.teams.indexOf(a.name);
          const indexB = userData.teams.indexOf(b.name);
          return indexA - indexB;
        });

      const data = userTeams.map((team) => {
        const teamAssignments = entry?.teams?.[team.name] || {};

        const positionGroups: {
          posName: string;
          emoji: string;
          assignedUsers: { name: string; isMe: boolean }[];
        }[] = [];
        const teamPositionNames = team.positions.map((p) => p.name);

        let totalAssignedInTeam = 0;

        teamPositionNames.forEach((posName) => {
          const posInfo = allPositions.find((p) => p.name === posName);
          const assignedUsers: AppUser[] = [];

          Object.entries(teamAssignments).forEach(([email, posList]) => {
            if (Array.isArray(posList) && posList.includes(posName)) {
              const user = teamUsers.find((u) => u.email === email);
              if (user) {
                assignedUsers.push(user);
              } else {
                assignedUsers.push({ email, name: email } as AppUser);
              }
              totalAssignedInTeam++;
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
            posName,
            emoji: posInfo?.emoji || "❓",
            assignedUsers: sortedAssignedUsers.map((u) => ({
              name: u.name || u.email || "Unknown",
              isMe: u.email === userData.email,
            })),
          });
        });

        return {
          teamName: team.name,
          teamEmoji: team.emoji,
          positions: positionGroups,
          hasAssignments: totalAssignedInTeam > 0,
        };
      });

      const filtered = data.filter((t) => t.hasAssignments);
      return filtered.length > 0 ? filtered : null;
    },
    [entries, userData, allTeams, allPositions, teamUsers],
  );

  const handleCopy = (
    dateStr: string,
    teamName: string,
    teamEmoji: string,
    positions: {
      posName: string;
      emoji: string;
      assignedUsers: { name: string; isMe: boolean }[];
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

    positions.forEach((p) => {
      const namesText =
        p.assignedUsers.length > 0
          ? p.assignedUsers.map((u) => u.name).join(", ")
          : "-";
      text += `${p.emoji}: ${namesText}\n`;
    });

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

  const showSpinner = (loadingRoster && !initialLoad) || loadingUsers || !isInitialized;

  if (rosterDates.length === 0 && !loadingRoster) {
    return (
      <div className={styles.dashboardEmpty}>
        <h2>No upcoming events found</h2>
        <p>You are not rostered for any upcoming team events.</p>
      </div>
    );
  }

  const currentEventDate = rosterDates[currentDateIndex];
  const todayKey = getTodayKey();
  const isPast = currentEventDate && currentEventDate < todayKey;
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
                </h3>
                {!isPeek && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <ThemeToggleButton
                      className={styles.dashboardThemeToggle}
                    />
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
                              {user.name}
                              {user.isMe && (
                                <span className={styles.meTag}>Me</span>
                              )}
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

  const currentEntry = entries[currentEventDate] || { eventName: "" };

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
    </div>
  );
};

export default DashboardPage;

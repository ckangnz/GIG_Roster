import { useMemo, useEffect, useState, useCallback, useRef } from "react";

import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";

import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Weekday, AppUser, getTodayKey } from "../../model/model";
import {
  fetchRosterEntries,
  saveRosterChanges,
  updateLocalEventName,
  resetRosterEdits,
} from "../../store/slices/rosterSlice";
import { getUpcomingDates } from "../../store/slices/rosterViewSlice";

import "./dashboard-page.css";

const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetDate = searchParams.get("date");

  const { userData } = useAppSelector((state) => state.auth);
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const {
    entries,
    dirtyEntries,
    loading: loadingRoster,
    saving,
  } = useAppSelector((state) => state.roster);
  const { positions: allPositions } = useAppSelector(
    (state) => state.positions,
  );

  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);

  const hasDirtyChanges = Object.keys(dirtyEntries).length > 0;

  useEffect(() => {
    dispatch(fetchRosterEntries());
  }, [dispatch]);

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

    // If targetDate is in the past, show ONLY that date (disables scrolling)
    if (targetDate && targetDate < todayKey) {
      return [targetDate];
    }

    // Filter dates: keep if has assignments OR if it's the specific targetDate
    return upcomingDates.filter((dateStr) => {
      const dateKey = dateStr;
      if (targetDate === dateKey) return true; // Never filter the date we specifically navigated to

      const entry = entries[dateKey] || dirtyEntries[dateKey];
      if (!entry) return false;

      return userTeams.some((team) => {
        const teamAssignments = entry.teams?.[team.name] || {};
        return Object.values(teamAssignments).some(
          (posList) => posList.length > 0,
        );
      });
    });
  }, [userData, allTeams, entries, dirtyEntries, targetDate]);

  // Handle deep-linking and tab-reclick resets
  useEffect(() => {
    if (rosterDates.length === 0 || !scrollRef.current) return;

    if (targetDate) {
      const index = rosterDates.findIndex((d) => d.startsWith(targetDate));
      if (index >= 0) {
        const container = scrollRef.current;
        const itemWidth = container.offsetWidth;
        const currentScrollIndex = Math.round(container.scrollLeft / itemWidth);

        if (!hasInitialScrolled.current || currentScrollIndex !== index) {
          // Micro-task to ensure layout is stable
          Promise.resolve().then(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTo({
                left: itemWidth * index,
                behavior: hasInitialScrolled.current ? "smooth" : "auto",
              });
              setCurrentDateIndex(index);
              hasInitialScrolled.current = true;
            }
          });
        }
      }
    } else {
      // Re-click or fresh load with no date: scroll to start
      const container = scrollRef.current;
      if (container.scrollLeft !== 0) {
        container.scrollTo({ left: 0, behavior: "smooth" });
        setCurrentDateIndex(0);
      }
      hasInitialScrolled.current = true;
    }
  }, [targetDate, rosterDates]);

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
      const entry = dirtyEntries[dateKey] || entries[dateKey];

      const userTeams = allTeams.filter((t) => userData.teams.includes(t.name));

      const data = userTeams.map((team) => {
        const teamAssignments = entry?.teams?.[team.name] || {};

        const positionGroups: {
          posName: string;
          emoji: string;
          names: string[];
        }[] = [];
        const teamPositionNames = team.positions.map((p) => p.name);

        let totalAssignedInTeam = 0;

        teamPositionNames.forEach((posName) => {
          const posInfo = allPositions.find((p) => p.name === posName);
          const assignedUsers: AppUser[] = [];

          Object.entries(teamAssignments).forEach(([email, posList]) => {
            if (posList.includes(posName)) {
              const user = teamUsers.find((u) => u.email === email);
              if (user) {
                assignedUsers.push(user);
              } else {
                // Fallback for cases where user data might not be loaded yet
                assignedUsers.push({ email, name: email } as AppUser);
              }
              totalAssignedInTeam++;
            }
          });

          // Sort assigned users
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
            names: sortedAssignedUsers.map((u) => u.name || u.email || "Unknown"),
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
    [entries, dirtyEntries, userData, allTeams, allPositions, teamUsers],
  );

  const handleCopy = (
    dateStr: string,
    teamName: string,
    teamEmoji: string,
    positions: { posName: string; emoji: string; names: string[] }[],
  ) => {
    // Fix date display: replace '-' with '/' to force local time interpretation
    const localDate = new Date(dateStr.replace(/-/g, "/"));
    const formattedDate = localDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    let text = `${formattedDate} - ${teamEmoji} ${teamName}\n`;
    positions.forEach((p) => {
      const namesText = p.names.length > 0 ? p.names.join(", ") : "-";
      text += `${p.emoji}: ${namesText}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      // Success
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const itemWidth = container.offsetWidth;
    const index = Math.round(container.scrollLeft / itemWidth);

    if (index !== currentDateIndex && rosterDates[index]) {
      setCurrentDateIndex(index);
      // Update URL search params to reflect current date for persistence
      const dateKey = rosterDates[index];
      if (targetDate !== dateKey) {
        const todayKey = getTodayKey();
        if (index === 0 && !targetDate?.includes(todayKey)) {
          // Keep URL clean for the first (default) item if it's the current list
          setSearchParams({}, { replace: true });
        } else {
          setSearchParams({ date: dateKey }, { replace: true });
        }
      }
    }
  };

  const handleEventNameChange = (dateStr: string, eventName: string) => {
    dispatch(updateLocalEventName({ date: dateStr, eventName }));
  };

  const handleSave = () => {
    dispatch(saveRosterChanges(dirtyEntries));
  };

  const handleCancel = () => {
    dispatch(resetRosterEdits());
  };

  const runMigration = async (direction: 1 | -1) => {
    const text = direction === 1 ? "FORWARD" : "BACKWARD";
    if (
      !window.confirm(
        `This will shift ALL roster data 1 day ${text}. This is irreversible without a rollback. Continue?`,
      )
    )
      return;

    setLoadingUsers(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      Object.values(entries).forEach((entry) => {
        const oldId = entry.id;
        const [y, m, d] = oldId.split("-").map(Number);
        // Create local date
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + direction);

        const newY = date.getFullYear();
        const newM = String(date.getMonth() + 1).padStart(2, "0");
        const newD = String(date.getDate()).padStart(2, "0");
        const newId = `${newY}-${newM}-${newD}`;

        const newDocRef = doc(db, "roster", newId);
        const oldDocRef = doc(db, "roster", oldId);

        const newData = { ...entry, id: newId, date: newId };
        batch.set(newDocRef, newData);
        batch.delete(oldDocRef);
        count++;
      });

      if (count > 0) {
        await batch.commit();
        alert(`Successfully migrated ${count} documents! Page will reload.`);
        window.location.reload();
      } else {
        alert("No documents found to migrate.");
      }
    } catch (err) {
      console.error(err);
      alert("Migration failed. Check console for details.");
    } finally {
      setLoadingUsers(false);
    }
  };

  if (loadingRoster || loadingUsers) return <Spinner />;

  if (rosterDates.length === 0) {
    return (
      <div className="dashboard-empty">
        <h2>No upcoming events found</h2>
        <p>You are not rostered for any upcoming team events.</p>
      </div>
    );
  }

  const currentEventDate = rosterDates[currentDateIndex];
  const todayKey = getTodayKey();
  const isPast = currentEventDate && currentEventDate < todayKey;
  const pageTitle = isPast ? "Previous Event" : "Upcoming Events";

  const isSuperAdmin = userData?.isAdmin && userData?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const formatDate = (dateStr: string) => {
    // Correct date interpretation for YYYY-MM-DD (force local time)
    const localDate = new Date(dateStr.replace(/-/g, "/"));
    return localDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const renderTeamCards = (dateStr: string, isPeek: boolean = false) => {
    const data = getDashboardDataForDate(dateStr);
    if (!data) return null;

    return (
      <div className="team-cards-container">
        {data.map((teamData) => (
          <div key={teamData.teamName} className="team-event-card">
            <div className="team-event-header">
              <h3>
                <span className="team-card-emoji">{teamData.teamEmoji}</span>
                <span className="team-card-name">{teamData.teamName}</span>
              </h3>
              {!isPeek && (
                <button
                  className="copy-roster-btn"
                  onClick={() =>
                    handleCopy(
                      dateStr,
                      teamData.teamName,
                      teamData.teamEmoji,
                      teamData.positions,
                    )
                  }
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
              )}
            </div>

            <div className="team-event-details">
              {teamData.positions.map((group) => (
                <div key={group.posName} className="pos-assignment-row">
                  <span className="pos-emoji-label" title={group.posName}>
                    {group.emoji}
                  </span>
                  <span
                    className={`assigned-names ${group.names.length === 0 ? "unassigned" : ""}`}
                  >
                    {group.names.length > 0
                      ? group.names.join(", ")
                      : "Unassigned"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{pageTitle}</h1>
        <div className="dashboard-header-actions">
          {isPast && (
            <button className="clear-past-btn" onClick={handleClearDate}>
              Reset to upcoming
            </button>
          )}
          {isSuperAdmin && (
            <>
              <button className="migration-btn" onClick={() => runMigration(1)}>
                Shift +1 Day
              </button>
              <button className="migration-btn" onClick={() => runMigration(-1)}>
                Shift -1 Day
              </button>
            </>
          )}
        </div>
      </div>

      <div className="carousel-outer-wrapper">
        <div
          className="events-carousel-track"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {rosterDates.map((dateStr, index) => {
            const dateKey = dateStr;
            const entry = dirtyEntries[dateKey] || entries[dateKey];
            const eventName = entry?.eventName || "";

            return (
              <div
                key={dateStr}
                className={`event-card-wrapper ${index === currentDateIndex ? "active" : "peek"}`}
              >
                <div className="event-name-container">
                  <input
                    type="text"
                    className="dashboard-event-name-input"
                    placeholder="Event name (e.g. Easter Sunday)"
                    value={eventName}
                    onChange={(e) =>
                      handleEventNameChange(dateStr, e.target.value)
                    }
                    disabled={index !== currentDateIndex}
                  />
                </div>
                <div className="event-card-date">{formatDate(dateStr)}</div>
                {renderTeamCards(dateStr, index !== currentDateIndex)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="carousel-pagination">
        {currentDateIndex + 1} / {rosterDates.length}
      </div>

      {hasDirtyChanges && (
        <div className="roster-save-footer">
          <div className="save-footer-content">
            <span className="changes-label">Unsaved event labels</span>
            <div className="save-footer-actions">
              <button
                className="cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Discard
              </button>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

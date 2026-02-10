import { useMemo, useEffect, useState, useCallback, useRef } from "react";

import { collection, query, where, getDocs } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";

import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Weekday, AppUser } from "../../model/model";
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

  const hasDirtyChanges = Object.keys(dirtyEntries).length > 0;

  useEffect(() => {
    dispatch(fetchRosterEntries());
  }, [dispatch]);

  const rosterDates = useMemo(() => {
    if (!userData?.teams || allTeams.length === 0) return [];

    const userTeams = allTeams.filter((t) => userData.teams.includes(t.name));
    const dateSet = new Set<string>();

    userTeams.forEach((team) => {
      const upcoming = getUpcomingDates(team.preferredDays as Weekday[]);
      upcoming.forEach((d) => dateSet.add(d));
    });

    // Filter dates: only keep dates that have at least one assignment in any of the user's teams
    return Array.from(dateSet)
      .sort()
      .filter((dateStr) => {
        const dateKey = dateStr.split("T")[0];
        const entry = entries[dateKey] || dirtyEntries[dateKey];
        if (!entry) return false;

        return userTeams.some((team) => {
          const teamAssignments = entry.teams?.[team.name] || {};
          return Object.values(teamAssignments).some(
            (posList) => posList.length > 0,
          );
        });
      });
  }, [userData, allTeams, entries, dirtyEntries]);

  // Handle deep-linking to a specific date
  useEffect(() => {
    if (targetDate && rosterDates.length > 0 && scrollRef.current) {
      const index = rosterDates.findIndex((d) => d.startsWith(targetDate));
      if (index >= 0) {
        // We delay slightly to ensure the track has rendered its children
        setTimeout(() => {
          if (scrollRef.current) {
            const container = scrollRef.current;
            const itemWidth = container.offsetWidth;
            container.scrollTo({
              left: itemWidth * index,
              behavior: "auto", // Direct jump for initial load
            });
            setCurrentDateIndex(index);
          }
        }, 100);
      }
    }
  }, [targetDate, rosterDates]);

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
      const dateKey = dateStr.split("T")[0];
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
    [entries, userData, allTeams, allPositions, teamUsers],
  );

  const handleCopy = (
    dateStr: string,
    teamName: string,
    teamEmoji: string,
    positions: { posName: string; emoji: string; names: string[] }[],
  ) => {
    const formattedDate = new Date(dateStr).toLocaleDateString("en-GB", {
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
    const index = Math.round(container.scrollLeft / container.offsetWidth);
    if (index !== currentDateIndex) {
      setCurrentDateIndex(index);
      // Update URL search params to reflect current date for persistence
      const date = rosterDates[index];
      if (date) {
        setSearchParams({ date: date.split("T")[0] }, { replace: true });
      }
    }
  };

  const handleEventNameChange = (dateStr: string, eventName: string) => {
    dispatch(updateLocalEventName({ date: dateStr.split("T")[0], eventName }));
  };

  const handleSave = () => {
    dispatch(saveRosterChanges(dirtyEntries));
  };

  const handleCancel = () => {
    dispatch(resetRosterEdits());
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

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
        <h1>Upcoming Events</h1>
      </div>

      <div className="carousel-outer-wrapper">
        <div
          className="events-carousel-track"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {rosterDates.map((dateStr, index) => {
            const dateKey = dateStr.split("T")[0];
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

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';

import { collection, query, where, getDocs } from 'firebase/firestore';

import Spinner from '../../components/common/Spinner';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Weekday, AppUser } from '../../model/model';
import { fetchRosterEntries } from '../../store/slices/rosterSlice';
import { getUpcomingDates } from '../../store/slices/rosterViewSlice';

import './dashboard-page.css';

const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const { userData } = useAppSelector((state) => state.auth);
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { entries, loading: loadingRoster } = useAppSelector((state) => state.roster);
  const { positions: allPositions } = useAppSelector((state) => state.positions);

  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchRosterEntries());
  }, [dispatch]);

  useEffect(() => {
    const fetchMyTeamsUsers = async () => {
      if (!userData?.teams || userData.teams.length === 0) return;
      setLoadingUsers(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('teams', 'array-contains-any', userData.teams));
        const snap = await getDocs(q);
        const users: AppUser[] = [];
        snap.forEach((doc) => users.push(doc.data() as AppUser));
        setTeamUsers(users);
      } catch (err) {
        console.error('Error fetching users for dashboard:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchMyTeamsUsers();
  }, [userData?.teams]);

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
        const dateKey = dateStr.split('T')[0];
        const entry = entries[dateKey];
        if (!entry) return false;

        return userTeams.some((team) => {
          const teamAssignments = entry.teams?.[team.name] || {};
          return Object.values(teamAssignments).some((posList) => posList.length > 0);
        });
      });
  }, [userData, allTeams, entries]);

  const getDashboardDataForDate = useCallback(
    (dateStr: string | null) => {
      if (!dateStr || !userData?.teams || allTeams.length === 0) return null;
      const dateKey = dateStr.split('T')[0];
      const entry = entries[dateKey];

      const userTeams = allTeams.filter((t) => userData.teams.includes(t.name));

      const data = userTeams.map((team) => {
        const teamAssignments = entry?.teams?.[team.name] || {};

        const positionGroups: { posName: string; emoji: string; names: string[] }[] = [];
        const teamPositionNames = team.positions.map((p) => p.name);

        let totalAssignedInTeam = 0;

        teamPositionNames.forEach((posName) => {
          const posInfo = allPositions.find((p) => p.name === posName);
          const assignedNames: string[] = [];

          Object.entries(teamAssignments).forEach(([email, posList]) => {
            if (posList.includes(posName)) {
              const user = teamUsers.find((u) => u.email === email);
              assignedNames.push(user?.name || email);
              totalAssignedInTeam++;
            }
          });

          positionGroups.push({
            posName,
            emoji: posInfo?.emoji || '❓',
            names: assignedNames,
          });
        });

        return {
          teamName: team.name,
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
    positions: { posName: string; emoji: string; names: string[] }[],
  ) => {
    const formattedDate = new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let text = `${formattedDate} - ${teamName}\n`;
    positions.forEach((p) => {
      const namesText = p.names.length > 0 ? p.names.join(', ') : '-';
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const renderTeamCards = (dateStr: string, isPeek: boolean = false) => {
    const data = getDashboardDataForDate(dateStr);
    if (!data) return null;

    return (
      <div className="team-cards-container">
        {data.map((teamData) => (
          <div key={teamData.teamName} className="team-event-card">
            <div className="team-event-header">
              <h3>{teamData.teamName}</h3>
              {!isPeek && (
                <button
                  className="copy-roster-btn"
                  onClick={() => handleCopy(dateStr, teamData.teamName, teamData.positions)}
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
                  <span className={`assigned-names ${group.names.length === 0 ? 'unassigned' : ''}`}>
                    {group.names.length > 0 ? group.names.join(', ') : 'Unassigned'}
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
        <div className="events-carousel-track" ref={scrollRef} onScroll={handleScroll}>
          {rosterDates.map((dateStr, index) => (
            <div
              key={dateStr}
              className={`event-card-wrapper ${index === currentDateIndex ? 'active' : 'peek'}`}
            >
              <div className="event-card-date">{formatDate(dateStr)}</div>
              {renderTeamCards(dateStr, index !== currentDateIndex)}
            </div>
          ))}
        </div>
      </div>

      <div className="carousel-pagination">
        {currentDateIndex + 1} / {rosterDates.length}
      </div>
    </div>
  );
};

export default DashboardPage;
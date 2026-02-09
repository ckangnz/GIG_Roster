import { useState, useEffect } from 'react';

import Pill, { PillGroup } from '../../components/common/Pill';
import SettingsTable, {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from '../../components/common/SettingsTable';
import Spinner from '../../components/common/Spinner';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Position, Team, Weekday } from '../../model/model';
import { fetchPositions } from '../../store/slices/positionsSlice';
import { fetchTeams, updateTeams } from '../../store/slices/teamsSlice';

const defaultTeam: Team = {
  name: '',
  emoji: '',
  positions: [],
  preferredDays: [],
  maxConflict: 1,
};

const WEEK_DAYS: Weekday[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const TeamManagement = () => {
  const dispatch = useAppDispatch();
  const {
    teams: reduxTeams,
    fetched: teamsFetched,
    loading: teamsLoading,
  } = useAppSelector((state) => state.teams);
  const {
    positions: availablePositions,
    fetched: positionsFetched,
    loading: positionsLoading,
  } = useAppSelector((state) => state.positions);

  const [teams, setTeams] = useState<Team[]>(reduxTeams);
  const [newTeam, setNewTeam] = useState<Team>(defaultTeam);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!teamsFetched) {
      dispatch(fetchTeams());
    }
    if (!positionsFetched) {
      dispatch(fetchPositions());
    }
  }, [dispatch, teamsFetched, positionsFetched]);

  useEffect(() => {
    setTeams(reduxTeams);
  }, [reduxTeams]);

  const handleUpdate = (index: number, field: keyof Team, value: Team[keyof Team]) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], [field]: value };
    setTeams(updated);
  };

  const move = (index: number, direction: 'up' | 'down') => {
    const updated = [...teams];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;

    setTeams(updated);
  };

  const togglePosition = (teamIndex: number, pos: Position) => {
    const updatedTeams = teams.map((team, index) => {
      if (index !== teamIndex) return team;

      const currentPositions = team.positions || [];
      const newPositions = currentPositions.find((p) => p.name === pos.name)
        ? currentPositions.filter((p) => p.name !== pos.name)
        : [...currentPositions, pos];
      return { ...team, positions: newPositions };
    });
    setTeams(updatedTeams);
  };

  const toggleDay = (teamIndex: number, day: Weekday) => {
    const updatedTeams = teams.map((team, index) => {
      if (index !== teamIndex) return team;

      const currentDays = team.preferredDays || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...team, preferredDays: newDays };
    });
    setTeams(updatedTeams);
  };

  const addTeam = () => {
    if (!newTeam.name.trim() || !newTeam.emoji.trim()) {
      return alert('Please provide both an emoji and a name for the team.');
    }
    setTeams([...teams, newTeam]);
    setNewTeam(defaultTeam);
  };

  const deleteTeam = (index: number) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      setTeams(teams.filter((_, i) => i !== index));
    }
  };

  const saveToFirebase = async () => {
    setStatus('saving');
    try {
      await dispatch(updateTeams(teams)).unwrap();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error('Save Error:', e);
      alert("Check Firestore Rules: You may lack permission to write to 'metadata'.");
      setStatus('idle');
    }
  };

  if (teamsLoading || positionsLoading) {
    return <Spinner />;
  }

  return (
    <>
      <SettingsTable
        headers={[
          { text: 'Order', minWidth: 50, textAlign: 'center' },
          { text: 'Emoji', width: 30 },
          { text: 'Name', minWidth: 100 },
          { text: 'Conflicts', width: 60, textAlign: 'center' },
          { text: 'Allowed Positions', minWidth: 200 },
          { text: 'Preferred Days', minWidth: 250 },
          { text: '', width: 50 },
        ]}
      >
        {teams.map((team, teamIndex) => (
          <tr key={`${team.emoji}-${teamIndex}`}>
            <SettingsTableAnyCell>
              {' '}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  justifyContent: 'center',
                }}
              >
                <button
                  className="icon-button icon-button--small icon-button--secondary"
                  onClick={() => move(teamIndex, 'up')}
                  disabled={teamIndex === 0}
                >
                  ▲
                </button>
                <button
                  className="icon-button icon-button--small icon-button--secondary"
                  onClick={() => move(teamIndex, 'down')}
                  disabled={teamIndex === teams.length - 1}
                >
                  ▼
                </button>
              </div>
            </SettingsTableAnyCell>
            <SettingsTableInputCell
              name={`team-emoji-${teamIndex}`}
              value={team.emoji}
              onChange={(e) => handleUpdate(teamIndex, 'emoji', e.target.value)}
            />
            <SettingsTableInputCell
              name={`team-name-${teamIndex}`}
              value={team.name}
              onChange={(e) => handleUpdate(teamIndex, 'name', e.target.value)}
            />
            <SettingsTableInputCell
              name={`team-maxConflict-${teamIndex}`}
              value={team.maxConflict?.toString() || '1'}
              type="number"
              onChange={(e) => handleUpdate(teamIndex, 'maxConflict', parseInt(e.target.value) || 1)}
            />
            <SettingsTableAnyCell>
              <PillGroup nowrap>
                {availablePositions
                  ?.filter((pos) => !pos.parentId)
                  ?.map((pos) => {
                    const isActive = team.positions?.some((p) => p.name === pos.name);
                    return (
                      <Pill
                        key={pos.name}
                        colour={pos.colour}
                        isActive={isActive}
                        onClick={() => togglePosition(teamIndex, pos)}
                      >
                        {pos.emoji}
                      </Pill>
                    );
                  })}
              </PillGroup>
            </SettingsTableAnyCell>
            <SettingsTableAnyCell>
              <PillGroup nowrap>
                {WEEK_DAYS.map((day) => {
                  const isActive = team.preferredDays?.includes(day);
                  return (
                    <Pill
                      key={day}
                      isActive={isActive}
                      onClick={() => toggleDay(teamIndex, day)}
                    >
                      {day.substring(0, 3)}
                    </Pill>
                  );
                })}
              </PillGroup>
            </SettingsTableAnyCell>
            <SettingsTableAnyCell>
              <button
                className="icon-button icon-button--delete"
                onClick={() => deleteTeam(teamIndex)}
              >
                ×
              </button>
            </SettingsTableAnyCell>
          </tr>
        ))}
        <tr className="team-row-new">
          <td className="">{''}</td>
          <SettingsTableInputCell
            name={`new-team-emoji`}
            value={newTeam.emoji}
            placeholder="✨"
            onChange={(e) => setNewTeam({ ...newTeam, emoji: e.target.value })}
          />
          <SettingsTableInputCell
            name={`new-team-name`}
            value={newTeam.name}
            placeholder="Team Name"
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
          />
          <SettingsTableInputCell
            name={`new-team-maxConflict`}
            value={newTeam.maxConflict?.toString() || '1'}
            type="number"
            onChange={(e) => setNewTeam({ ...newTeam, maxConflict: parseInt(e.target.value) || 1 })}
          />
          <SettingsTableAnyCell>
            <PillGroup nowrap>
              {availablePositions
                ?.filter((pos) => !pos.parentId)
                ?.map((pos) => {
                  const isActive = newTeam.positions?.some((p) => p.name === pos.name);
                  return (
                    <Pill
                      key={`new-${pos.name}`}
                      colour={pos.colour}
                      isActive={isActive}
                      onClick={() =>
                        setNewTeam((prev) => {
                          const currentPositions = prev.positions || [];
                          const newPositions = currentPositions.some((p) => p.name === pos.name)
                            ? currentPositions.filter((p) => p.name !== pos.name)
                            : [...currentPositions, pos];
                          return { ...prev, positions: newPositions };
                        })
                      }
                    >
                      {pos.emoji}
                    </Pill>
                  );
                })}
            </PillGroup>
          </SettingsTableAnyCell>
          <SettingsTableAnyCell>
            <PillGroup nowrap>
              {WEEK_DAYS.map((day) => {
                const isActive = newTeam.preferredDays?.includes(day);
                return (
                  <Pill
                    key={`new-team-${day}`}
                    isActive={isActive}
                    onClick={() =>
                      setNewTeam((prev) => {
                        const currentDays = prev.preferredDays || [];
                        const newDays = currentDays.includes(day)
                          ? currentDays.filter((d) => d !== day)
                          : [...currentDays, day];
                        return { ...prev, preferredDays: newDays };
                      })
                    }
                  >
                    {day.substring(0, 3)}
                  </Pill>
                );
              })}
            </PillGroup>
          </SettingsTableAnyCell>
          <SettingsTableAnyCell>
            <button
              onClick={addTeam}
              className="icon-button icon-button--add"
              disabled={!newTeam.name.trim() || !newTeam.emoji.trim()}
            >
              +
            </button>
          </SettingsTableAnyCell>
        </tr>
      </SettingsTable>

      <div className="settings-footer">
        <button
          className={`save-button ${status}`}
          onClick={saveToFirebase}
          disabled={status !== 'idle'}
        >
          {status === 'saving'
            ? 'Saving...'
            : status === 'success'
            ? 'Done ✓'
            : 'Save All Team Changes'}
        </button>
      </div>
    </>
  );
};

export default TeamManagement;

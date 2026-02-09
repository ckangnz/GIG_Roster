import { useState } from 'react';

import Pill, { PillGroup } from '../../components/common/Pill';
import { auth } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateUserProfile } from '../../store/slices/authSlice';
import './profile-settings.css';

const ProfileSettings = () => {
  const dispatch = useAppDispatch();
  const { userData, firebaseUser } = useAppSelector((state) => state.auth);
  const availableTeams = useAppSelector((state) => state.teams.teams);

  const [name, setName] = useState(userData?.name || '');
  const [gender, setGender] = useState(userData?.gender || '');
  const [isActive, setIsActive] = useState(userData?.isActive ?? true);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(userData?.teams || []);
  const [teamPositions, setTeamPositions] = useState<Record<string, string[]>>(
    userData?.teamPositions || {},
  );
  const [status, setStatus] = useState('idle');

  const handleSave = async () => {
    if (!firebaseUser) return;
    setStatus('saving');
    try {
      const updateData = {
        name,
        gender,
        isActive,
        teams: selectedTeams,
        teamPositions,
      };
      await dispatch(updateUserProfile({ uid: firebaseUser.uid, data: updateData })).unwrap();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

  const toggleTeam = (teamName: string) => {
    setSelectedTeams((prev) => {
      const isRemoving = prev.includes(teamName);
      const newTeams = isRemoving
        ? prev.filter((name) => name !== teamName)
        : [...prev, teamName];

      setTeamPositions((prevTP) => {
        const nextTP = { ...prevTP };
        if (isRemoving) {
          delete nextTP[teamName];
        } else if (!nextTP[teamName]) {
          nextTP[teamName] = [];
        }
        return nextTP;
      });

      return newTeams;
    });
  };

  const toggleTeamPosition = (teamName: string, posName: string) => {
    setTeamPositions((prev) => {
      const current = prev[teamName] || [];
      const updated = current.includes(posName)
        ? current.filter((p) => p !== posName)
        : [...current, posName];
      return { ...prev, [teamName]: updated };
    });
  };

  if (!userData) {
    return <div>Loading profile...</div>;
  }

  return (
    <section className="profile-card">
      <div className="profile-readonly">
        <p>
          <strong>Email:</strong> {userData.email}
        </p>
      </div>

      <div className="form-group">
        <label>Name</label>
        <PillGroup>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input form-input-width-auto"
          />
        </PillGroup>
      </div>
      <div className="form-group">
        <label>Gender</label>
        <PillGroup>
          {[
            { value: 'Male', colour: 'var(--color-male)' },
            { value: 'Female', colour: 'var(--color-female)' },
          ].map((g: { value: string; colour: string }) => (
            <Pill
              key={g.value}
              colour={g.colour}
              onClick={() => setGender(g.value)}
              isActive={gender === g.value}
            >
              {g.value}
            </Pill>
          ))}
        </PillGroup>
      </div>

      <div className="form-group">
        <label>My Teams</label>
        <PillGroup>
          {availableTeams.map((team) => {
            const isSelected = selectedTeams.includes(team.name);
            return (
              <Pill
                key={team.name}
                onClick={() => toggleTeam(team.name)}
                isActive={isSelected}
              >
                <span>{team.emoji}</span> {team.name}
              </Pill>
            );
          })}
        </PillGroup>
      </div>

      {selectedTeams.length > 0 && (
        <div className="team-positions-section">
          <label className="section-label">Positions per Team</label>
          {selectedTeams.map((teamName) => {
            const team = availableTeams.find((t) => t.name === teamName);
            if (!team) return null;

            return (
              <div key={teamName} className="team-position-group">
                <div className="team-position-header">
                  {team.emoji} {team.name}
                </div>
                <PillGroup>
                  {team.positions
                    ?.filter((pos) => !pos.parentId)
                    ?.map((pos) => {
                      const isSelected = teamPositions[teamName]?.includes(pos.name);
                      return (
                        <Pill
                          key={pos.name}
                          onClick={() => toggleTeamPosition(teamName, pos.name)}
                          isActive={isSelected}
                          colour={pos.colour}
                        >
                          <span>{pos.emoji}</span> {pos.name}
                        </Pill>
                      );
                    })}
                </PillGroup>
              </div>
            );
          })}
        </div>
      )}

      <div className="form-group">
        <label>Availability Status</label>
        <Pill
          colour={isActive ? 'var(--color-success-dark)' : 'var(--color-warning-dark)'}
          onClick={() => setIsActive(!isActive)}
          isActive
        >
          {isActive ? 'ACTIVE & AVAILABLE' : 'INACTIVE / AWAY'}
        </Pill>
        <p className="form-field-hint">
          Turn off if you want to be hidden from the roster.
        </p>
      </div>

      <div className="action-container">
        <button
          onClick={handleSave}
          disabled={status !== 'idle'}
          className={`save-button ${status}`}
        >
          {status === 'saving'
            ? 'Saving...'
            : status === 'success'
            ? 'Done ✓'
            : 'Update Profile'}
        </button>
        <button onClick={() => auth.signOut()} className="logout-btn">
          Logout
        </button>
      </div>
    </section>
  );
};

export default ProfileSettings;

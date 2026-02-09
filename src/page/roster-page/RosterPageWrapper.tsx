import { useEffect } from 'react';

import RosterPage from './RosterPage';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchRosterEntries } from '../../store/slices/rosterSlice';

const RosterPageWrapper = () => {
  const dispatch = useAppDispatch();
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const activePosition = useAppSelector((state) => state.ui.activeSideItem);
  const activeTeamName = useAppSelector((state) => state.ui.activeTeamName);

  useEffect(() => {
    dispatch(fetchRosterEntries());
  }, [dispatch]);

  if (!firebaseUser) {
    return null;
  }

  return (
    <RosterPage
      uid={firebaseUser.uid}
      activePosition={activePosition}
      activeTeamName={activeTeamName}
    />
  );
};

export default RosterPageWrapper;

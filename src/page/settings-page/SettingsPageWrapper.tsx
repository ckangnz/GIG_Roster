import { useEffect } from 'react';

import SettingsPage from './SettingsPage';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchPositions } from '../../store/slices/positionsSlice';
import { fetchTeams } from '../../store/slices/teamsSlice';

const SettingsPageWrapper = () => {
  const dispatch = useAppDispatch();
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const userData = useAppSelector((state) => state.auth.userData);
  const activeSection = useAppSelector((state) => state.ui.activeSideItem);

  useEffect(() => {
    dispatch(fetchTeams());
    dispatch(fetchPositions());
  }, [dispatch]);

  if (!firebaseUser || !userData) {
    return null;
  }

  return (
    <SettingsPage
      userData={userData}
      uid={firebaseUser.uid}
      activeSection={activeSection}
    />
  );
};

export default SettingsPageWrapper;

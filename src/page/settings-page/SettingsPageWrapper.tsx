import SettingsPage from './SettingsPage';
import { useAppSelector } from '../../hooks/redux';

const SettingsPageWrapper = () => {
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const userData = useAppSelector((state) => state.auth.userData);

  if (!firebaseUser || !userData) {
    return null;
  }

  return (
    <SettingsPage
      userData={userData}
      uid={firebaseUser.uid}
      activeSection={null}
    />
  );
};

export default SettingsPageWrapper;

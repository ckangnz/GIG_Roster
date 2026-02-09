import SettingsPage from './SettingsPage';
import { useAppSelector } from '../../hooks/redux';

const SettingsPageWrapper = () => {
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const userData = useAppSelector((state) => state.auth.userData);
  const activeSection = useAppSelector((state) => state.ui.activeSideItem);

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

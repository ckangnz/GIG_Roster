import GuestPage from './GuestPage';
import { useAppSelector } from '../../hooks/redux';

const GuestPageWrapper = () => {
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const userData = useAppSelector((state) => state.auth.userData);

  if (!firebaseUser || !userData) {
    return null;
  }

  return <GuestPage user={userData} uid={firebaseUser.uid} />;
};

export default GuestPageWrapper;

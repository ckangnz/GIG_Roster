import { Navigate } from 'react-router-dom';

import GuestPage from './GuestPage';
import { useAppSelector } from '../../hooks/redux';
import LoadingPage from '../loading-page/LoadingPage';

const GuestPageWrapper = () => {
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const userData = useAppSelector((state) => state.auth.userData);
  const loading = useAppSelector((state) => state.auth.loading);

  if (loading) {
    return <LoadingPage />;
  }

  if (!firebaseUser || !userData) {
    return <Navigate to="/login" replace />;
  }

  return <GuestPage user={userData} uid={firebaseUser.uid} />;
};

export default GuestPageWrapper;

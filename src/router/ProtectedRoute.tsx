import { Navigate, Outlet } from 'react-router-dom';

import { useAppSelector } from '../hooks/redux';
import LoadingPage from '../page/loading-page/LoadingPage';

const ProtectedRoute = () => {
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const userData = useAppSelector((state) => state.auth.userData);
  const loading = useAppSelector((state) => state.auth.loading);

  if (loading) {
    return <LoadingPage />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userData) {
    return <LoadingPage />;
  }

  if (!userData.isApproved) {
    return <Navigate to="/guest" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

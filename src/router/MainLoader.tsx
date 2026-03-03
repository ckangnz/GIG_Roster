import { Navigate } from "react-router-dom";

import { useAppSelector } from "../hooks/redux";
import LoadingPage from "../page/loading-page/LoadingPage";

const MainLoader = () => {
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const userData = useAppSelector((state) => state.auth.userData);
  const loading = useAppSelector((state) => state.auth.loading);
  const activeOrgId = useAppSelector((state) => state.auth.activeOrgId);
  const membership = useAppSelector((state) => state.auth.membership);

  if (loading) {
    return <LoadingPage />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userData) {
    return <LoadingPage />;
  }

  const orgIds = userData.organisations || [];
  const hasOrgs = Array.isArray(orgIds) ? orgIds.length > 0 : Object.keys(orgIds).length > 0;

  if (!hasOrgs) {
    return <Navigate to="/guest" replace />;
  }

  if (!activeOrgId) {
    return <Navigate to="/select-org" replace />;
  }

  const isApproved = membership?.isApproved;

  if (!isApproved) {
    return <Navigate to="/guest" replace />;
  }

  return <Navigate to="/app/dashboard" replace />;
};

export default MainLoader;

import { Navigate, useSearchParams } from "react-router-dom";

import { useAppSelector } from "../hooks/redux";
import LoadingPage from "../page/loading-page/LoadingPage";
import { selectUserData } from "../store/slices/authSlice";

const MainLoader = () => {
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);
  const userData = useAppSelector(selectUserData);
  const loading = useAppSelector((state) => state.auth.loading);
  const activeOrgId = useAppSelector((state) => state.auth.activeOrgId);
  const [searchParams] = useSearchParams();

  // Capture invite param from URL or sessionStorage
  const inviteOrgId = searchParams.get("join") || sessionStorage.getItem("pendingInviteOrgId");


  if (loading) {
    return <LoadingPage />;
  }

  if (!firebaseUser) {
    // Not logged in — go to login, preserving invite param in URL
    const loginPath = inviteOrgId ? `/login?join=${inviteOrgId}` : "/login";
    return <Navigate to={loginPath} replace />;
  }

  if (!userData) {
    return <LoadingPage />;
  }

  const orgIds = userData.organisations || [];
  const hasOrgs = Array.isArray(orgIds) ? orgIds.length > 0 : Object.keys(orgIds).length > 0;

  // If there's a pending invite, redirect to guest page to handle it
  if (inviteOrgId) {
    const orgs = userData.organisations;
    const isMember = Array.isArray(orgs)
      ? orgs.includes(inviteOrgId)
      : !!orgs?.[inviteOrgId];

    if (isMember) {
      sessionStorage.removeItem("pendingInviteOrgId");
      return <Navigate to="/app/dashboard" replace />;
    }

    return <Navigate to={`/guest?join=${inviteOrgId}`} replace />;
  }

  if (!activeOrgId) {
    if (hasOrgs) {
      return <Navigate to="/select-org" replace />;
    }
    return <Navigate to="/guest" replace />;
  }

  // activeOrgId is set but user is not approved — send back to select-org
  if (!userData.isApproved) {
    return <Navigate to="/select-org" replace />;
  }

  return <Navigate to="/app/dashboard" replace />;
};

export default MainLoader;

import { useEffect } from "react";

import { Navigate, Outlet } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../hooks/redux";
import LoadingPage from "../page/loading-page/LoadingPage";
import { fetchPositions } from "../store/slices/positionsSlice";
import { fetchTeams } from "../store/slices/teamsSlice";

const ProtectedRoute = () => {
  const dispatch = useAppDispatch();
  const { firebaseUser, userData, loading } = useAppSelector(
    (state) => state.auth,
  );
  const { fetched: teamsFetched, loading: teamsLoading } = useAppSelector((state) => state.teams);
  const { fetched: positionsFetched, loading: positionsLoading } = useAppSelector(
    (state) => state.positions,
  );

  const activeOrgId = useAppSelector((state) => state.auth.activeOrgId);
  const membership = useAppSelector((state) => state.auth.membership);
  const isApproved = membership?.isApproved || false;

  useEffect(() => {
    if (firebaseUser && isApproved && activeOrgId) {
      if (!teamsFetched && !teamsLoading) {
        dispatch(fetchTeams(activeOrgId));
      }
      if (!positionsFetched && !positionsLoading) {
        dispatch(fetchPositions(activeOrgId));
      }
    }
  }, [dispatch, firebaseUser, isApproved, activeOrgId, teamsFetched, teamsLoading, positionsFetched, positionsLoading]);

  if (loading || !userData) {
    return <LoadingPage />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrgId) {
    return <Navigate to="/select-org" replace />;
  }

  if (!isApproved) {
    return <Navigate to="/guest" replace />;
  }

  // We no longer block on teamsFetched/positionsFetched here.
  // The master listeners in MainLayout will handle the real-time data sync.
  // Individual pages (like Dashboard) already have their own loading spinners.

  return <Outlet />;
};

export default ProtectedRoute;

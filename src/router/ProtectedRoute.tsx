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

  useEffect(() => {
    const orgId = userData?.orgId;
    if (firebaseUser && userData?.isApproved && orgId) {
      if (!teamsFetched && !teamsLoading) {
        dispatch(fetchTeams(orgId));
      }
      if (!positionsFetched && !positionsLoading) {
        dispatch(fetchPositions(orgId));
      }
    }
  }, [dispatch, firebaseUser, userData, teamsFetched, teamsLoading, positionsFetched, positionsLoading]);

  if (loading || !userData) {
    return <LoadingPage />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userData.isApproved) {
    return <Navigate to="/guest" replace />;
  }

  // We no longer block on teamsFetched/positionsFetched here.
  // The master listeners in MainLayout will handle the real-time data sync.
  // Individual pages (like Dashboard) already have their own loading spinners.

  return <Outlet />;
};

export default ProtectedRoute;

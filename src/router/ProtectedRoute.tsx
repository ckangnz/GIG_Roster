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
    if (firebaseUser && userData?.isApproved) {
      if (!teamsFetched && !teamsLoading) {
        dispatch(fetchTeams());
      }
      if (!positionsFetched && !positionsLoading) {
        dispatch(fetchPositions());
      }
    }
  }, [dispatch, firebaseUser, userData, teamsFetched, teamsLoading, positionsFetched, positionsLoading]);

  if (loading || (userData?.isApproved && (!teamsFetched || !positionsFetched))) {
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

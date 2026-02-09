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
  const { fetched: teamsFetched } = useAppSelector((state) => state.teams);
  const { fetched: positionsFetched } = useAppSelector(
    (state) => state.positions,
  );

  useEffect(() => {
    if (firebaseUser) {
      if (!teamsFetched) {
        dispatch(fetchTeams());
      }
      if (!positionsFetched) {
        dispatch(fetchPositions());
      }
    }
  }, [dispatch, firebaseUser, teamsFetched, positionsFetched]);

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

import { RouteObject } from "react-router-dom";

import MainLoader from "./MainLoader";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../components/layout/MainLayout";
import DashboardPage from "../page/dashboard-page/DashboardPage";
import GuestPage from "../page/guest-page/GuestPage";
import LoginPage from "../page/login-page/LoginPage";
import RosterPage from "../page/roster-page/RosterPage";
import SettingsPage from "../page/settings-page/SettingsPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <MainLoader />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/guest",
    element: <GuestPage />,
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        path: "",
        element: <MainLayout />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "roster/:teamName?/:positionName?",
            element: <RosterPage />,
          },
          {
            path: "settings/:section?",
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
];

import { RouteObject } from 'react-router-dom';

import MainLoader from './MainLoader';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import GuestPageWrapper from '../page/guest-page/GuestPageWrapper';
import LoginPage from '../page/login-page/LoginPage';
import RosterPageWrapper from '../page/roster-page/RosterPageWrapper';
import SettingsPageWrapper from '../page/settings-page/SettingsPageWrapper';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLoader />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/guest',
    element: <GuestPageWrapper />,
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <AppLayout />,
        children: [
          {
            path: 'roster',
            element: <RosterPageWrapper />,
          },
          {
            path: 'settings',
            element: <SettingsPageWrapper />,
          },
        ],
      },
    ],
  },
];

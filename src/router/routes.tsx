import { RouteObject } from 'react-router-dom';

import GuestPageWrapper from '../page/guest-page/GuestPageWrapper';
import LoadingPage from '../page/loading-page/LoadingPage';
import LoginPage from '../page/login-page/LoginPage';
import RosterPageWrapper from '../page/roster-page/RosterPageWrapper';
import SettingsPageWrapper from '../page/settings-page/SettingsPageWrapper';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LoadingPage />,
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
    path: '/roster',
    element: <RosterPageWrapper />,
  },
  {
    path: '/settings',
    element: <SettingsPageWrapper />,
  },
];

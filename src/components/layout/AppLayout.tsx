import { useCallback, useEffect } from 'react';

import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import MainLayout from './MainLayout';
import { AppTab, SettingsSection } from '../../constants/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setActiveSelection, setActiveTab } from '../../store/slices/uiSlice';

const AppLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const activeSideItem = useAppSelector((state) => state.ui.activeSideItem);
  const activeTeamName = useAppSelector((state) => state.ui.activeTeamName);

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path === 'settings' && activeTab !== AppTab.SETTINGS) {
      dispatch(setActiveTab(AppTab.SETTINGS));
      dispatch(setActiveSelection({ teamName: null, sideItem: SettingsSection.PROFILE }));
    } else if (path === 'roster' && activeTab !== AppTab.ROSTER) {
      dispatch(setActiveTab(AppTab.ROSTER));
      dispatch(setActiveSelection({ teamName: null, sideItem: null }));
    }
  }, [location.pathname, activeTab, dispatch]);

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab !== activeTab) {
        dispatch(setActiveTab(tab));
        if (tab === AppTab.SETTINGS) {
          dispatch(setActiveSelection({ teamName: null, sideItem: SettingsSection.PROFILE }));
          navigate('/app/settings');
        } else {
          dispatch(setActiveSelection({ teamName: null, sideItem: null }));
          navigate('/app/roster');
        }
      }
    },
    [activeTab, dispatch, navigate],
  );

  const handleActiveSelectionChange = useCallback(
    (teamName: string | null, sideItem: string | null) => {
      dispatch(setActiveSelection({ teamName, sideItem }));
    },
    [dispatch],
  );

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      activeSideItem={activeSideItem}
      activeTeamName={activeTeamName}
      onActiveSelectionChange={handleActiveSelectionChange}
    >
      <Outlet />
    </MainLayout>
  );
};

export default AppLayout;

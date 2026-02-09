import { useCallback } from 'react';

import { Outlet } from 'react-router-dom';

import MainLayout from './MainLayout';
import { AppTab, SettingsSection } from '../../constants/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setActiveSelection, setActiveTab } from '../../store/slices/uiSlice';

const AppLayout = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const activeSideItem = useAppSelector((state) => state.ui.activeSideItem);
  const activeTeamName = useAppSelector((state) => state.ui.activeTeamName);

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab !== activeTab) {
        dispatch(setActiveTab(tab));
        if (tab === AppTab.SETTINGS) {
          dispatch(setActiveSelection({ teamName: null, sideItem: SettingsSection.PROFILE }));
        } else {
          dispatch(setActiveSelection({ teamName: null, sideItem: null }));
        }
      }
    },
    [activeTab, dispatch],
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

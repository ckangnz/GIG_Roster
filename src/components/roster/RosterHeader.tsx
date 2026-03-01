import { ReactNode, memo } from "react";

import { History } from "lucide-react";
import { useTranslation } from "react-i18next";


import { PeekHeader } from "./Peek/PeekHeader";
import { useAppDispatch } from "../../hooks/redux";
import {
  loadPreviousDates,
} from "../../store/slices/rosterViewSlice";

import styles from "./roster-header.module.css";

interface RosterHeaderProps {
  showPeek?: boolean;
  children: ReactNode;
}

const RosterHeader = memo(({ showPeek, children }: RosterHeaderProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const handleLoadPrevious = () => dispatch(loadPreviousDates());

  return (
    <thead>
      <tr>
        <th className={`${styles.rosterTableHeaderCell} ${styles.stickyCol}`}>
          <div className={styles.dateHeaderContent}>
            <button
              className={styles.loadPrevBtn}
              onClick={handleLoadPrevious}
              title={t('roster.loadPrevious')}
            >
              <History size={16} />
            </button>
            <span className={styles.dateText}>{t('common.date', { defaultValue: 'Date' })}</span>
          </div>
        </th>
        {children}
        {showPeek && <PeekHeader />}
      </tr>
    </thead>
  );
});

export default RosterHeader;

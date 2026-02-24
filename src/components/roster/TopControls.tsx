import { Users, LayoutGrid, Plus, X } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { AppUser } from "../../model/model";
import { setFilterUserId, setHighlightedUserId } from "../../store/slices/rosterViewSlice";
import { setRosterAllViewMode } from "../../store/slices/uiSlice";
import Button from "../common/Button";

import styles from "./top-controls.module.css";

interface TopControlsProps {
  isAllView: boolean;
  isAbsenceView: boolean;
  rosterAllViewMode: "user" | "position";
  hiddenUserList: string[];
  allUsers: AppUser[];
  onToggleVisibility: (email: string) => void;
}

const TopControls = ({
  isAllView,
  isAbsenceView,
  rosterAllViewMode,
  hiddenUserList,
  allUsers,
  onToggleVisibility,
}: TopControlsProps) => {
  const dispatch = useAppDispatch();
  const { filterUserId, highlightedUserId } = useAppSelector(state => state.rosterView);
  
  const hasHidden = !isAbsenceView && hiddenUserList.length > 0;
  const isFiltered = !!(filterUserId || highlightedUserId);

  if (!hasHidden && !isAllView) return null;

  const handleClearFilter = () => {
    dispatch(setFilterUserId(null));
    dispatch(setHighlightedUserId(null));
  };

  return (
    <div className={styles.topControls}>
      <div className={styles.topControlsLeft}>
        {isAllView && (
          <div className={styles.viewToggleBar}>
            {isFiltered ? (
              <Button
                variant="primary"
                size="small"
                onClick={handleClearFilter}
                className={styles.toggleButtonGap}
              >
                <X size={18} /> <span>Clear View Filter</span>
              </Button>
            ) : (
              <>
                <Button
                  variant={rosterAllViewMode === "user" ? "primary" : "secondary"}
                  size="small"
                  onClick={() => dispatch(setRosterAllViewMode("user"))}
                  className={styles.toggleButtonGap}
                >
                  <Users size={18} /> <span>User View</span>
                </Button>
                <Button
                  variant={
                    rosterAllViewMode === "position" ? "primary" : "secondary"
                  }
                  size="small"
                  onClick={() => dispatch(setRosterAllViewMode("position"))}
                  className={styles.toggleButtonGap}
                >
                  <LayoutGrid size={18} /> <span>Position View</span>
                </Button>
              </>
            )}
          </div>
        )}

        {hasHidden && (
          <div className={styles.hiddenMembersBar}>
            <span className={styles.hiddenMembersLabel}>Hidden Members:</span>
            <div className={styles.hiddenMembersList}>
              {hiddenUserList.map((email) => {
                const user = allUsers.find((u) => u.email === email);
                return (
                  <Button
                    key={email}
                    variant="secondary"
                    size="small"
                    onClick={() => onToggleVisibility(email)}
                    className={styles.unhideButton}
                  >
                    {user?.name || email} <Plus size={14} />
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopControls;

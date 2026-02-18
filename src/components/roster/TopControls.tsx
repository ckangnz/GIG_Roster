import { Users, LayoutGrid, Plus } from "lucide-react";

import OnlineUsers from "./OnlineUsers";
import { useAppDispatch } from "../../hooks/redux";
import { AppUser } from "../../model/model";
import { setRosterAllViewMode } from "../../store/slices/uiSlice";
import Button from "../common/Button";

import styles from "./roster-table.module.css";

interface TopControlsProps {
  teamName: string | undefined;
  currentUser: AppUser | null;
  isAllView: boolean;
  isAbsenceView: boolean;
  rosterAllViewMode: "user" | "position";
  hiddenUserList: string[];
  allUsers: AppUser[];
  onToggleVisibility: (email: string) => void;
}

const TopControls = ({
  teamName,
  currentUser,
  isAllView,
  isAbsenceView,
  rosterAllViewMode,
  hiddenUserList,
  allUsers,
  onToggleVisibility,
}: TopControlsProps) => {
  const dispatch = useAppDispatch();
  const hasHidden = !isAbsenceView && hiddenUserList.length > 0;

  // Always show topControls if we have a teamName to show online users
  if (!teamName) return null;

  return (
    <div className={styles.topControls}>
      <div className={styles.topControlsLeft}>
        {isAllView && (
          <div className={styles.viewToggleBar}>
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

      <div className={styles.topControlsRight}>
        <OnlineUsers teamName={teamName} currentUser={currentUser} />
      </div>
    </div>
  );
};

export default TopControls;

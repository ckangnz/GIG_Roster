import { useState, useRef, useEffect } from "react";

import { usePresence } from "../../hooks/usePresence";
import { AppUser } from "../../model/model";

import styles from "./online-users.module.css";

interface OnlineUsersProps {
  teamName: string | undefined;
  currentUser: AppUser | null;
}

const OnlineUsers = ({ teamName, currentUser }: OnlineUsersProps) => {
  const onlineUsers = usePresence(teamName, currentUser);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (onlineUsers.length === 0) return null;

  const displayUsers = onlineUsers.slice(0, 3);
  const remainingCount = onlineUsers.length - 3;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2);
  };

  return (
    <div className={styles.onlineUsersContainer} ref={dropdownRef} onClick={() => setShowDropdown(!showDropdown)}>
      <div className={styles.avatarStack}>
        {remainingCount > 0 && <div className={`${styles.avatarCircle} ${styles.moreCircle}`}>+{remainingCount}</div>}
        {[...displayUsers].reverse().map((user) => (
          <div key={user.uid} className={styles.avatarCircle} title={user.name}>
            {getInitials(user.name)}
          </div>
        ))}
      </div>

      {showDropdown && (
        <div className={styles.userDropdown}>
          <div className={styles.dropdownTitle}>Online Now ({onlineUsers.length})</div>
          {onlineUsers.map((user) => (
            <div key={user.uid} className={styles.userItem}>
              <div className={styles.userAvatarSmall}>{getInitials(user.name)}</div>
              <span>
                {user.name} {user.email === currentUser?.email && "(You)"}
              </span>
              <div className={styles.pulse} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;

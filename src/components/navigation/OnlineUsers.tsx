import { useState, useRef, useEffect } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { SETTINGS_NAV_ITEMS } from "../../constants/navigation";
import { resolvePresenceColor } from "../../hooks/presenceUtils";
import { useAppSelector } from "../../hooks/redux";
import { useOnlineUsers, currentSessionId } from "../../hooks/usePresence";
import { useTheme } from "../../hooks/useThemeHook";
import { selectUserData } from "../../store/slices/authSlice";
import { getUserPhotoURL, getInitials } from "../../utils/avatarUtils";
import NameTag from "../common/NameTag";

import styles from "./online-users.module.css";

interface OnlineUsersProps {
  variant?: "top-bar" | "sidebar";
  showText?: boolean;
}

const OnlineUsers = ({
  variant = "top-bar",
  showText = false,
}: OnlineUsersProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onlineUsers = useOnlineUsers();
  const { firebaseUser } = useAppSelector((state) => state.auth);
  const userData = useAppSelector(selectUserData);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentSessionDocId = firebaseUser
    ? `${firebaseUser.uid}_${currentSessionId}`
    : null;
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isRestricted = (path?: string) => {
    if (!path) return false;
    // Check settings pages
    if (path.startsWith("/app/settings/")) {
      const sectionId = path.split("/").pop();
      const item = SETTINGS_NAV_ITEMS.find((i) => i.id === sectionId);
      return item?.adminOnly === true;
    }
    return false;
  };

  const handleUserClick = (
    e: React.MouseEvent,
    userLocation?: string,
    isMe?: boolean,
  ) => {
    e.stopPropagation();
    if (isMe || !userLocation) return;

    const restricted = isRestricted(userLocation);
    if (restricted && !userData?.isAdmin) {
      // Don't navigate non-admins to admin pages
      return;
    }

    navigate(userLocation);
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!onlineUsers || onlineUsers.length === 0) return null;

  const displayUsers = onlineUsers.slice(0, 3);
  const remainingCount = onlineUsers.length - 3;

  const containerClasses = [
    styles.onlineUsersContainer,
    variant === "sidebar" ? styles.sidebarVariant : "",
    showText ? styles.sidebarExpanded : "",
  ]
    .filter(Boolean)
    .join(" ");

  const dropdownClasses = [
    styles.userDropdown,
    variant === "sidebar" ? styles.dropdownUp : styles.dropdownDown,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={containerClasses}
      ref={dropdownRef}
      onClick={() => setShowDropdown(!showDropdown)}
    >
      {showText && <span className={styles.onlineLabel}>{t('common.online', { defaultValue: 'Online' })}</span>}
      <div className={styles.avatarStack}>
        {remainingCount > 0 && (
          <div className={`${styles.avatarCircle} ${styles.moreCircle}`}>
            +{remainingCount}
          </div>
        )}
        {[...displayUsers].reverse().map((user) => (
          <div
            key={user.uid}
            className={styles.avatarCircle}
            title={user.name || "Unknown User"}
            style={{ 
              backgroundColor: getUserPhotoURL(user.photoURL, user.hidePhoto) ? "transparent" : resolvePresenceColor(user.colorIndex, user.color, isDark), 
              borderColor: "white" 
            }}
          >
            {getUserPhotoURL(user.photoURL, user.hidePhoto)
              ? <img src={getUserPhotoURL(user.photoURL, user.hidePhoto)!} alt={user.name} className={styles.avatarImg} referrerPolicy="no-referrer" />
              : getInitials(user.name)
            }
          </div>
        ))}
      </div>

      {showDropdown && (
        <div className={dropdownClasses}>
          <div className={styles.dropdownTitle}>
            {t('common.onlineNow', { defaultValue: 'Online Now' })} ({onlineUsers.length})
          </div>
          <div className={styles.userListScroll}>
            {onlineUsers.map((user) => {
              const isMe = user.uid === currentSessionDocId;
              const restricted = isRestricted(user.location);
              const canNavigate =
                !isMe &&
                !!user.location &&
                (!restricted || userData?.isAdmin);

              return (
                <div
                  key={user.uid}
                  className={`${styles.userItem} ${canNavigate ? styles.clickableUser : ""}`}
                  onClick={(e) => handleUserClick(e, user.location, isMe)}
                >
                  <div
                    className={styles.userAvatarSmall}
                    style={{ backgroundColor: getUserPhotoURL(user.photoURL, user.hidePhoto) ? "transparent" : resolvePresenceColor(user.colorIndex, user.color, isDark) }}
                  >
                    {getUserPhotoURL(user.photoURL, user.hidePhoto)
                      ? <img src={getUserPhotoURL(user.photoURL, user.hidePhoto)!} alt={user.name} className={styles.avatarImg} referrerPolicy="no-referrer" />
                      : getInitials(user.name)
                    }
                  </div>
                  <span className={styles.userNameText}>
                    <NameTag
                      displayName={user.name || "Unknown User"}
                      isMe={isMe}
                      gender={isMe ? userData?.gender : null}
                    />
                  </span>
                  <div className={styles.pulse} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;

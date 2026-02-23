import { useState, useRef, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { useAppSelector } from "../../hooks/redux";
import { useOnlineUsers, currentSessionId } from "../../hooks/usePresence";
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
  const navigate = useNavigate();
  const onlineUsers = useOnlineUsers();
  const { firebaseUser } = useAppSelector((state) => state.auth);
  const currentSessionDocId = firebaseUser
    ? `${firebaseUser.uid}_${currentSessionId}`
    : null;
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleUserClick = (
    e: React.MouseEvent,
    userLocation?: string,
    isMe?: boolean,
  ) => {
    e.stopPropagation();
    console.log("[OnlineUsers] Clicked user:", { userLocation, isMe });
    if (!isMe && userLocation) {
      console.log("[OnlineUsers] Navigating to:", userLocation);
      navigate(userLocation);
      setShowDropdown(false);
    }
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

  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== "string") return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "?";
    return parts
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

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
      {showText && <span className={styles.onlineLabel}>Online</span>}
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
            style={{ backgroundColor: user.color, borderColor: "white" }}
          >
            {getInitials(user.name)}
          </div>
        ))}
      </div>

      {showDropdown && (
        <div className={dropdownClasses}>
          <div className={styles.dropdownTitle}>
            Online Now ({onlineUsers.length})
          </div>
          <div className={styles.userListScroll}>
            {onlineUsers.map((user) => {
              const isMe = user.uid === currentSessionDocId;
              const canNavigate = !isMe && !!user.location;

              return (
                <div
                  key={user.uid}
                  className={`${styles.userItem} ${canNavigate ? styles.clickableUser : ""}`}
                  onClick={(e) => handleUserClick(e, user.location, isMe)}
                >
                  <div
                    className={styles.userAvatarSmall}
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <span className={styles.userNameText}>
                    <NameTag
                      displayName={user.name || "Unknown User"}
                      isMe={isMe}
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

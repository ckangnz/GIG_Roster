import { Fragment } from "react";

import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";

import { AppUser, Position } from "../../model/model";

import styles from "./roster-table.module.css";

interface RosterHeaderProps {
  viewType: "all" | "roster" | "absence";
  rosterAllViewMode?: "user" | "position";
  allViewColumns: { id: string; name: string; isUser: boolean }[];
  userData: { email?: string | null; isAdmin?: boolean } | null;
  assignedOnClosestDate: string[];
  currentTeamData: { positions: Position[] } | null;
  teamName?: string;
  navigate: (path: string) => void;
  hasPastDates: boolean;
  onLoadPrevious: () => void;
  onResetDates: () => void;
  // Position specific
  currentPosition?: Position;
  handleUpdateCustomLabel: (index: number, value: string) => void;
  handleMoveCustomLabel: (index: number, direction: "left" | "right") => void;
  handleRemoveCustomLabel: (index: number) => void;
  handleAddCustomLabel: () => void;
  sortedUsers: AppUser[];
  genderDividerIndex: number;
  onToggleVisibility: (email: string) => void;
  // Peek
  peekPositionName: string | null;
  setPeekPositionName: (name: string | null) => void;
  peekOptions: Position[];
  // Absence specific
  allTeamUsers: AppUser[];
}

const RosterHeader = ({
  viewType,
  rosterAllViewMode,
  allViewColumns,
  userData,
  assignedOnClosestDate,
  currentTeamData,
  teamName,
  navigate,
  hasPastDates,
  onLoadPrevious,
  onResetDates,
  currentPosition,
  handleUpdateCustomLabel,
  handleMoveCustomLabel,
  handleRemoveCustomLabel,
  handleAddCustomLabel,
  sortedUsers,
  genderDividerIndex,
  onToggleVisibility,
  peekPositionName,
  setPeekPositionName,
  peekOptions,
  allTeamUsers,
}: RosterHeaderProps) => {
  const renderDateHeader = () => (
    <th className={`${styles.rosterTableHeaderCell} ${styles.stickyCol} sticky-header`}>
      <div className={styles.dateHeaderContent}>
        Date
        <div className={styles.dateHeaderActions}>
          <button className={styles.loadPrevBtn} onClick={onLoadPrevious} title="Load 5 previous dates">
            ↑
          </button>
          {hasPastDates && (
            <button
              className={`${styles.loadPrevBtn} ${styles.resetDatesBtn}`}
              onClick={onResetDates}
              title="Hide previous dates"
            >
              ↓
            </button>
          )}
        </div>
      </div>
    </th>
  );

  const renderPeekHeader = () => (
    <th className={`${styles.rosterTableHeaderCell} sticky-header ${styles.stickyRight} ${styles.peekHeader}`}>
      <select
        className={styles.peekSelector}
        value={peekPositionName || ""}
        onChange={(e) => setPeekPositionName(e.target.value || null)}
      >
        <option value="">Peek Position...</option>
        {peekOptions.map((opt) => (
          <option key={opt.name} value={opt.name}>
            {opt.emoji} {opt.name}
          </option>
        ))}
      </select>
    </th>
  );

  if (viewType === "all") {
    return (
      <thead>
        <tr>
          {renderDateHeader()}
          {rosterAllViewMode === "user"
            ? allViewColumns.map((col) => {
                const isMe = col.id === userData?.email;
                return (
                  <th
                    key={col.id}
                    className={`${styles.rosterTableHeaderCell} sticky-header ${
                      col.id && assignedOnClosestDate.includes(col.id) ? styles.highlightedHeader : ""
                    } ${isMe ? styles.isMe : ""}`}
                  >
                    {col.name}
                    {isMe && <span className={styles.meTag}>Me</span>}
                  </th>
                );
              })
            : (currentTeamData?.positions || []).map((pos) => (
                <th
                  key={pos.name}
                  className={`${styles.rosterTableHeaderCell} ${styles.clickableHeader} sticky-header`}
                  onClick={() => navigate(`/app/roster/${teamName}/${pos.name}`)}
                >
                  <div className={styles.allViewPositionHeader}>
                    <span>{pos.emoji}</span>
                    <span className={styles.allViewPositionName}>{pos.name}</span>
                  </div>
                </th>
              ))}
        </tr>
      </thead>
    );
  }

  if (viewType === "absence") {
    return (
      <thead>
        <tr>
          {renderDateHeader()}
          {allTeamUsers.map((user) => (
            <th
              key={user.email}
              className={`${styles.rosterTableHeaderCell} sticky-header ${
                user.email && assignedOnClosestDate.includes(user.email) ? styles.highlightedHeader : ""
              }`}
            >
              {user.name}
            </th>
          ))}
          <th className={`${styles.genderDividerCell} sticky-header`} />
          {renderPeekHeader()}
        </tr>
      </thead>
    );
  }

  // Default "roster" view
  return (
    <thead>
      <tr>
        {renderDateHeader()}
        {currentPosition?.isCustom
          ? (currentPosition.customLabels || []).map((label, index) => (
              <th key={`custom-${index}`} className={`${styles.rosterTableHeaderCell} sticky-header`}>
                <input
                  type="text"
                  className={styles.headerInput}
                  value={label}
                  placeholder="New Heading..."
                  readOnly={!userData?.isAdmin}
                  onChange={(e) => handleUpdateCustomLabel(index, e.target.value)}
                />
                {userData?.isAdmin && (
                  <div className={styles.headerActions}>
                    <button
                      className={styles.headerActionBtn}
                      onClick={() => handleMoveCustomLabel(index, "left")}
                      disabled={index === 0}
                      title="Move Left"
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <button
                      className={`${styles.headerActionBtn} ${styles.removeHeaderBtn}`}
                      onClick={() => handleRemoveCustomLabel(index)}
                      title="Remove Column"
                    >
                      <X size={12} />
                    </button>
                    <button
                      className={styles.headerActionBtn}
                      onClick={() => handleMoveCustomLabel(index, "right")}
                      disabled={index === (currentPosition.customLabels?.length || 0) - 1}
                      title="Move Right"
                    >
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </th>
            ))
          : sortedUsers.map((user, colIndex) => (
              <Fragment key={user.email}>
                {genderDividerIndex === colIndex && <th className={`${styles.genderDividerCell} sticky-header`} />}
                <th
                  className={`${styles.rosterTableHeaderCell} sticky-header ${styles.clickableHeader} ${
                    user.email && assignedOnClosestDate.includes(user.email) ? styles.highlightedHeader : ""
                  }`}
                  onClick={() => user.email && onToggleVisibility(user.email)}
                  title="Click to hide member"
                >
                  {user.name}
                  {currentPosition?.sortByGender && (
                    <span className={styles.genderLabel}>
                      ({user.gender === "Male" ? "M" : user.gender === "Female" ? "F" : "?"})
                    </span>
                  )}
                </th>
              </Fragment>
            ))}
        {currentPosition?.isCustom && userData?.isAdmin && (
          <th className={`${styles.rosterTableHeaderCell} sticky-header`}>
            <button className={styles.addColumnBtn} onClick={handleAddCustomLabel} title="Add Column">
              <Plus size={16} />
            </button>
          </th>
        )}
        <th className={`${styles.genderDividerCell} sticky-header`} />
        {renderPeekHeader()}
      </tr>
    </thead>
  );
};

export default RosterHeader;

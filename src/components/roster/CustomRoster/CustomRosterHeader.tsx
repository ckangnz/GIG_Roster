import { memo } from "react";

import { Plus, X, ArrowLeft, ArrowRight } from "lucide-react";

import { Position } from "../../../model/model";
import styles from "../roster-header.module.css";
import RosterHeader from "../RosterHeader";

import customStyles from "./custom-roster.module.css";

interface CustomRosterHeaderProps {
  currentPosition?: Position;
  userData: { isAdmin?: boolean } | null;
  handleUpdateCustomLabel: (index: number, value: string) => void;
  handleMoveCustomLabel: (index: number, direction: "left" | "right") => void;
  handleRemoveCustomLabel: (index: number) => void;
  handleAddCustomLabel: () => void;
  showPeek?: boolean;
}

export const CustomRosterHeader = memo(
  ({
    currentPosition,
    userData,
    handleUpdateCustomLabel,
    handleMoveCustomLabel,
    handleRemoveCustomLabel,
    handleAddCustomLabel,
    showPeek,
  }: CustomRosterHeaderProps) => {
    return (
      <RosterHeader showPeek={showPeek}>
        {(currentPosition?.customLabels || []).map((label, index) => (
          <th
            key={`custom-${index}`}
            className={styles.rosterTableHeaderCell}
          >
            <input
              type="text"
              className={customStyles.headerInput}
              value={label}
              placeholder="New Heading..."
              readOnly={!userData?.isAdmin}
              onChange={(e) => handleUpdateCustomLabel(index, e.target.value)}
            />
            {userData?.isAdmin && (
              <div className={customStyles.headerActions}>
                <button
                  className={customStyles.headerActionBtn}
                  onClick={() => handleMoveCustomLabel(index, "left")}
                  disabled={index === 0}
                  title="Move Left"
                >
                  <ArrowLeft size={12} />
                </button>
                <button
                  className={`${customStyles.headerActionBtn} ${customStyles.removeHeaderBtn}`}
                  onClick={() => handleRemoveCustomLabel(index)}
                  title="Remove Column"
                >
                  <X size={12} />
                </button>
                <button
                  className={customStyles.headerActionBtn}
                  onClick={() => handleMoveCustomLabel(index, "right")}
                  disabled={
                    index === (currentPosition?.customLabels?.length || 0) - 1
                  }
                  title="Move Right"
                >
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
          </th>
        ))}
        {userData?.isAdmin && (
          <th className={styles.rosterTableHeaderCell}>
            <button
              className={customStyles.addColumnBtn}
              onClick={handleAddCustomLabel}
              title="Add Column"
            >
              <Plus size={16} />
            </button>
          </th>
        )}
        <th className={styles.genderDividerCell} />
      </RosterHeader>
    );
  },
);

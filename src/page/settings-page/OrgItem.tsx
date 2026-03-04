import { Reorder, useDragControls } from "framer-motion";
import {
  MoreVertical,
  Globe,
  Lock,
  Crown,
  ShieldCheck,
  User,
  GripVertical,
} from "lucide-react";


import { OrgWithMembership } from "./OrgManagement";

import styles from "./org-item.module.css";

import type { TFunction } from "i18next";

interface OrgItemProps {
  org: OrgWithMembership;
  isOwner: boolean;
  isActive: boolean;
  onSwitch: (orgId: string) => void;
  onMoreClick: (e: React.MouseEvent, org: OrgWithMembership) => void;
  t: TFunction;
}

const OrgItem = ({
  org,
  isOwner,
  isActive,
  onSwitch,
  onMoreClick,
  t,
}: OrgItemProps) => {
  const dragControls = useDragControls();

  const getRoleIcon = () => {
    if (isOwner) return <Crown size={16} className={styles.roleIcon} />;
    if (org.isAdmin)
      return <ShieldCheck size={16} className={styles.roleIcon} />;
    return <User size={16} className={styles.roleIcon} />;
  };

  const getRoleLabel = () => {
    if (isOwner) return t("common.roles.owner");
    if (org.isAdmin) return t("common.roles.admin");
    return t("common.roles.member");
  };

  return (
    <Reorder.Item
      value={org}
      dragListener={false}
      dragControls={dragControls}
      layout
      initial={{ opacity: 1 }}
      whileDrag={{ 
        scale: 1.02,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
      className={`${styles.orgItem} ${isActive ? styles.active : ""} ${
        !org.isApproved ? styles.pending : ""
      }`}
    >
      <div
        className={styles.dragHandle}
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical size={20} />
      </div>

      <div
        className={`${styles.orgInfo} ${!org.isApproved ? styles.disabled : ""}`}
        onClick={() => org.isApproved && onSwitch(org.id)}
      >
        <div className={styles.orgHeader}>
          <h3 className={styles.orgName}>{org.name}</h3>
          {org.visibility === "private" ? (
            <Lock size={16} className={styles.privacyIcon} />
          ) : (
            <Globe size={16} className={styles.privacyIcon} />
          )}
        </div>

        <div className={styles.orgMeta}>
          <div className={styles.roleContainer}>
            {getRoleIcon()}
            <span className={styles.roleLabel}>{getRoleLabel()}</span>
          </div>
          {!org.isApproved && (
            <span className={styles.pendingBadge}>
              {t("settings.pendingApproval")}
            </span>
          )}
        </div>
      </div>

      <button
        className={styles.moreButton}
        onClick={(e) => onMoreClick(e, org)}
        aria-label={t("settings.moreOptions")}
      >
        <MoreVertical size={20} />
      </button>
    </Reorder.Item>
  );
};

export default OrgItem;

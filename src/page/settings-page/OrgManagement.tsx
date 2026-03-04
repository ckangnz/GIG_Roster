import { useEffect, useState } from "react";

import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { MoreVertical, Check, UserPlus, Globe, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import ManageOrgModal from "./ManageOrgModal";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Organisation, OrgMembership } from "../../model/model";
import { setActiveOrgId, selectUserData, leaveOrganisation, clearActiveOrgId, joinOrganisation } from "../../store/slices/authSlice";
import JoinOrCreateOrgModal from "../org-selection-page/JoinOrCreateOrgModal";

import styles from "./org-management.module.css";

interface OrgWithMembership extends Organisation {
  isApproved: boolean;
  isAdmin: boolean;
}

const OrgManagement = ({ 
  isOpen = true, 
  onClose = () => {}, 
  standalone = false 
}: { 
  isOpen?: boolean; 
  onClose?: () => void;
  standalone?: boolean;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userData = useAppSelector(selectUserData);
  const authState = useAppSelector((state) => state.auth);
  const firebaseUser = authState.firebaseUser;
  const activeOrgId = authState.activeOrgId;
  
  const [orgs, setOrgs] = useState<OrgWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<OrgWithMembership | null>(null);
  const [isManageModalOpen, setIsManageOrgModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!userData?.organisations) {
        setLoading(false);
        return;
      }

      try {
        // TODO: Cleanup - After organisations root Map is removed, remove the Object.keys fallback
        // Extract IDs whether it's a Map (transition) or Array (final)
        const orgIds = Array.isArray(userData.organisations)
          ? userData.organisations
          : Object.keys(userData.organisations);

        if (orgIds.length === 0) {
          setLoading(false);
          return;
        }

        const fetchedOrgs = await Promise.all(
          orgIds.map(async (orgId) => {
            const [orgDoc, memDoc] = await Promise.all([
              getDoc(doc(db, "organisations", orgId)),
              getDoc(doc(db, "organisations", orgId, "memberships", firebaseUser?.uid || ""))
            ]);

            if (orgDoc.exists() && memDoc.exists()) {
              const memData = memDoc.data() as OrgMembership;
              return {
                ...(orgDoc.data() as Organisation),
                id: orgDoc.id,
                isApproved: memData.isApproved,
                isAdmin: memData.isAdmin,
              } as OrgWithMembership;
            }
            return null;
          })
        );

        const sortedOrgs = fetchedOrgs
          .filter((o): o is OrgWithMembership => o !== null)
          .sort((a, b) => a.name.localeCompare(b.name));

        setOrgs(sortedOrgs);
      } catch (error) {
        console.error("Error fetching organisations:", error);
      } finally {
        setLoading(false);
      }
    };

    if ((isOpen || standalone) && userData && firebaseUser?.uid) {
      fetchOrgs();
    }
  }, [isOpen, standalone, userData, firebaseUser?.uid]);

  const handleSwitch = (orgId: string) => {
    if (activeOrgId === orgId) return;
    
    // Note: root map only has permissions, language is in sub-collection.
    // useAppListeners will fetch the membership doc and change language.

    dispatch(setActiveOrgId(orgId));
    if (!standalone) onClose();
    // Removed redirect - stay on current page
  };

  const handleJoinOrg = async (org: Organisation) => {
    if (!firebaseUser || !userData) return;
    try {
      await dispatch(joinOrganisation({
        uid: firebaseUser.uid,
        orgId: org.id,
        profileData: {
          name: userData.name,
          gender: userData.gender,
          preferredLanguage: userData.preferredLanguage
        }
      })).unwrap();
      dispatch(clearActiveOrgId());
      navigate("/guest");
    } catch (e) {
      console.error("Failed to join org:", e);
    }
  };

  const handleMoreClick = (e: React.MouseEvent, org: OrgWithMembership) => {
    e.stopPropagation();
    setSelectedOrg(org);
    setIsManageOrgModalOpen(true);
  };

  const handleLeaveOrg = async (org: OrgWithMembership) => {
    if (!firebaseUser) return;

    try {
      if (activeOrgId === org.id) {
        dispatch(setActiveOrgId(null));
      }

      await dispatch(
        leaveOrganisation({
          uid: firebaseUser.uid,
          orgId: org.id,
        }),
      ).unwrap();

      setOrgs((prev) => prev.filter((o) => o.id !== org.id));
    } catch (error) {
      console.error("Error leaving organisation:", error);
    }
  };

  const confirmDeleteOrg = async (org: OrgWithMembership) => {
    if (!firebaseUser) return;
    
    try {
      if (activeOrgId === org.id) {
        dispatch(setActiveOrgId(null));
      }

      await deleteDoc(doc(db, "organisations", org.id));
      await dispatch(leaveOrganisation({ 
        uid: firebaseUser.uid, 
        orgId: org.id 
      })).unwrap();
      
      setOrgs(prev => prev.filter(o => o.id !== org.id));
    } catch (error) {
      console.error("Error deleting organisation:", error);
    }
  };

  const onOrgUpdated = (updatedOrg: Organisation) => {
    setOrgs(prev => prev.map(o => o.id === updatedOrg.id ? { ...o, ...updatedOrg } : o));
  };

  const renderContent = () => (
    <div className={styles.orgManagementContent}>
      <div className={styles.orgList}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spinner />
          </div>
        ) : orgs.length === 0 ? (
          <p>{t("settings.noOrganisations")}</p>
        ) : (
          orgs.map((org) => {
            const isOwner = org.ownerId === firebaseUser?.uid;
            const isActive = activeOrgId === org.id;
            
            return (
              <div 
                key={org.id} 
                className={`${styles.orgItem} ${isActive ? styles.activeOrg : ""}`}
              >
                <div 
                  className={styles.orgInfo} 
                  onClick={() => !isActive && org.isApproved && handleSwitch(org.id)}
                  style={{ cursor: isActive ? 'default' : 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {org.visibility === 'private' ? (
                      <Lock size={16} color="var(--color-text-dim)" />
                    ) : (
                      <Globe size={16} color="var(--color-primary)" />
                    )}
                    <span className={styles.orgName}>{org.name}</span>
                  </div>
                  <div className={styles.orgMeta}>
                    <span className={styles.orgRole}>
                      {isOwner 
                        ? t("common.roles.owner") 
                        : org.isAdmin 
                          ? t("common.roles.admin") 
                          : t("common.roles.member")}
                    </span>
                    {!isOwner && (
                      <span className={`${styles.statusBadge} ${org.isApproved ? styles.statusApproved : styles.statusPending}`}>
                        {org.isApproved ? t("common.status.approved") : t("common.status.pending")}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={styles.actions}>
                  {isActive ? (
                    <div className={styles.activeLabel}>
                      <Check size={16} />
                      {t("common.status.active")}
                    </div>
                  ) : org.isApproved ? (
                    <Button variant="secondary" size="small" onClick={() => handleSwitch(org.id)}>
                      {t("common.switch")}
                    </Button>
                  ) : null}
                  
                  <button className={styles.moreBtn} onClick={(e) => handleMoreClick(e, org)}>
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.addOrgActions}>
        <Button variant="secondary" className={styles.addBtn} onClick={() => setIsJoinModalOpen(true)} style={{ width: '100%' }}>
          <UserPlus size={18} style={{ marginRight: 8 }} />
          {t("settings.joinNewOrg")}
        </Button>
      </div>

      <ManageOrgModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageOrgModalOpen(false)} 
        org={selectedOrg}
        onUpdate={onOrgUpdated}
        onLeave={handleLeaveOrg}
        onDelete={confirmDeleteOrg}
        currentUserId={firebaseUser?.uid}
      />

      <JoinOrCreateOrgModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoin={handleJoinOrg}
      />
    </div>
  );

  if (standalone) {
    return (
      <div className={styles.standaloneContainer}>
        <div className={styles.standaloneHeader}>
          <h2 className={styles.standaloneTitle}>{t("settings.myOrganisations")}</h2>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("settings.myOrganisations")}>
      {renderContent()}
    </Modal>
  );
};

export default OrgManagement;

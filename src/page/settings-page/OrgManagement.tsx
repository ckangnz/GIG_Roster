import { useEffect, useState } from "react";

import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { MoreVertical, Check, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import ManageOrgModal from "./ManageOrgModal";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { db } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Organisation, OrgMembership } from "../../model/model";
import { setActiveOrgId, selectUserData, leaveOrganisation, clearActiveOrgId, joinOrganisation } from "../../store/slices/authSlice";
import { showAlert } from "../../store/slices/uiSlice";
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

        setOrgs(fetchedOrgs.filter((o): o is OrgWithMembership => o !== null));
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
    navigate("/app/dashboard");
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

  const handleLeaveOrg = (orgId: string) => {
    const org = orgs.find(o => o.id === orgId);
    if (!org || !firebaseUser) return;
    
    dispatch(showAlert({
      title: t("settings.leaveOrgTitle", "Leave Organisation"),
      message: t("settings.leaveOrgConfirm", { name: org.name }),
      confirmText: t("common.leave", "Leave"),
      onConfirm: async () => {
        try {
          await dispatch(leaveOrganisation({ 
            uid: firebaseUser.uid, 
            orgId: org.id 
          })).unwrap();
          
          if (activeOrgId === org.id) {
            dispatch(setActiveOrgId(null));
          }
          
          setOrgs(prev => prev.filter(o => o.id !== org.id));
        } catch (error) {
          console.error("Error leaving organisation:", error);
        }
      }
    }));
  };

  const confirmDeleteOrg = async (orgId: string) => {
    if (!firebaseUser) return;
    
    try {
      await deleteDoc(doc(db, "organisations", orgId));
      await dispatch(leaveOrganisation({ 
        uid: firebaseUser.uid, 
        orgId: orgId 
      })).unwrap();
      
      if (activeOrgId === orgId) {
        dispatch(setActiveOrgId(null));
      }
      
      setOrgs(prev => prev.filter(o => o.id !== orgId));
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
          <p>{t("common.loading")}</p>
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
                  <span className={styles.orgName}>{org.name}</span>
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

import { useEffect, useState, useCallback } from "react";

import {
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { Reorder } from "framer-motion";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import ManageOrgModal from "./ManageOrgModal";
import OrgItem from "./OrgItem";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Organisation, OrgMembership } from "../../model/model";
import {
  setActiveOrgId,
  setMembership,
  selectUserData,
  leaveOrganisation,
  clearActiveOrgId,
  joinOrganisation,
} from "../../store/slices/authSlice";
import JoinOrCreateOrgModal from "../org-selection-page/JoinOrCreateOrgModal";

import styles from "./org-management.module.css";

export interface OrgWithMembership extends Organisation {
  isApproved: boolean;
  isAdmin: boolean;
}

const OrgManagement = ({
  isOpen = true,
  onClose = () => {},
  standalone = false,
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
  const [selectedOrg, setSelectedOrg] = useState<OrgWithMembership | null>(
    null,
  );
  const [isManageModalOpen, setIsManageOrgModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const orgIdsKey =
    (userData?.organisations as string[] | undefined)?.join(",") ?? "";

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!orgIdsKey || !firebaseUser?.uid) {
        setLoading(false);
        return;
      }

      const orgIds = orgIdsKey.split(",").filter(Boolean);

      if (orgIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const fetchedOrgs = await Promise.all(
          orgIds.map(async (orgId) => {
            const [orgDoc, memDoc] = await Promise.all([
              getDoc(doc(db, "organisations", orgId)),
              getDoc(
                doc(
                  db,
                  "organisations",
                  orgId,
                  "memberships",
                  firebaseUser.uid,
                ),
              ),
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
          }),
        );

        // Preserve array order from userData.organisations
        const sortedOrgs = fetchedOrgs.filter(
          (o): o is OrgWithMembership => o !== null,
        );

        setOrgs(sortedOrgs);
      } catch (error) {
        console.error("Error fetching organisations:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen || standalone) {
      fetchOrgs();
    }
  }, [isOpen, standalone, orgIdsKey, firebaseUser?.uid]);

  // Subscribe to membership docs in real-time so approval status stays live
  useEffect(() => {
    if (!firebaseUser?.uid || !orgIdsKey) return;
    const orgIds = orgIdsKey.split(",").filter(Boolean);
    if (orgIds.length === 0) return;

    const unsubs = orgIds.map((orgId) =>
      onSnapshot(
        doc(db, "organisations", orgId, "memberships", firebaseUser.uid),
        (snap) => {
          if (!snap.exists()) return;
          const memData = snap.data() as OrgMembership;
          setOrgs((prev) =>
            prev.map((o) =>
              o.id === orgId
                ? {
                    ...o,
                    isApproved: memData.isApproved,
                    isAdmin: memData.isAdmin,
                  }
                : o,
            ),
          );
        },
        (err) => console.error("Membership listener error:", err.message),
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, [firebaseUser?.uid, orgIdsKey]);

  const handleSwitch = async (orgId: string) => {
    if (activeOrgId === orgId) return;

    // Load membership first so isApproved is correct before MainLoader evaluates
    const memSnap = await getDoc(
      doc(db, "organisations", orgId, "memberships", firebaseUser?.uid || ""),
    );
    if (memSnap.exists()) {
      dispatch(setMembership(memSnap.data() as OrgMembership));
    }
    dispatch(setActiveOrgId(orgId));
    if (!standalone) onClose();
  };

  const handleJoinOrg = async (org: Organisation) => {
    if (!firebaseUser || !userData) return;
    try {
      await dispatch(
        joinOrganisation({
          uid: firebaseUser.uid,
          orgId: org.id,
          profileData: {
            name: userData.name,
            gender: userData.gender,
            preferredLanguage: userData.preferredLanguage,
          },
        }),
      ).unwrap();

      // If user already has an active approved org, stay on settings page.
      // userData.organisations update will trigger the fetch effect to re-run.
      if (!activeOrgId) {
        navigate("/select-org");
      }
      setIsJoinModalOpen(false);
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
      await dispatch(
        leaveOrganisation({
          uid: firebaseUser.uid,
          orgId: org.id,
        }),
      ).unwrap();

      setOrgs((prev) => prev.filter((o) => o.id !== org.id));

      if (activeOrgId === org.id) {
        dispatch(clearActiveOrgId());
        navigate("/select-org");
      }
    } catch (error) {
      console.error("Error leaving organisation:", error);
    }
  };

  const confirmDeleteOrg = async (org: OrgWithMembership) => {
    if (!firebaseUser) return;

    try {
      await deleteDoc(doc(db, "organisations", org.id));
      await dispatch(
        leaveOrganisation({
          uid: firebaseUser.uid,
          orgId: org.id,
        }),
      ).unwrap();

      setOrgs((prev) => prev.filter((o) => o.id !== org.id));

      if (activeOrgId === org.id) {
        dispatch(clearActiveOrgId());
        navigate("/select-org");
      }
    } catch (error) {
      console.error("Error deleting organisation:", error);
    }
  };

  const onOrgUpdated = (updatedOrg: Organisation) => {
    setOrgs((prev) =>
      prev.map((o) => (o.id === updatedOrg.id ? { ...o, ...updatedOrg } : o)),
    );
  };

  const handleReorder = useCallback(
    async (newOrgs: OrgWithMembership[]) => {
      setOrgs(newOrgs);
      if (!firebaseUser?.uid) return;
      try {
        await updateDoc(doc(db, "users", firebaseUser.uid), {
          organisations: newOrgs.map((o) => o.id),
        });
      } catch (e) {
        console.error("Failed to save org order:", e);
      }
    },
    [firebaseUser?.uid],
  );

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
          <Reorder.Group
            axis="y"
            values={orgs}
            onReorder={handleReorder}
            layout
            className={styles.reorderGroup}
          >
            {orgs.map((org) => {
              const isOwner = org.ownerId === firebaseUser?.uid;
              const isActive = activeOrgId === org.id;

              return (
                <OrgItem
                  key={org.id}
                  org={org}
                  isOwner={isOwner}
                  isActive={isActive}
                  onSwitch={handleSwitch}
                  onMoreClick={handleMoreClick}
                  t={t}
                />
              );
            })}
          </Reorder.Group>
        )}
      </div>

      <div className={styles.addOrgActions}>
        <Button
          variant="secondary"
          className={styles.addBtn}
          onClick={() => setIsJoinModalOpen(true)}
        >
          <UserPlus size={18} className={styles.addBtnIcon} />
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
          <h2 className={styles.standaloneTitle}>
            {t("settings.myOrganisations")}
          </h2>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.myOrganisations")}
    >
      {renderContent()}
    </Modal>
  );
};

export default OrgManagement;

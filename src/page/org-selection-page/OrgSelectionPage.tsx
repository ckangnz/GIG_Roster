import { useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";
import { Check, UserPlus, Building2, Globe, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, Navigate } from "react-router-dom";

import JoinOrCreateOrgModal from "./JoinOrCreateOrgModal";
import Button from "../../components/common/Button";
import { auth, db } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Organisation, OrgMembership } from "../../model/model";
import { setActiveOrgId, setMembership, clearActiveOrgId, joinOrganisation, selectUserData } from "../../store/slices/authSlice";
import LoadingPage from "../loading-page/LoadingPage";

import styles from "./org-selection-page.module.css";

interface OrgWithMembership extends Organisation {
  isApproved: boolean;
  isAdmin: boolean;
}

const OrgSelectionPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { firebaseUser, loading, activeOrgId } = useAppSelector((state) => state.auth);
  const userData = useAppSelector(selectUserData);
  
  const [orgs, setOrgs] = useState<OrgWithMembership[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!userData?.organisations) {
        setIsLoadingOrgs(false);
        return;
      }

      try {
        // TODO: Cleanup - After organisations root Map is removed, remove the Object.keys fallback
        // Extract IDs whether it's a Map (transition) or Array (final)
        const orgIds = Array.isArray(userData.organisations)
          ? userData.organisations
          : Object.keys(userData.organisations);

        if (orgIds.length === 0) {
          setIsLoadingOrgs(false);
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
        setIsLoadingOrgs(false);
      }
    };

    if (userData && firebaseUser?.uid) {
      fetchOrgs();
    }
  }, [userData, firebaseUser?.uid]);

  if (loading || isLoadingOrgs) return <LoadingPage />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!userData) return <LoadingPage />;

  // TODO: Cleanup - After organisations root Map is removed, simplify to Array.length
  const orgsCount = Array.isArray(userData.organisations)
    ? userData.organisations.length
    : Object.keys(userData.organisations || {}).length;
  if (orgsCount === 0) return <Navigate to="/guest" replace />;

  const handleSelectOrg = async (orgId: string, isApproved: boolean) => {
    if (!isApproved) return;
    // Load membership first so ProtectedRoute has isApproved before navigating
    const memRef = doc(db, "organisations", orgId, "memberships", firebaseUser?.uid || "");
    const memSnap = await getDoc(memRef);
    if (memSnap.exists()) {
      dispatch(setMembership(memSnap.data() as OrgMembership));
    }
    dispatch(setActiveOrgId(orgId));
    navigate("/app/dashboard");
  };

  const handleJoinOrg = async (org: Organisation) => {
    if (!firebaseUser) return;
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
      dispatch(clearActiveOrgId()); // Go to pending state
      navigate("/guest");
    } catch (e) {
      console.error("Failed to join org:", e);
    }
  };

  const handleLogout = () => auth.signOut();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Building2 size={48} color="var(--color-secondary)" className={styles.headerIcon} />
          <h1 className={styles.title}>{t("onboarding.selectOrgTitle", "Select Organisation")}</h1>
          <p className={styles.subtitle}>{t("onboarding.selectOrgDesc", "Choose an organisation to continue")}</p>
        </div>

        <div className={styles.orgList}>
          {orgs.map((org) => {
            const isOwner = org.ownerId === firebaseUser?.uid;
            const isActive = activeOrgId === org.id;
            return (
              <button
                key={org.id}
                className={`${styles.orgItem} ${!org.isApproved ? styles.disabled : ""} ${isActive ? styles.activeOrg : ""}`}
                onClick={() => handleSelectOrg(org.id, org.isApproved)}
                disabled={!org.isApproved}
              >
                <div className={styles.orgInfo}>
                  <div className={styles.orgItemRow}>
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
                {isActive && <Check size={20} color="var(--color-primary)" />}
              </button>
            );
          })}
        </div>

        <div className={styles.actionsContainer}>
          <Button 
            variant="secondary" 
            className={styles.actionBtn} 
            onClick={() => setIsJoinModalOpen(true)}
          >
            <UserPlus size={18} className={styles.btnIcon} />
            {t("onboarding.addOrg", "Add Organisation")}
          </Button>
        </div>

        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            {t("common.logout")}
          </button>
        </div>
      </div>

      <JoinOrCreateOrgModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)} 
        onJoin={handleJoinOrg}
      />
    </div>
  );
};

export default OrgSelectionPage;

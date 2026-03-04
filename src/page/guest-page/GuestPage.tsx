import { useState, useEffect, useRef } from "react";

import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";

import { auth } from "../../firebase";
import CreateOrgStep from "./components/CreateOrgStep";
import JoinOrgStep from "./components/JoinOrgStep";
import PathSelectionStep from "./components/PathSelectionStep";
import PendingApprovalStep from "./components/PendingApprovalStep";
import ProfileStep from "./components/ProfileStep";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Organisation, UserOrgMetadata } from "../../model/model";
import { joinOrganisation, leaveOrganisation, selectUserData, setActiveOrgId, createOrganisation } from "../../store/slices/authSlice";
import LoadingPage from "../loading-page/LoadingPage";

import styles from "./guest-page.module.css";
import wizardStyles from "./onboarding-wizard.module.css";

const GuestPage = () => {
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { firebaseUser, loading, activeOrgId } = useAppSelector(
    (state) => state.auth,
  );
  const userData = useAppSelector(selectUserData);
  const [searchParams] = useSearchParams();

  const inviteOrgId = searchParams.get("join") || sessionStorage.getItem("pendingInviteOrgId");

  // If invited and user already has a profile, skip to step 2 (auto-join)
  const hasProfile = !!(userData?.name);
  const [step, setStep] = useState(inviteOrgId && hasProfile ? 2 : 1);
  const [profile, setProfile] = useState({
    name: userData?.name || "",
    gender: userData?.gender || "",
    preferredLanguage: userData?.preferredLanguage || i18n.language || "en-NZ",
  });
  
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingAction, setIsCreatingAction] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const autoJoinAttempted = useRef(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Auto-join via invite link after profile step
  useEffect(() => {
    if (!inviteOrgId || !firebaseUser || !userData || autoJoinAttempted.current) return;
    if (step < 2) return; // Wait until profile is done

    autoJoinAttempted.current = true;
    const doAutoJoin = async () => {
      try {
        await dispatch(joinOrganisation({
          uid: firebaseUser.uid,
          orgId: inviteOrgId,
          profileData: profileRef.current,
        })).unwrap();
        sessionStorage.removeItem("pendingInviteOrgId");
        dispatch(setActiveOrgId(inviteOrgId));
      } catch (e) {
        console.error("Auto-join failed:", e);
        autoJoinAttempted.current = false;
      }
    };
    doAutoJoin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, inviteOrgId, firebaseUser, userData, dispatch]);

  if (loading) return <LoadingPage />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!userData) return <LoadingPage />;
  if (userData.isApproved) return <Navigate to="/app" replace />;

  const orgIds = userData.organisations as Record<string, UserOrgMetadata> | string[];
  const hasOrgs = Array.isArray(orgIds) ? orgIds.length > 0 : Object.keys(orgIds || {}).length > 0;

  // If they have orgs but none is active, they should be in selection, not here
  // Unless we have an invite pending — let the invite flow handle it
  if (hasOrgs && !activeOrgId && !inviteOrgId) {
    return <Navigate to="/select-org" replace />;
  }

  const handleJoin = async (org: Organisation) => {
    if (!firebaseUser) return;
    try {
      const result = await dispatch(joinOrganisation({
        uid: firebaseUser.uid,
        orgId: org.id,
        profileData: profile
      })).unwrap();
      sessionStorage.removeItem("pendingInviteOrgId");
      dispatch(setActiveOrgId(org.id));
      if (result.membership.isApproved) {
        // ProtectedRoute/MainLoader will handle the redirect to dashboard
      }
    } catch (e) {
      console.error("Failed to join org:", e);
    }
  };

  const handleCreate = async (data: { name: string; visibility: "public" | "private"; plan: "free" | "pro" | "enterprise"; requireApproval: boolean }) => {
    if (!firebaseUser) return;
    setIsCreatingAction(true);
    try {
      await dispatch(createOrganisation({
        uid: firebaseUser.uid,
        name: data.name,
        visibility: data.visibility,
        plan: data.plan,
        requireApproval: data.requireApproval,
        profileData: profile
      })).unwrap();
      // createOrganisation fulfilled already sets activeOrgId and membership
    } catch (e) {
      console.error("Failed to create org:", e);
    } finally {
      setIsCreatingAction(false);
    }
  };

  const handleWithdraw = async () => {
    if (!firebaseUser || !activeOrgId) return;
    try {
      await dispatch(leaveOrganisation({ uid: firebaseUser.uid, orgId: activeOrgId })).unwrap();
      dispatch(setActiveOrgId(null));
      setSelectedOrg(null);
      setStep(2);
      setIsJoining(false);
      setIsCreating(false);
    } catch (e) {
      console.error("Failed to withdraw:", e);
    }
  };

  const handleLogout = () => auth.signOut();

  // If user already has an org but not approved, show pending screen
  if (activeOrgId) {
    return (
      <div className={styles.guestContainer}>
        <PendingApprovalStep 
          onWithdraw={handleWithdraw} 
          onLogout={handleLogout} 
        />
      </div>
    );
  }

  return (
    <div className={styles.guestContainer}>
      <div className={wizardStyles.wizardContainer}>
        {/* Top-left Back Button (conditional) */}
        {((step === 2 && !isJoining && !isCreating) || (step === 2 && (isJoining || isCreating))) && (
          <button 
            className={wizardStyles.backHeaderButton} 
            onClick={() => {
              if (selectedOrg) {
                setSelectedOrg(null);
              } else if (isJoining) {
                setIsJoining(false);
              } else if (isCreating) {
                setIsCreating(false);
              } else {
                setStep(1);
              }
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {step === 1 && (
          <ProfileStep 
            profile={profile} 
            onProfileChange={(updates) => setProfile(prev => ({ ...prev, ...updates }))}
            onContinue={() => setStep(2)}
          />
        )}

        {step !== 1 && (
          <div className={wizardStyles.wizardBody}>
            {step === 2 && !isJoining && !isCreating && !inviteOrgId && (
              <PathSelectionStep 
                onJoinClick={() => setIsJoining(true)} 
                onCreateClick={() => setIsCreating(true)}
              />
            )}

            {step === 2 && inviteOrgId && (
              <LoadingPage />
            )}

            {step === 2 && isJoining && (
              <JoinOrgStep 
                onJoin={handleJoin} 
                selectedOrg={selectedOrg} 
                onSelectOrg={setSelectedOrg} 
              />
            )}

            {step === 2 && isCreating && (
              <CreateOrgStep 
                onCreate={handleCreate}
                onBack={() => setIsCreating(false)}
                isCreating={isCreatingAction}
              />
            )}

            <div className={styles.logoutSection}>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={styles.logoutSection}>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestPage;

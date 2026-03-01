import { useState, useEffect } from "react";

import { Search, PlusCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { Navigate } from "react-router-dom";

import Button from "../../components/common/Button";
import { InputField } from "../../components/common/InputField";
import Pill, { PillGroup } from "../../components/common/Pill";
import { auth } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Organisation } from "../../model/model";
import { searchOrganisations, joinOrganisation } from "../../store/slices/authSlice";
import LoadingPage from "../loading-page/LoadingPage";

import styles from "./guest-page.module.css";
import wizardStyles from "./onboarding-wizard.module.css";

const GuestPage = () => {
  const dispatch = useAppDispatch();
  const { userData, firebaseUser, loading } = useAppSelector(
    (state) => state.auth,
  );

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: userData?.name || "",
    gender: userData?.gender || "",
  });
  
  const [isJoining, setIsJoining] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [searchResults, setSearchResults] = useState<Organisation[]>([]);

  useEffect(() => {
    if (searchTerm.length >= 3 && !selectedOrg) {
      const delayDebounceFn = setTimeout(() => {
        dispatch(searchOrganisations(searchTerm))
          .unwrap()
          .then((results) => {
            setSearchResults(results);
          });
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else if (searchResults.length > 0) {
      // Defer to avoid cascading render warning
      const timer = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, dispatch, selectedOrg, searchResults.length]);

  if (loading) return <LoadingPage />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!userData) return <LoadingPage />;
  if (userData.isApproved) return <Navigate to="/app" replace />;

  const handleJoin = async () => {
    if (!selectedOrg || !firebaseUser) return;
    try {
      await dispatch(joinOrganisation({
        uid: firebaseUser.uid,
        orgId: selectedOrg.id,
        profileData: profile
      })).unwrap();
    } catch (e) {
      console.error("Failed to join org:", e);
    }
  };

  const handleWithdraw = async () => {
    if (!firebaseUser) return;
    try {
      // Set orgId to null to return to discovery
      await dispatch(joinOrganisation({
        uid: firebaseUser.uid,
        orgId: null as unknown as string,
        profileData: profile
      })).unwrap();
      setSelectedOrg(null);
      setSearchTerm("");
      setStep(2);
      setIsJoining(false);
    } catch (e) {
      console.error("Failed to withdraw:", e);
    }
  };

  // If user already has an org but not approved, show pending screen
  if (userData.orgId) {
    return (
      <div className={styles.guestContainer}>
        <header className={styles.guestHeader}>
        </header>

        <div className={wizardStyles.wizardContainer}>
          <div className={wizardStyles.stepHeader}>
            <div className={styles.lockedBadge}>
              <span className={styles.lockedPulse} />
              Application Submitted
            </div>
            <h3 className={wizardStyles.stepTitle}>Pending Approval</h3>
            <p className={wizardStyles.stepDescription}>
              Your request to join has been sent to the organisation administrator. 
              You'll get access once they approve your account.
            </p>
          </div>

          <div className={wizardStyles.wizardActions} style={{ marginTop: '2rem' }}>
            <Button variant="secondary" onClick={handleWithdraw} style={{ width: '100%' }}>
              Withdraw & Choose Different Org
            </Button>
          </div>
          
          <div className={styles.actionContainer} style={{ marginTop: '1rem' }}>
            <Button variant="delete" onClick={() => auth.signOut()} style={{ width: '100%' }}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.guestContainer}>
      <header className={styles.guestHeader}>
      </header>

      <div className={wizardStyles.wizardContainer}>
        {/* Top-left Back Button (conditional) */}
        {((step === 2 && !isJoining) || (step === 2 && isJoining)) && (
          <button 
            className={wizardStyles.backHeaderButton} 
            onClick={() => {
              if (selectedOrg) {
                setSelectedOrg(null);
              } else if (isJoining) {
                setIsJoining(false);
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
          <>
            <div className={wizardStyles.stepHeader}>
              <h3 className={wizardStyles.stepTitle}>Setup Your Profile</h3>
              <p className={wizardStyles.stepDescription}>Tell us a bit about yourself to get started.</p>
            </div>

            <div className={wizardStyles.form}>
              <InputField
                label="Full Name"
                placeholder="Enter your name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />

              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>Gender</label>
                <PillGroup>
                  {[
                    { label: "Male", value: "Male", colour: "var(--color-male)" },
                    { label: "Female", value: "Female", colour: "var(--color-female)" },
                    { label: "Prefer not to say", value: "Undefined", colour: "var(--color-text-dim)" },
                  ].map((g) => (
                    <Pill
                      key={g.value}
                      colour={g.colour}
                      onClick={() => setProfile({ ...profile, gender: g.value })}
                      isActive={profile.gender === g.value}
                    >
                      {g.label}
                    </Pill>
                  ))}
                </PillGroup>
              </div>

              <div className={wizardStyles.wizardActions}>
                <Button 
                  className={wizardStyles.fullWidthBtn}
                  disabled={!profile.name.trim() || !profile.gender}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 2 && !isJoining && (
          <>
            <div className={wizardStyles.stepHeader}>
              <h3 className={wizardStyles.stepTitle}>Choose Your Path</h3>
              <p className={wizardStyles.stepDescription}>Join an existing organisation or create a new one.</p>
            </div>

            <div className={wizardStyles.choiceContainer}>
              <button className={wizardStyles.choiceCard} onClick={() => setIsJoining(true)}>
                <div className={wizardStyles.choiceTitle}>
                  <Search size={20} /> Join Organisation
                </div>
                <p className={wizardStyles.choiceSubtitle}>Search for your church or group to request access.</p>
              </button>

              <button className={`${wizardStyles.choiceCard} ${wizardStyles.disabled}`} disabled>
                <div className={wizardStyles.choiceTitle}>
                  <PlusCircle size={20} /> Create Organisation
                  <span className={wizardStyles.disabledBadge}>COMING SOON</span>
                </div>
                <p className={wizardStyles.choiceSubtitle}>Start a new GIG Roster instance for your own team.</p>
              </button>
            </div>
          </>
        )}

        {step === 2 && isJoining && (
          <>
            <div className={wizardStyles.stepHeader}>
              <h3 className={wizardStyles.stepTitle}>Find Organisation</h3>
              <p className={wizardStyles.stepDescription}>
                {selectedOrg 
                  ? "Confirm your selection to request access." 
                  : "Type at least 3 characters to search."}
              </p>
            </div>

            <div className={wizardStyles.searchContainer}>
              <InputField
                placeholder="Search by name..."
                value={selectedOrg ? selectedOrg.name : searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedOrg(null);
                }}
                autoFocus
              />

              {searchTerm.length >= 3 && !selectedOrg && (
                <div className={wizardStyles.resultsList}>
                  {searchResults.length > 0 ? (
                    searchResults.map((org) => (
                      <button 
                        key={org.id} 
                        className={wizardStyles.resultItem}
                        onClick={() => setSelectedOrg(org)}
                      >
                        <span className={wizardStyles.orgName}>{org.name}</span>
                        <span className={wizardStyles.orgMeta}>Click to select this organisation</span>
                      </button>
                    ))
                  ) : (
                    <div className={wizardStyles.noResults}>No organisations found</div>
                  )}
                </div>
              )}
            </div>

            {selectedOrg && (
              <div className={wizardStyles.wizardActions}>
                <Button 
                  className={wizardStyles.fullWidthBtn}
                  onClick={handleJoin}
                >
                  Request Access <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </Button>
              </div>
            )}
          </>
        )}

        <div className={styles.actionContainer} style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color-secondary)', paddingTop: '1rem' }}>
          <Button variant="delete" onClick={() => auth.signOut()} style={{ width: '100%' }}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuestPage;

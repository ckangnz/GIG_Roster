import { useState, useEffect } from "react";

import { Search, PlusCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
              {t('onboarding.submitted')}
            </div>
            <h3 className={wizardStyles.stepTitle}>{t('onboarding.pendingTitle')}</h3>
            <p className={wizardStyles.stepDescription}>
              {t('onboarding.pendingDesc')}
            </p>
          </div>

          <div className={wizardStyles.wizardActions} style={{ marginTop: '2rem' }}>
            <Button variant="secondary" onClick={handleWithdraw} style={{ width: '100%' }}>
              {t('onboarding.withdraw')}
            </Button>
          </div>
          
          <div className={styles.actionContainer} style={{ marginTop: '1rem' }}>
            <Button variant="delete" onClick={() => auth.signOut()} style={{ width: '100%' }}>
              {t('common.logout')}
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
              <h3 className={wizardStyles.stepTitle}>{t('onboarding.profileTitle')}</h3>
              <p className={wizardStyles.stepDescription}>{t('onboarding.profileDesc')}</p>
            </div>

            <div className={wizardStyles.form}>
              <InputField
                label={t('settings.name')}
                placeholder={t('settings.name')}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />

              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>{t('settings.gender')}</label>
                <PillGroup>
                  {[
                    { label: t('settings.male'), value: "Male", colour: "var(--color-male)" },
                    { label: t('settings.female'), value: "Female", colour: "var(--color-female)" },
                    { label: t('settings.undefined'), value: "Undefined", colour: "var(--color-text-dim)" },
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
                  {t('onboarding.continue')} <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 2 && !isJoining && (
          <>
            <div className={wizardStyles.stepHeader}>
              <h3 className={wizardStyles.stepTitle}>{t('onboarding.pathTitle')}</h3>
              <p className={wizardStyles.stepDescription}>{t('onboarding.pathDesc')}</p>
            </div>

            <div className={wizardStyles.choiceContainer}>
              <button className={wizardStyles.choiceCard} onClick={() => setIsJoining(true)}>
                <div className={wizardStyles.choiceTitle}>
                  <Search size={20} /> {t('onboarding.joinTitle')}
                </div>
                <p className={wizardStyles.choiceSubtitle}>{t('onboarding.joinDesc')}</p>
              </button>

              <button className={`${wizardStyles.choiceCard} ${wizardStyles.disabled}`} disabled>
                <div className={wizardStyles.choiceTitle}>
                  <PlusCircle size={20} /> {t('onboarding.createTitle')}
                  <span className={wizardStyles.disabledBadge}>{t('onboarding.comingSoon')}</span>
                </div>
                <p className={wizardStyles.choiceSubtitle}>{t('onboarding.createDesc')}</p>
              </button>
            </div>
          </>
        )}

        {step === 2 && isJoining && (
          <>
            <div className={wizardStyles.stepHeader}>
              <h3 className={wizardStyles.stepTitle}>{t('onboarding.findTitle')}</h3>
              <p className={wizardStyles.stepDescription}>
                {selectedOrg 
                  ? t('onboarding.confirmDesc')
                  : t('onboarding.findDesc')}
              </p>
            </div>

            <div className={wizardStyles.searchContainer}>
              <InputField
                placeholder={t('onboarding.searchPlaceholder')}
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
                        <span className={wizardStyles.orgMeta}>{t('onboarding.clickToJoin')}</span>
                      </button>
                    ))
                  ) : (
                    <div className={wizardStyles.noResults}>{t('onboarding.noOrgs')}</div>
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
                  {t('onboarding.requestAccess')} <ArrowRight size={18} style={{ marginLeft: 8 }} />
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

import { useState } from "react";

import { Search, Plus, CreditCard, Globe, Lock, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../components/common/Button";
import { InputField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import Toggle from "../../components/common/Toggle";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Organisation } from "../../model/model";
import { createOrganisation, selectUserData } from "../../store/slices/authSlice";
import formStyles from "../../styles/form.module.css";
import JoinOrgStep from "../guest-page/components/JoinOrgStep";

import styles from "./org-selection-page.module.css";

interface JoinOrCreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (org: Organisation) => void;
}

const JoinOrCreateOrgModal = ({ isOpen, onClose, onJoin }: JoinOrCreateOrgModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { firebaseUser } = useAppSelector((state) => state.auth);
  const userData = useAppSelector(selectUserData);

  const [mode, setMode] = useState<"choice" | "join" | "create">("choice");
  const [createStep, setCreateStep] = useState(1);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Creation State
  const [orgForm, setOrgForm] = useState({
    name: "",
    visibility: "public" as "public" | "private",
    plan: "free" as "free" | "pro" | "enterprise",
    requireApproval: true,
  });

  const handleClose = () => {
    setMode("choice");
    setCreateStep(1);
    setSelectedOrg(null);
    setOrgForm({
      name: "",
      visibility: "public",
      plan: "free",
      requireApproval: true,
    });
    onClose();
  };

  const handleCreate = async () => {
    if (!firebaseUser || !userData) return;
    setIsCreating(true);
    try {
      await dispatch(createOrganisation({
        uid: firebaseUser.uid,
        name: orgForm.name,
        visibility: orgForm.visibility,
        plan: orgForm.plan,
        requireApproval: orgForm.requireApproval,
        profileData: {
          name: userData.name,
          gender: userData.gender,
          preferredLanguage: userData.preferredLanguage
        }
      })).unwrap();
      handleClose();
    } catch (e) {
      console.error("Failed to create organisation:", e);
    } finally {
      setIsCreating(false);
    }
  };

  const tiers = [
    { 
      id: 'free' as const, 
      key: 'tierSprout',
      name: t('onboarding.tierSprout'), 
      price: '$0', 
      desc: t('onboarding.tierSproutDesc'),
      disabled: false 
    },
    { 
      id: 'pro' as const, 
      key: 'tierBloom',
      name: t('onboarding.tierBloom'), 
      price: '$19/mo', 
      desc: t('onboarding.tierBloomDesc'),
      disabled: true 
    },
    { 
      id: 'enterprise' as const, 
      key: 'tierGrove',
      name: t('onboarding.tierGrove'), 
      price: '$49/mo', 
      desc: t('onboarding.tierGroveDesc'),
      disabled: true 
    }
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={
        mode === "choice" ? t("onboarding.addOrg") :
        mode === "join" ? t("onboarding.joinTitle") :
        t("onboarding.createTitle")
      }
    >
      {mode === "choice" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          <button 
            className={styles.choiceCard} 
            onClick={() => setMode("join")}
          >
            <div className={styles.choiceIcon}>
              <Search size={24} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t("onboarding.joinTitle")}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{t("onboarding.joinDesc")}</div>
            </div>
          </button>

          <button 
            className={styles.choiceCard} 
            onClick={() => setMode("create")}
          >
            <div className={styles.choiceIcon} style={{ background: 'var(--background-primary-subtle)', color: 'var(--color-primary)' }}>
              <Plus size={24} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t("onboarding.createTitle")}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{t("onboarding.createDesc")}</div>
            </div>
          </button>
        </div>
      )}

      {mode === "join" && (
        <div style={{ paddingTop: '12px' }}>
          <JoinOrgStep 
            onJoin={(org) => {
              onJoin(org);
              handleClose();
            }}
            selectedOrg={selectedOrg}
            onSelectOrg={setSelectedOrg}
          />
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              className={styles.backLink} 
              onClick={() => {
                setMode("choice");
                setSelectedOrg(null);
              }}
            >
              {t("common.back")}
            </button>
          </div>
        </div>
      )}

      {mode === "create" && (
        <div style={{ paddingTop: '12px' }}>
          {createStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <InputField 
                label={t("settings.orgName")}
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                placeholder={t("settings.orgNamePlaceholder")}
                autoFocus
              />

              <div className={formStyles.formGroup}>
                <label>{t("onboarding.orgType")}</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    className={`${styles.typeCard} ${orgForm.visibility === 'public' ? styles.activeType : ''}`}
                    onClick={() => setOrgForm({ ...orgForm, visibility: 'public' })}
                  >
                    <Globe size={20} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700 }}>{t("onboarding.public")}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t("onboarding.publicDesc")}</div>
                    </div>
                  </button>
                  <button 
                    className={`${styles.typeCard} ${orgForm.visibility === 'private' ? styles.activeType : ''}`}
                    onClick={() => setOrgForm({ ...orgForm, visibility: 'private' })}
                  >
                    <Lock size={20} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700 }}>{t("onboarding.private")}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t("onboarding.privateDesc")}</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className={formStyles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label style={{ margin: 0 }}>{t("onboarding.requireApproval")}</label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: 0 }}>{t("onboarding.requireApprovalDesc")}</p>
                  </div>
                  <Toggle 
                    isOn={orgForm.requireApproval}
                    onToggle={(isOn) => setOrgForm({ ...orgForm, requireApproval: isOn })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                <Button variant="secondary" style={{ flex: 1 }} onClick={() => setMode("choice")}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  style={{ flex: 2 }} 
                  disabled={orgForm.name.trim().length < 3}
                  onClick={() => setCreateStep(2)}
                >
                  {t("common.continue")} <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </Button>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0' }}>{t("onboarding.selectTier")}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 600, margin: 0 }}>
                  ✨ {t("onboarding.freeTrialNote")}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tiers.map(tier => (
                  <button 
                    key={tier.id} 
                    className={`${styles.tierSelectCard} ${orgForm.plan === tier.id ? styles.activeTier : ''} ${tier.disabled ? styles.tierDisabled : ''}`}
                    onClick={() => !tier.disabled && setOrgForm({ ...orgForm, plan: tier.id })}
                    disabled={tier.disabled}
                  >
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700 }}>{tier.name}</span>
                        {tier.disabled && <span className={styles.comingSoonBadge}>{t("common.comingSoon")}</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{tier.desc}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: tier.disabled ? 'inherit' : 'var(--color-accent)' }}>{tier.price}</div>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCreateStep(1)}>
                  {t("common.back")}
                </Button>
                <Button style={{ flex: 2 }} onClick={() => setCreateStep(3)}>
                  {t("common.continue")} <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </Button>
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className={styles.summarySection}>
                <h4 className={styles.summaryTitle}>{t("common.confirm")}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{t("settings.orgName")}</span>
                    <span className={styles.summaryValue}>{orgForm.name}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{t("onboarding.orgType")}</span>
                    <span className={styles.summaryValue}>{t(`onboarding.${orgForm.visibility}`)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{t("settings.subscription")}</span>
                    <span className={styles.summaryValue}>{tiers.find(t => t.id === orgForm.plan)?.name}</span>
                  </div>
                </div>
              </div>

              <div style={{ opacity: 0.6 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
                  <CreditCard size={18} /> {t("onboarding.paymentInfo")}
                </h4>
                <InputField label="Card Number" placeholder="**** **** **** ****" disabled />
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontStyle: 'italic', marginTop: '4px' }}>
                  * Payment info disabled for preview
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCreateStep(2)} disabled={isCreating}>
                  {t("common.back")}
                </Button>
                <Button style={{ flex: 2 }} onClick={handleCreate} isLoading={isCreating}>
                  {t("onboarding.createOrganisation")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default JoinOrCreateOrgModal;

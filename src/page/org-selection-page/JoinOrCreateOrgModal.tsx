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
      price: '$9/mo', 
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
        <div className={styles.choiceList}>
          <button className={styles.choiceCard} onClick={() => setMode("join")}>
            <div className={styles.choiceIcon}>
              <Search size={24} />
            </div>
            <div className={styles.choiceText}>
              <span className={styles.choiceTitle}>{t("onboarding.joinTitle")}</span>
              <span className={styles.choiceDesc}>{t("onboarding.joinDesc")}</span>
            </div>
          </button>

          <button className={styles.choiceCard} onClick={() => setMode("create")}>
            <div className={`${styles.choiceIcon} ${styles.choiceIconAlt}`}>
              <Plus size={24} />
            </div>
            <div className={styles.choiceText}>
              <span className={styles.choiceTitle}>{t("onboarding.createTitle")}</span>
              <span className={styles.choiceDesc}>{t("onboarding.createDesc")}</span>
            </div>
          </button>
        </div>
      )}

      {mode === "join" && (
        <div className={styles.joinWrapper}>
          <JoinOrgStep
            onJoin={(org) => { onJoin(org); handleClose(); }}
            selectedOrg={selectedOrg}
            onSelectOrg={setSelectedOrg}
          />
          <div className={styles.joinBack}>
            <button className={styles.backLink} onClick={() => { setMode("choice"); setSelectedOrg(null); }}>
              {t("common.back")}
            </button>
          </div>
        </div>
      )}

      {mode === "create" && (
        <div className={styles.createWrapper}>
          {createStep === 1 && (
            <div className={styles.createStep}>
              <InputField
                label={t("settings.orgName")}
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                placeholder={t("settings.orgNamePlaceholder")}
                autoFocus
              />

              <div className={formStyles.formGroup}>
                <label>{t("onboarding.orgType")}</label>
                <div className={styles.typeCardRow}>
                  <button
                    className={`${styles.typeCard} ${orgForm.visibility === 'public' ? styles.activeType : ''}`}
                    onClick={() => setOrgForm({ ...orgForm, visibility: 'public' })}
                  >
                    <Globe size={20} />
                    <div className={styles.typeCardText}>
                      <span className={styles.typeCardTitle}>{t("onboarding.public")}</span>
                      <span className={styles.typeCardDesc}>{t("onboarding.publicDesc")}</span>
                    </div>
                  </button>
                  <button
                    className={`${styles.typeCard} ${orgForm.visibility === 'private' ? styles.activeType : ''}`}
                    onClick={() => setOrgForm({ ...orgForm, visibility: 'private' })}
                  >
                    <Lock size={20} />
                    <div className={styles.typeCardText}>
                      <span className={styles.typeCardTitle}>{t("onboarding.private")}</span>
                      <span className={styles.typeCardDesc}>{t("onboarding.privateDesc")}</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className={formStyles.formGroup}>
                <div className={styles.requireApprovalRow}>
                  <div>
                    <label className={styles.requireApprovalLabel}>{t("onboarding.requireApproval")}</label>
                    <p className={styles.requireApprovalDesc}>{t("onboarding.requireApprovalDesc")}</p>
                  </div>
                  <Toggle isOn={orgForm.requireApproval} onToggle={(isOn) => setOrgForm({ ...orgForm, requireApproval: isOn })} />
                </div>
              </div>

              <div className={styles.stepActions}>
                <Button variant="secondary" className={styles.btnFlex1} onClick={() => setMode("choice")}>
                  {t("common.cancel")}
                </Button>
                <Button className={styles.btnFlex2} disabled={orgForm.name.trim().length < 3} onClick={() => setCreateStep(2)}>
                  {t("common.continue")} <ArrowRight size={18} className={styles.btnIcon} />
                </Button>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className={styles.createStep}>
              <div>
                <h4 className={styles.tierHeader}>{t("onboarding.selectTier")}</h4>
                <p className={styles.tierTrialNote}>✨ {t("onboarding.freeTrialNote")}</p>
              </div>

              <div className={styles.tierList}>
                {tiers.map(tier => (
                  <button
                    key={tier.id}
                    className={`${styles.tierSelectCard} ${orgForm.plan === tier.id ? styles.activeTier : ''} ${tier.disabled ? styles.tierDisabled : ''}`}
                    onClick={() => !tier.disabled && setOrgForm({ ...orgForm, plan: tier.id })}
                    disabled={tier.disabled}
                  >
                    <div className={styles.tierCardContent}>
                      <div className={styles.tierCardTitleRow}>
                        <span className={styles.tierCardTitle}>{tier.name}</span>
                        {tier.disabled && <span className={styles.comingSoonBadge}>{t("common.comingSoon")}</span>}
                      </div>
                      <div className={styles.tierCardDesc}>{tier.desc}</div>
                    </div>
                    <div className={tier.disabled ? styles.tierCardPriceDisabled : styles.tierCardPrice}>{tier.price}</div>
                  </button>
                ))}
              </div>

              <div className={styles.stepActions}>
                <Button variant="secondary" className={styles.btnFlex1} onClick={() => setCreateStep(1)}>
                  {t("common.back")}
                </Button>
                <Button className={styles.btnFlex2} onClick={() => setCreateStep(3)}>
                  {t("common.continue")} <ArrowRight size={18} className={styles.btnIcon} />
                </Button>
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className={styles.createStepWide}>
              <div className={styles.summarySection}>
                <h4 className={styles.summaryTitle}>{t("common.confirm")}</h4>
                <div className={styles.tierList}>
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

              <div className={styles.paymentSection}>
                <h4 className={styles.paymentHeader}>
                  <CreditCard size={18} /> {t("onboarding.paymentInfo")}
                </h4>
                <InputField label="Card Number" placeholder="**** **** **** ****" disabled />
                <p className={styles.paymentNote}>* Payment info disabled for preview</p>
              </div>

              <div className={styles.stepActions}>
                <Button variant="secondary" className={styles.btnFlex1} onClick={() => setCreateStep(2)} disabled={isCreating}>
                  {t("common.back")}
                </Button>
                <Button className={styles.btnFlex2} onClick={handleCreate} isLoading={isCreating}>
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

import { useState, useEffect } from "react";

import { Globe, Lock, CreditCard, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../../components/common/Button";
import { InputField } from "../../../components/common/InputField";
import Toggle from "../../../components/common/Toggle";
import styles from "../../org-selection-page/org-selection-page.module.css";
import wizardStyles from "../onboarding-wizard.module.css";

interface CreateOrgStepProps {
  onCreate: (data: { name: string; visibility: "public" | "private"; plan: "free" | "pro" | "enterprise"; requireApproval: boolean }) => void;
  onBack: () => void;
  isCreating: boolean;
}

const CreateOrgStep = ({ onCreate, onBack, isCreating }: CreateOrgStepProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    visibility: "public" as "public" | "private",
    plan: "free" as "free" | "pro" | "enterprise",
    requireApproval: true,
  });

  // Reset state on unmount
  useEffect(() => {
    return () => {
      setForm({
        name: "",
        visibility: "public",
        plan: "free",
        requireApproval: true,
      });
      setStep(1);
    };
  }, []);

  const tiers = [
    { 
      id: 'free' as const, 
      name: t('onboarding.tierSprout'), 
      price: '$9/mo', 
      desc: t('onboarding.tierSproutDesc'),
      disabled: false 
    },
    { 
      id: 'pro' as const, 
      name: t('onboarding.tierBloom'), 
      price: '$19/mo', 
      desc: t('onboarding.tierBloomDesc'),
      disabled: true 
    },
    { 
      id: 'enterprise' as const, 
      name: t('onboarding.tierGrove'), 
      price: '$49/mo', 
      desc: t('onboarding.tierGroveDesc'),
      disabled: true 
    }
  ];

  return (
    <>
      <div className={wizardStyles.stepHeader}>
        <h3 className={wizardStyles.stepTitle}>{t('onboarding.createTitle')}</h3>
        <p className={wizardStyles.stepDescription}>
          {step === 1 ? t('onboarding.createDesc') : step === 2 ? t('onboarding.selectTier') : t('common.confirm')}
        </p>
      </div>

      {step === 1 && (
        <div className={styles.createStep}>
          <InputField
            label={t("settings.orgName")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("settings.orgNamePlaceholder")}
            autoFocus
          />

          <div className={wizardStyles.fieldGroup}>
            <label className={wizardStyles.fieldLabel}>{t("onboarding.orgType")}</label>
            <div className={styles.typeCardRow}>
              <button
                className={`${styles.typeCard} ${form.visibility === 'public' ? styles.activeType : ''}`}
                onClick={() => setForm({ ...form, visibility: 'public' })}
              >
                <Globe size={20} />
                <div className={styles.typeCardText}>
                  <span className={styles.typeCardTitle}>{t("onboarding.public")}</span>
                  <span className={styles.typeCardDesc}>{t("onboarding.publicDesc")}</span>
                </div>
              </button>
              <button
                className={`${styles.typeCard} ${form.visibility === 'private' ? styles.activeType : ''}`}
                onClick={() => setForm({ ...form, visibility: 'private' })}
              >
                <Lock size={20} />
                <div className={styles.typeCardText}>
                  <span className={styles.typeCardTitle}>{t("onboarding.private")}</span>
                  <span className={styles.typeCardDesc}>{t("onboarding.privateDesc")}</span>
                </div>
              </button>
            </div>
          </div>

          <div className={wizardStyles.fieldGroup}>
            <div className={wizardStyles.requireApprovalRow}>
              <div>
                <label className={wizardStyles.fieldLabel}>{t("onboarding.requireApproval")}</label>
                <p className={wizardStyles.requireApprovalDesc}>{t("onboarding.requireApprovalDesc")}</p>
              </div>
              <Toggle isOn={form.requireApproval} onToggle={(isOn) => setForm({ ...form, requireApproval: isOn })} />
            </div>
          </div>

          <div className={styles.stepActions}>
            <Button variant="secondary" className={styles.btnFlex1} onClick={onBack}>
              {t("common.cancel")}
            </Button>
            <Button className={styles.btnFlex2} disabled={form.name.trim().length < 3} onClick={() => setStep(2)}>
              {t("common.continue")} <ArrowRight size={18} className={styles.btnIcon} />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.createStep}>
          <p className={styles.tierTrialNote}>✨ {t("onboarding.freeTrialNote")}</p>

          <div className={styles.tierList}>
            {tiers.map(tier => (
              <button
                key={tier.id}
                className={`${styles.tierSelectCard} ${form.plan === tier.id ? styles.activeTier : ''} ${tier.disabled ? styles.tierDisabled : ''}`}
                onClick={() => !tier.disabled && setForm({ ...form, plan: tier.id })}
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
            <Button variant="secondary" className={styles.btnFlex1} onClick={() => setStep(1)}>
              {t("common.back")}
            </Button>
            <Button className={styles.btnFlex2} onClick={() => setStep(3)}>
              {t("common.continue")} <ArrowRight size={18} className={styles.btnIcon} />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={styles.createStepWide}>
          <div className={styles.summarySection}>
            <h4 className={styles.summaryTitle}>{t("common.confirm")}</h4>
            <div className={styles.tierList}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t("settings.orgName")}</span>
                <span className={styles.summaryValue}>{form.name}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t("onboarding.orgType")}</span>
                <span className={styles.summaryValue}>{t(`onboarding.${form.visibility}`)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t("settings.subscription")}</span>
                <span className={styles.summaryValue}>{tiers.find(t => t.id === form.plan)?.name}</span>
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
            <Button variant="secondary" className={styles.btnFlex1} onClick={() => setStep(2)} disabled={isCreating}>
              {t("common.back")}
            </Button>
            <Button className={styles.btnFlex2} onClick={() => onCreate(form)} isLoading={isCreating}>
              {t("onboarding.createOrganisation")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateOrgStep;

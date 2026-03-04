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
      price: '$0', 
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <InputField 
            label={t("settings.orgName")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("settings.orgNamePlaceholder")}
            autoFocus
          />

          <div className={wizardStyles.fieldGroup}>
            <label className={wizardStyles.fieldLabel}>{t("onboarding.orgType")}</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button 
                className={`${styles.typeCard} ${form.visibility === 'public' ? styles.activeType : ''}`}
                onClick={() => setForm({ ...form, visibility: 'public' })}
              >
                <Globe size={20} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>{t("onboarding.public")}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t("onboarding.publicDesc")}</div>
                </div>
              </button>
              <button 
                className={`${styles.typeCard} ${form.visibility === 'private' ? styles.activeType : ''}`}
                onClick={() => setForm({ ...form, visibility: 'private' })}
              >
                <Lock size={20} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>{t("onboarding.private")}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t("onboarding.privateDesc")}</div>
                </div>
              </button>
            </div>
          </div>

          <div className={wizardStyles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label className={wizardStyles.fieldLabel} style={{ margin: 0 }}>{t("onboarding.requireApproval")}</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: 0 }}>{t("onboarding.requireApprovalDesc")}</p>
              </div>
              <Toggle 
                isOn={form.requireApproval}
                onToggle={(isOn) => setForm({ ...form, requireApproval: isOn })}
              />
            </div>
          </div>

          <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onBack}>
              {t("common.cancel")}
            </Button>
            <Button 
              style={{ flex: 2 }}
              disabled={form.name.trim().length < 3}
              onClick={() => setStep(2)}
            >
              {t("common.continue")} <ArrowRight size={18} style={{ marginLeft: 8 }} />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 600, margin: 0 }}>
            ✨ {t("onboarding.freeTrialNote")}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tiers.map(tier => (
              <button 
                key={tier.id} 
                className={`${styles.tierSelectCard} ${form.plan === tier.id ? styles.activeTier : ''} ${tier.disabled ? styles.tierDisabled : ''}`}
                onClick={() => !tier.disabled && setForm({ ...form, plan: tier.id })}
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
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
              {t("common.back")}
            </Button>
            <Button style={{ flex: 2 }} onClick={() => setStep(3)}>
              {t("common.continue")} <ArrowRight size={18} style={{ marginLeft: 8 }} />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.summarySection}>
            <h4 className={styles.summaryTitle}>{t("common.confirm")}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setStep(2)} disabled={isCreating}>
              {t("common.back")}
            </Button>
            <Button style={{ flex: 2 }} onClick={() => onCreate(form)} isLoading={isCreating}>
              {t("onboarding.createOrganisation")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateOrgStep;

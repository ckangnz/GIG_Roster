import { useState } from "react";

import { Search, Plus, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { InputField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import { Organisation } from "../../model/model";
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
  const [mode, setMode] = useState<"choice" | "join" | "create">("choice");
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);

  const handleClose = () => {
    setMode("choice");
    setSelectedOrg(null);
    onClose();
  };

  const tiers = [
    { id: 'free', name: 'Free', price: '$0', features: ['Up to 10 users', 'Basic features'] },
    { id: 'pro', name: 'Pro', price: '$19/mo', features: ['Up to 50 users', 'Advanced features'] },
    { id: 'enterprise', name: 'Enterprise', price: '$49/mo', features: ['Unlimited users', 'Priority support'] }
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={
        mode === "choice" ? t("onboarding.addOrg", "Add Organisation") :
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
            <Search size={24} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t("onboarding.joinTitle")}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{t("onboarding.joinDesc")}</div>
            </div>
          </button>

          <button 
            className={`${styles.choiceCard} ${styles.disabled}`} 
            disabled
            title="Coming soon"
          >
            <Plus size={24} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {t("onboarding.createTitle")}
                <span className={styles.comingSoonBadge}>{t("common.comingSoon", "Coming Soon")}</span>
              </div>
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
              {t("common.back", "Back")}
            </button>
          </div>
        </div>
      )}

      {mode === "create" && (
        <div style={{ paddingTop: '12px' }}>
          <h4 style={{ marginBottom: '16px' }}>{t("onboarding.selectTier", "Select a Tier")}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tiers.map(tier => (
              <div key={tier.id} className={styles.tierCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>{tier.name}</span>
                  <span style={{ fontWeight: 800, color: 'var(--color-accent)' }}>{tier.price}</span>
                </div>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                  {tier.features.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '24px', opacity: 0.6 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <CreditCard size={18} /> {t("onboarding.paymentInfo", "Payment Information")}
            </h4>
            <div className={formStyles.formGroup}>
              <InputField label="Card Number" placeholder="**** **** **** ****" disabled />
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button className={styles.backLink} onClick={() => setMode("choice")}>
              {t("common.back", "Back")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default JoinOrCreateOrgModal;

import { useTranslation } from "react-i18next";

import Button from "../../../components/common/Button";
import styles from "../guest-page.module.css";
import wizardStyles from "../onboarding-wizard.module.css";

interface PendingApprovalStepProps {
  onWithdraw: () => void;
  onLogout: () => void;
}

const PendingApprovalStep = ({ onWithdraw, onLogout }: PendingApprovalStepProps) => {
  const { t } = useTranslation();

  return (
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
        <Button variant="secondary" onClick={onWithdraw} style={{ width: '100%' }}>
          {t('onboarding.withdraw')}
        </Button>
      </div>
      
      <div className={styles.actionContainer} style={{ marginTop: '1rem' }}>
        <Button variant="delete" onClick={onLogout} style={{ width: '100%' }}>
          {t('common.logout')}
        </Button>
      </div>
    </div>
  );
};

export default PendingApprovalStep;

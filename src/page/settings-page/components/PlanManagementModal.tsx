import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import { Organisation } from "../../../model/model";
import selectionStyles from "../../org-selection-page/org-selection-page.module.css";

import styles from "./plan-management-modal.module.css";

interface PlanManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: Organisation;
  onUpdate: (updatedOrg: Organisation) => void;
}

const PlanManagementModal = ({
  isOpen,
  onClose,
  org,
  onUpdate,
}: PlanManagementModalProps) => {
  const { t } = useTranslation();
  const currentPlan = org.subscription?.plan || "free";

  const tiers = [
    {
      id: "free" as const,
      name: t("onboarding.tierSprout"),
      price: "$0",
      desc: t("onboarding.tierSproutDesc"),
      disabled: false,
    },
    {
      id: "pro" as const,
      name: t("onboarding.tierBloom"),
      price: "$19/mo",
      desc: t("onboarding.tierBloomDesc"),
      disabled: false,
    },
    {
      id: "enterprise" as const,
      name: t("onboarding.tierGrove"),
      price: "$49/mo",
      desc: t("onboarding.tierGroveDesc"),
      disabled: true,
    },
  ];

  const handlePlanSelect = (planId: "free" | "pro" | "enterprise") => {
    if (planId !== currentPlan) {
      onUpdate({ ...org, subscription: { ...org.subscription, plan: planId } });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("settings.changePlan")}>
      <div className={styles.tierList}>
        {tiers.map((tier) => {
          const isCurrent = tier.id === currentPlan;
          return (
            <button
              key={tier.id}
              className={`${selectionStyles.tierSelectCard} ${isCurrent ? selectionStyles.activeTier : ""}`}
              onClick={() => handlePlanSelect(tier.id)}
              disabled={tier.disabled}
            >
              <div className={styles.tierCardContent}>
                <div className={styles.tierCardTitleRow}>
                  <span className={styles.tierCardTitle}>{tier.name}</span>
                  {isCurrent && (
                    <span className={styles.currentBadge}>
                      {t("settings.currentPlan")}
                    </span>
                  )}
                </div>
                <div className={styles.tierCardDesc}>{tier.desc}</div>
              </div>
              <div className={styles.tierCardRight}>
                <div className={styles.tierCardPrice}>{tier.price}</div>
                {isCurrent && <Check size={18} color="var(--color-primary)" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className={styles.cancelRow}>
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </Modal>
  );
};

export default PlanManagementModal;

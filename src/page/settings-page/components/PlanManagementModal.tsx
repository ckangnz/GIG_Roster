import { useState } from "react";

import { doc, updateDoc } from "firebase/firestore";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import { db } from "../../../firebase";
import { Organisation } from "../../../model/model";
import selectionStyles from "../../org-selection-page/org-selection-page.module.css";

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
  const [saving, setSaving] = useState(false);
  const currentPlan = org.subscription?.plan || "free";

  const tiers = [
    {
      id: "free" as const,
      name: t("onboarding.tierSprout"),
      price: "$0",
      desc: t("onboarding.tierSproutDesc"),
    },
    {
      id: "pro" as const,
      name: t("onboarding.tierBloom"),
      price: "$19/mo",
      desc: t("onboarding.tierBloomDesc"),
    },
    {
      id: "enterprise" as const,
      name: t("onboarding.tierGrove"),
      price: "$49/mo",
      desc: t("onboarding.tierGroveDesc"),
    },
  ];

  const handlePlanSelect = async (planId: "free" | "pro" | "enterprise") => {
    if (planId === currentPlan) return;

    setSaving(true);
    try {
      const orgRef = doc(db, "organisations", org.id);
      const newSubscription = {
        ...org.subscription,
        plan: planId,
      };
      await updateDoc(orgRef, { subscription: newSubscription });
      onUpdate({ ...org, subscription: newSubscription });
      onClose();
    } catch (error) {
      console.error("Error updating plan:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("settings.changePlan")}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingTop: "12px",
        }}
      >
        {tiers.map((tier) => {
          const isCurrent = tier.id === currentPlan;
          return (
            <button
              key={tier.id}
              className={`${selectionStyles.tierSelectCard} ${isCurrent ? selectionStyles.activeTier : ""}`}
              onClick={() => handlePlanSelect(tier.id)}
              disabled={saving || isCurrent}
            >
              <div style={{ flex: 1, textAlign: "left" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontWeight: 700 }}>{tier.name}</span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        background: "var(--color-primary)",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      {t("settings.currentPlan")}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                  {tier.desc}
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div style={{ fontWeight: 800, color: "var(--color-accent)" }}>
                  {tier.price}
                </div>
                {isCurrent && <Check size={18} color="var(--color-primary)" />}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
      </div>
    </Modal>
  );
};

export default PlanManagementModal;

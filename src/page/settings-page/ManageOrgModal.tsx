import { useState, useEffect } from "react";

import { doc, updateDoc } from "firebase/firestore";
import { Trash2, LogOut, AlertTriangle, Globe, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../components/common/Button";
import { InputField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import Toggle from "../../components/common/Toggle";
import { db } from "../../firebase";
import { Organisation } from "../../model/model";
import formStyles from "../../styles/form.module.css";

interface ManageOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: (Organisation & { isAdmin: boolean; isApproved: boolean }) | null;
  onUpdate: (updatedOrg: Organisation) => void;
  onLeave: (
    org: Organisation & { isAdmin: boolean; isApproved: boolean },
  ) => void;
  onDelete: (
    org: Organisation & { isAdmin: boolean; isApproved: boolean },
  ) => void;
  currentUserId: string | undefined;
}

const ManageOrgModal = ({
  isOpen,
  onClose,
  org,
  onUpdate,
  onLeave,
  onDelete,
  currentUserId,
}: ManageOrgModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [verificationName, setVerificationName] = useState("");

  useEffect(() => {
    if (org) {
      setName(org.name);
      setVisibility(org.visibility || "public");
      setShowDeleteConfirm(false);
      setShowLeaveConfirm(false);
      setVerificationName("");
    }
  }, [org, isOpen]);

  if (!org) return null;

  const isOwner = org.ownerId === currentUserId;

  const plan = org.subscription?.plan || "free";
  const expiresAt = org.subscription?.expiresAt;

  // Calculate free tier end date (created date + 1 month) if no explicit expiry
  const createdAt = org.createdAt ? new Date(org.createdAt) : new Date();
  const defaultEndDate = new Date(createdAt);
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);

  const displayExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString()
    : defaultEndDate.toLocaleDateString();

  const getPlanLabel = () => {
    switch (plan) {
      case "super":
        return t("settings.superTier");
      case "pro":
        return t("settings.proTier");
      case "enterprise":
        return t("settings.enterpriseTier");
      default:
        return t("settings.freeTier");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const isChanged = name !== org.name || visibility !== org.visibility;
    if (!isChanged) return;

    setSaving(true);
    try {
      const orgRef = doc(db, "organisations", org.id);
      await updateDoc(orgRef, {
        name: name.trim(),
        visibility: visibility,
      });
      onUpdate({ ...org, name: name.trim(), visibility: visibility });
      onClose();
    } catch (error) {
      console.error("Error updating organisation:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (verificationName.trim() === org.name) {
      onDelete(org);
      onClose();
    }
  };

  const handleConfirmLeave = () => {
    if (verificationName.trim() === org.name) {
      onLeave(org);
      onClose();
    }
  };

  const footer = (
    <div
      style={{
        display: "flex",
        gap: "12px",
        justifyContent: "flex-end",
        width: "100%",
      }}
    >
      <Button variant="secondary" onClick={onClose} disabled={saving}>
        {t("common.cancel")}
      </Button>
      {!showDeleteConfirm && !showLeaveConfirm && (
        <Button
          onClick={handleSave}
          disabled={
            saving ||
            !name.trim() ||
            (name === org.name && visibility === org.visibility)
          }
        >
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.manageOrg")}
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className={formStyles.formGroup}>
          <InputField
            label={t("settings.orgName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("settings.orgNamePlaceholder")}
            disabled={!isOwner && !org.isAdmin}
          />
        </div>

        <div className={formStyles.formGroup}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {visibility === "public" ? (
                <Globe size={20} color="var(--color-primary)" />
              ) : (
                <Lock size={20} color="var(--color-text-dim)" />
              )}
              <div>
                <label style={{ margin: 0 }}>{t("onboarding.orgType")}</label>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-dim)",
                    margin: 0,
                  }}
                >
                  {visibility === "public"
                    ? t("onboarding.public")
                    : t("onboarding.private")}
                </p>
              </div>
            </div>
            <Toggle
              isOn={visibility === "public"}
              onToggle={(isOn) => setVisibility(isOn ? "public" : "private")}
              disabled={!isOwner && !org.isAdmin}
            />
          </div>
        </div>

        <div
          style={{
            padding: "16px",
            background: "var(--background-app-shell)",
            borderRadius: "12px",
            border: "1px solid var(--border-color-secondary)",
          }}
        >
          <h4
            style={{
              margin: "0 0 8px 0",
              fontSize: "0.9rem",
              color: "var(--color-text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {t("settings.subscription")}
          </h4>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {getPlanLabel()}
            </span>
            {plan !== "super" && (
              <span
                style={{ fontSize: "0.85rem", color: "var(--color-text-dim)" }}
              >
                {t("settings.freeTierUntil", { date: displayExpiry })}
              </span>
            )}
          </div>
          {plan === "super" && (
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "0.85rem",
                color: "var(--color-accent)",
                fontWeight: 600,
              }}
            >
              {t("settings.unlimitedAccess", {
                defaultValue: "Unlimited everything",
              })}
            </p>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border-color-secondary)",
            paddingTop: "24px",
          }}
        >
          {isOwner ? (
            <>
              {!showDeleteConfirm ? (
                <Button
                  variant="delete"
                  style={{ width: "100%" }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={18} style={{ marginRight: 8 }} />
                  {t("settings.deleteOrg")}
                </Button>
              ) : (
                <div
                  style={{
                    background: "rgba(255, 59, 48, 0.05)",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid var(--color-error)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--color-error)",
                      marginBottom: "12px",
                      fontWeight: 700,
                    }}
                  >
                    <AlertTriangle size={20} />
                    <span>{t("settings.criticalAction")}</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
                    {t("settings.deleteOrgVerification", { name: org.name })}
                  </p>
                  <InputField
                    value={verificationName}
                    onChange={(e) => setVerificationName(e.target.value)}
                    placeholder={org.name}
                    autoFocus
                  />
                  <div
                    style={{ display: "flex", gap: "12px", marginTop: "16px" }}
                  >
                    <Button
                      variant="secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{ flex: 1 }}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="delete"
                      onClick={handleConfirmDelete}
                      disabled={verificationName.trim() !== org.name}
                      style={{ flex: 1 }}
                    >
                      {t("common.confirm")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {!showLeaveConfirm ? (
                <Button 
                  variant="delete" 
                  style={{ width: "100%" }} 
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  <LogOut size={18} style={{ marginRight: 8 }} />
                  {t("settings.leaveOrg")}
                </Button>
              ) : (
                <div
                  style={{
                    background: "rgba(255, 59, 48, 0.05)",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid var(--color-error)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--color-error)",
                      marginBottom: "12px",
                      fontWeight: 700,
                    }}
                  >
                    <AlertTriangle size={20} />
                    <span>{t("settings.criticalAction")}</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
                    {t("settings.leaveOrgVerification", { name: org.name })}
                  </p>
                  <InputField
                    value={verificationName}
                    onChange={(e) => setVerificationName(e.target.value)}
                    placeholder={org.name}
                    autoFocus
                  />
                  <div
                    style={{ display: "flex", gap: "12px", marginTop: "16px" }}
                  >
                    <Button
                      variant="secondary"
                      onClick={() => setShowLeaveConfirm(false)}
                      style={{ flex: 1 }}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="delete"
                      onClick={handleConfirmLeave}
                      disabled={verificationName.trim() !== org.name}
                      style={{ flex: 1 }}
                    >
                      {t("common.confirm")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ManageOrgModal;

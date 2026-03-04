import { useState, useEffect } from "react";

import { doc, updateDoc } from "firebase/firestore";
import {
  Trash2,
  LogOut,
  AlertTriangle,
  Globe,
  Lock,
  Copy,
  Sparkles,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import PlanManagementModal from "./components/PlanManagementModal";
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
  const [localOrg, setLocalOrg] = useState(org);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [verificationName, setVerificationName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  useEffect(() => {
    if (org && isOpen) {
      setLocalOrg(org);
      setName(org.name);
      setVisibility(org.visibility || "public");
      setShowDeleteConfirm(false);
      setShowLeaveConfirm(false);
      setVerificationName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, isOpen]);

  if (!org) return null;

  const isOwner = org.ownerId === currentUserId;
  const isAdmin = org.isAdmin;

  const currentOrg = localOrg ?? org;
  const plan = currentOrg.subscription?.plan || "free";
  const expiresAt = currentOrg.subscription?.expiresAt;
  const originalPlan = org.subscription?.plan || "free";

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

  const inviteLink = `${window.location.origin}/guest?join=${org.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const orgRef = doc(db, "organisations", org.id);
      const updates: Record<string, unknown> = {
        name: name.trim(),
        visibility: visibility,
      };
      if (plan !== originalPlan) {
        updates.subscription = { ...currentOrg.subscription, plan };
      }
      await updateDoc(orgRef, updates);
      onUpdate({ ...currentOrg, name: name.trim(), visibility: visibility });
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
            (name === org.name && visibility === org.visibility && plan === originalPlan)
          }
        >
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      )}
    </div>
  );

  return (
    <>
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
              disabled={!isOwner && !isAdmin}
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
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
                disabled={!isOwner && !isAdmin}
              />
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-dim)",
                marginTop: "8px",
                fontStyle: "italic",
                paddingLeft: "32px",
              }}
            >
              {visibility === "public"
                ? t("onboarding.publicDesc")
                : t("onboarding.privateDesc")}
            </p>
          </div>

          {visibility === "private" && (isOwner || isAdmin) && (
            <div
              style={{
                padding: "16px",
                background: "var(--background-primary-subtle)",
                borderRadius: "12px",
                border: "1px solid var(--color-link-faded)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                <Copy size={16} /> {t("settings.invitationLink")}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <InputField
                  value={inviteLink}
                  readOnly
                  style={{ flex: 1, fontSize: "0.8rem" }}
                />
                <Button
                  size="small"
                  onClick={handleCopyLink}
                  style={{ minWidth: "80px" }}
                >
                  {copied ? <Check size={16} /> : t("common.copy")}
                </Button>
              </div>
              <p
                style={{
                  fontSize: "0.7rem",
                  color: "var(--color-text-dim)",
                  marginTop: "8px",
                  margin: 0,
                }}
              >
                {t("settings.invitationLinkDesc")}
              </p>
            </div>
          )}

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
              <div>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    display: "block",
                  }}
                >
                  {getPlanLabel()}
                </span>
                {plan !== "super" && (
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    {t("settings.freeTierUntil", { date: displayExpiry })}
                  </span>
                )}
              </div>
              {isOwner && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setIsPlanModalOpen(true)}
                >
                  <Sparkles size={14} style={{ marginRight: 6 }} />
                  {t("settings.changePlan")}
                </Button>
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
                {t("settings.unlimitedAccess")}
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
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "16px",
                      }}
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
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "16px",
                      }}
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

      <PlanManagementModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        org={localOrg ?? org}
        onUpdate={(updatedOrg) => {
          setLocalOrg(updatedOrg as Organisation & { isAdmin: boolean; isApproved: boolean });
          onUpdate(updatedOrg);
        }}
      />
    </>
  );
};

export default ManageOrgModal;

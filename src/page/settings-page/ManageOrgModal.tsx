import { useState, useEffect, useRef } from "react";

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
  Pencil,
  X,
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

import modalStyles from "./manage-org-modal.module.css";

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
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [verificationName, setVerificationName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (org && isOpen) {
      setLocalOrg(org);
      setName(org.name);
      setVisibility(org.visibility || "public");
      setRequiresApproval(org.settings?.requireApproval ?? true);
      setIsEditingName(false);
      setShowDeleteConfirm(false);
      setShowLeaveConfirm(false);
      setVerificationName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, isOpen]);

  useEffect(() => {
    if (isEditingName && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingName]);

  if (!org) return null;

  const isOwner = org.ownerId === currentUserId;

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

  const inviteLink = `${window.location.origin}/#/guest?join=${org.id}`;

  const handleStartEditName = () => {
    setEditingNameValue(name);
    setIsEditingName(true);
  };

  const handleConfirmNameEdit = () => {
    const trimmed = editingNameValue.trim();
    if (trimmed.length >= 1) {
      setName(trimmed);
    }
    setIsEditingName(false);
  };

  const handleCancelNameEdit = () => {
    setIsEditingName(false);
    setEditingNameValue("");
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleConfirmNameEdit();
    if (e.key === "Escape") handleCancelNameEdit();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const originalRequiresApproval = org.settings?.requireApproval ?? true;

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const orgRef = doc(db, "organisations", org.id);
      const updates: Record<string, unknown> = {
        name: name.trim(),
        visibility,
        "settings.requireApproval": requiresApproval,
      };
      if (plan !== originalPlan) {
        updates.subscription = { ...currentOrg.subscription, plan };
      }
      await updateDoc(orgRef, updates);
      onUpdate({
        ...currentOrg,
        name: name.trim(),
        visibility,
        settings: { ...currentOrg.settings, requireApproval: requiresApproval },
      });
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
    <div className={modalStyles.footer}>
      <Button variant="secondary" onClick={onClose} disabled={saving}>
        {t("common.cancel")}
      </Button>
      {!showDeleteConfirm && !showLeaveConfirm && isOwner && (
        <Button
          onClick={handleSave}
          disabled={
            saving ||
            !name.trim() ||
            (
              name === org.name &&
              visibility === org.visibility &&
              plan === originalPlan &&
              requiresApproval === originalRequiresApproval
            )
          }
        >
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      )}
    </div>
  );

  const editableTitle = isOwner ? (
    isEditingName ? (
      <div className={modalStyles.titleEditRow}>
        <input
          ref={titleInputRef}
          className={modalStyles.titleInput}
          value={editingNameValue}
          onChange={(e) => setEditingNameValue(e.target.value)}
          onKeyDown={handleNameKeyDown}
          maxLength={80}
        />
        <button
          className={`${modalStyles.titleActionBtn} ${modalStyles.titleConfirmBtn}`}
          onClick={handleConfirmNameEdit}
          aria-label="Confirm"
        >
          <Check size={18} />
        </button>
        <button
          className={`${modalStyles.titleActionBtn} ${modalStyles.titleCancelBtn}`}
          onClick={handleCancelNameEdit}
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
      </div>
    ) : (
      <div className={modalStyles.titleRow}>
        <span className={modalStyles.titleText}>{name}</span>
        <button
          className={modalStyles.editTitleBtn}
          onClick={handleStartEditName}
          aria-label="Edit name"
        >
          <Pencil size={15} />
        </button>
      </div>
    )
  ) : (
    <span className={modalStyles.titleText}>{name}</span>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editableTitle}
        footer={footer}
      >
        <div className={modalStyles.body}>
          <div className={formStyles.formGroup}>
            <div className={modalStyles.visibilityRow}>
              <div className={modalStyles.visibilityInfo}>
                {visibility === "public" ? (
                  <Globe size={20} color="var(--color-primary)" />
                ) : (
                  <Lock size={20} color="var(--color-text-dim)" />
                )}
                <div>
                  <label className={modalStyles.visibilityDesc}>{t("onboarding.orgType")}</label>
                  <p className={modalStyles.visibilityDesc}>
                    {visibility === "public" ? t("onboarding.public") : t("onboarding.private")}
                  </p>
                </div>
              </div>
              <Toggle
                isOn={visibility === "public"}
                onToggle={(isOn) => setVisibility(isOn ? "public" : "private")}
                disabled={!isOwner}
              />
            </div>
            <p className={modalStyles.visibilityHint}>
              {visibility === "public" ? t("onboarding.publicDesc") : t("onboarding.privateDesc")}
            </p>
            {visibility === "private" && isOwner && (
              <div className={modalStyles.inviteSection}>
                <label className={modalStyles.inviteLabel}>
                  <Copy size={16} /> {t("settings.invitationLink")}
                </label>
                <div className={modalStyles.inviteRow}>
                  <InputField value={inviteLink} readOnly className={modalStyles.inviteInput} />
                  <Button size="small" onClick={handleCopyLink} className={modalStyles.inviteButton}>
                    {copied ? <Check size={16} /> : t("common.copy")}
                  </Button>
                </div>
                <p className={modalStyles.inviteNote}>{t("settings.invitationLinkDesc")}</p>
              </div>
            )}
          </div>

          <div className={formStyles.formGroup}>
            <div className={modalStyles.visibilityRow}>
              <div>
                <label className={modalStyles.requireApprovalLabel}>{t("onboarding.requireApproval")}</label>
                <p className={modalStyles.visibilityDesc}>{t("onboarding.requireApprovalDesc")}</p>
              </div>
              <Toggle
                isOn={requiresApproval}
                onToggle={setRequiresApproval}
                disabled={!isOwner}
              />
            </div>
          </div>

          <div className={modalStyles.subscriptionBox}>
            <h4 className={modalStyles.subscriptionLabel}>{t("settings.subscription")}</h4>
            <div className={modalStyles.subscriptionRow}>
              <div>
                <span className={modalStyles.subscriptionPlan}>{getPlanLabel()}</span>
                {plan !== "super" && (
                  <span className={modalStyles.subscriptionExpiry}>
                    {t("settings.freeTierUntil", { date: displayExpiry })}
                  </span>
                )}
              </div>
              {isOwner && (
                <Button variant="secondary" size="small" onClick={() => setIsPlanModalOpen(true)}>
                  <Sparkles size={14} className={modalStyles.changePlanIcon} />
                  {t("settings.changePlan")}
                </Button>
              )}
            </div>
            {plan === "super" && (
              <p className={modalStyles.subscriptionUnlimited}>{t("settings.unlimitedAccess")}</p>
            )}
          </div>

          <div className={modalStyles.dangerZone}>
            {isOwner ? (
              <>
                {!showLeaveConfirm && !showDeleteConfirm && (
                  <Button variant="delete" className={modalStyles.dangerConfirmBtn} onClick={() => setShowLeaveConfirm(true)}>
                    <LogOut size={18} className={modalStyles.changePlanIcon} />
                    {t("settings.leaveOrg")}
                  </Button>
                )}
                {showLeaveConfirm && (
                  <div className={modalStyles.dangerConfirmBox}>
                    <div className={modalStyles.dangerConfirmTitle}>
                      <AlertTriangle size={20} />
                      <span>{t("settings.criticalAction")}</span>
                    </div>
                    <p className={modalStyles.dangerConfirmDesc}>
                      {t("settings.leaveOrgVerification", { name: org.name })}
                    </p>
                    <InputField
                      value={verificationName}
                      onChange={(e) => setVerificationName(e.target.value)}
                      placeholder={org.name}
                      autoFocus
                    />
                    <div className={modalStyles.dangerConfirmActions}>
                      <Button variant="secondary" className={modalStyles.dangerConfirmBtn} onClick={() => setShowLeaveConfirm(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button variant="delete" className={modalStyles.dangerConfirmBtn} onClick={handleConfirmLeave} disabled={verificationName.trim() !== org.name}>
                        {t("common.confirm")}
                      </Button>
                    </div>
                  </div>
                )}
                {!showLeaveConfirm && !showDeleteConfirm ? (
                  <Button variant="delete" className={modalStyles.dangerConfirmBtn} onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={18} className={modalStyles.changePlanIcon} />
                    {t("settings.deleteOrg")}
                  </Button>
                ) : !showLeaveConfirm && (
                  <div className={modalStyles.dangerConfirmBox}>
                    <div className={modalStyles.dangerConfirmTitle}>
                      <AlertTriangle size={20} />
                      <span>{t("settings.criticalAction")}</span>
                    </div>
                    <p className={modalStyles.dangerConfirmDesc}>
                      {t("settings.deleteOrgVerification", { name: org.name })}
                    </p>
                    <InputField
                      value={verificationName}
                      onChange={(e) => setVerificationName(e.target.value)}
                      placeholder={org.name}
                      autoFocus
                    />
                    <div className={modalStyles.dangerConfirmActions}>
                      <Button variant="secondary" className={modalStyles.dangerConfirmBtn} onClick={() => setShowDeleteConfirm(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button variant="delete" className={modalStyles.dangerConfirmBtn} onClick={handleConfirmDelete} disabled={verificationName.trim() !== org.name}>
                        {t("common.confirm")}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {!showLeaveConfirm ? (
                  <Button variant="delete" className={modalStyles.dangerConfirmBtn} onClick={() => setShowLeaveConfirm(true)}>
                    <LogOut size={18} className={modalStyles.changePlanIcon} />
                    {t("settings.leaveOrg")}
                  </Button>
                ) : (
                  <div className={modalStyles.dangerConfirmBox}>
                    <div className={modalStyles.dangerConfirmTitle}>
                      <AlertTriangle size={20} />
                      <span>{t("settings.criticalAction")}</span>
                    </div>
                    <p className={modalStyles.dangerConfirmDesc}>
                      {t("settings.leaveOrgVerification", { name: org.name })}
                    </p>
                    <InputField
                      value={verificationName}
                      onChange={(e) => setVerificationName(e.target.value)}
                      placeholder={org.name}
                      autoFocus
                    />
                    <div className={modalStyles.dangerConfirmActions}>
                      <Button variant="secondary" className={modalStyles.dangerConfirmBtn} onClick={() => setShowLeaveConfirm(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button variant="delete" className={modalStyles.dangerConfirmBtn} onClick={handleConfirmLeave} disabled={verificationName.trim() !== org.name}>
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

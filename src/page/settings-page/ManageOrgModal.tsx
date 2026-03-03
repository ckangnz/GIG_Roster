import { useState, useEffect } from "react";

import { doc, updateDoc } from "firebase/firestore";
import { Trash2, LogOut, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../components/common/Button";
import { InputField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import { db } from "../../firebase";
import { Organisation } from "../../model/model";
import formStyles from "../../styles/form.module.css";

interface ManageOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: (Organisation & { isAdmin: boolean; isApproved: boolean }) | null;
  onUpdate: (updatedOrg: Organisation) => void;
  onLeave: (orgId: string) => void;
  onDelete: (orgId: string) => void;
  currentUserId: string | undefined;
}

const ManageOrgModal = ({ 
  isOpen, 
  onClose, 
  org, 
  onUpdate, 
  onLeave, 
  onDelete,
  currentUserId 
}: ManageOrgModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [verificationName, setVerificationName] = useState("");

  useEffect(() => {
    if (org) {
      setName(org.name);
      setShowDeleteConfirm(false);
      setVerificationName("");
    }
  }, [org, isOpen]);

  if (!org) return null;

  const isOwner = org.ownerId === currentUserId;

  const handleSave = async () => {
    if (!name.trim() || name === org.name) return;
    
    setSaving(true);
    try {
      const orgRef = doc(db, "organisations", org.id);
      await updateDoc(orgRef, { name: name.trim() });
      onUpdate({ ...org, name: name.trim() });
      onClose();
    } catch (error) {
      console.error("Error updating organisation name:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (verificationName.trim() === org.name) {
      onDelete(org.id);
      onClose();
    }
  };

  const footer = (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
      <Button variant="secondary" onClick={onClose} disabled={saving}>
        {t("common.cancel")}
      </Button>
      {!showDeleteConfirm && (
        <Button onClick={handleSave} disabled={saving || !name.trim() || name === org.name}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("settings.manageOrg", "Manage Organisation")} footer={footer}>
      <div className={formStyles.formGroup}>
        <InputField 
          label={t("settings.orgName", "Organisation Name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("settings.orgNamePlaceholder", "Enter organisation name")}
          disabled={!isOwner && !org.isAdmin}
        />
      </div>
      
      <div style={{ marginTop: '24px', padding: '16px', background: 'var(--background-app-shell)', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>{t("settings.subscription", "Subscription")}</h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
          {t("settings.freeTier", "Free Tier")}
        </p>
      </div>

      <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color-secondary)', paddingTop: '24px' }}>
        {isOwner ? (
          <>
            {!showDeleteConfirm ? (
              <Button 
                variant="delete" 
                style={{ width: '100%' }} 
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={18} style={{ marginRight: 8 }} />
                {t("settings.deleteOrg", "Delete Organisation")}
              </Button>
            ) : (
              <div style={{ background: 'rgba(255, 59, 48, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-error)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)', marginBottom: '12px', fontWeight: 700 }}>
                  <AlertTriangle size={20} />
                  <span>{t("settings.criticalAction", "Critical Action")}</span>
                </div>
                <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                  {t("settings.deleteOrgVerification", "Please type {name} to confirm deletion:", { name: org.name })}
                </p>
                <InputField 
                  value={verificationName}
                  onChange={(e) => setVerificationName(e.target.value)}
                  placeholder={org.name}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>
                    {t("common.cancel")}
                  </Button>
                  <Button 
                    variant="delete" 
                    onClick={handleConfirmDelete} 
                    disabled={verificationName.trim() !== org.name}
                    style={{ flex: 1 }}
                  >
                    {t("common.confirmDelete", "Confirm Delete")}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Button 
            variant="delete" 
            style={{ width: '100%' }} 
            onClick={() => {
              onLeave(org.id);
              onClose();
            }}
          >
            <LogOut size={18} style={{ marginRight: 8 }} />
            {t("settings.leaveOrg", "Leave Organisation")}
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default ManageOrgModal;

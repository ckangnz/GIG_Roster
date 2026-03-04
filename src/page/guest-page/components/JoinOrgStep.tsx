import { useState, useEffect, useMemo } from "react";

import { ArrowRight, Globe, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../../components/common/Button";
import { InputField } from "../../../components/common/InputField";
import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { Organisation } from "../../../model/model";
import { searchOrganisations, selectUserData } from "../../../store/slices/authSlice";
import wizardStyles from "../onboarding-wizard.module.css";

interface JoinOrgStepProps {
  onJoin: (org: Organisation) => void;
  selectedOrg: Organisation | null;
  onSelectOrg: (org: Organisation | null) => void;
}

const JoinOrgStep = ({ onJoin, selectedOrg, onSelectOrg }: JoinOrgStepProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const userData = useAppSelector(selectUserData);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Organisation[]>([]);

  const userOrgIds = useMemo(() => {
    const orgs = userData?.organisations;
    if (!orgs) return new Set<string>();
    return new Set(Array.isArray(orgs) ? orgs : Object.keys(orgs));
  }, [userData?.organisations]);

  useEffect(() => {
    if (searchTerm.length >= 3 && !selectedOrg) {
      const delayDebounceFn = setTimeout(() => {
        dispatch(searchOrganisations(searchTerm))
          .unwrap()
          .then((results) => {
            // Filter out orgs the user is already a member of
            setSearchResults(results.filter((org) => !userOrgIds.has(org.id)));
          });
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else if (searchResults.length > 0) {
      const timer = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, dispatch, selectedOrg, searchResults.length, userOrgIds]);

  return (
    <>
      <div className={wizardStyles.stepHeader}>
        <h3 className={wizardStyles.stepTitle}>{t('onboarding.findTitle')}</h3>
        <p className={wizardStyles.stepDescription}>
          {selectedOrg 
            ? t('onboarding.confirmDesc')
            : t('onboarding.findDesc')}
        </p>
      </div>

      <div className={wizardStyles.searchContainer}>
        <InputField
          placeholder={t('onboarding.searchPlaceholder')}
          value={selectedOrg ? selectedOrg.name : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onSelectOrg(null);
          }}
          autoFocus
        />

        {searchTerm.length >= 3 && !selectedOrg && (
          <div className={wizardStyles.resultsList}>
            {searchResults.length > 0 ? (
              searchResults.map((org) => (
                <button
                  key={org.id}
                  className={wizardStyles.resultItem}
                  onClick={() => onSelectOrg(org)}
                >
                  <div className={wizardStyles.orgItemRow}>
                    {org.visibility === 'private' ? (
                      <Lock size={14} color="var(--color-text-dim)" />
                    ) : (
                      <Globe size={14} color="var(--color-primary)" />
                    )}
                    <span className={wizardStyles.orgName}>{org.name}</span>
                  </div>
                  <span className={wizardStyles.orgMeta}>{t('onboarding.clickToJoin')}</span>
                </button>
              ))
            ) : (
              <div className={wizardStyles.noResults}>{t('onboarding.noOrgs')}</div>
            )}
          </div>
        )}
      </div>

      {selectedOrg && (
        <div className={wizardStyles.wizardActions}>
          <Button className={wizardStyles.fullWidthBtn} onClick={() => onJoin(selectedOrg)}>
            {t('onboarding.requestAccess')} <ArrowRight size={18} className={wizardStyles.btnIcon} />
          </Button>
        </div>
      )}
    </>
  );
};

export default JoinOrgStep;

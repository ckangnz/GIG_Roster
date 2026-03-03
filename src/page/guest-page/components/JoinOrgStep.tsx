import { useState, useEffect, useMemo } from "react";

import { ArrowRight, Check } from "lucide-react";
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

  const isAlreadyMember = useMemo(() => {
    if (!selectedOrg || !userData?.organisations) return false;
    const orgs = userData.organisations;
    if (Array.isArray(orgs)) {
      return orgs.includes(selectedOrg.id);
    }
    return !!orgs[selectedOrg.id];
  }, [selectedOrg, userData?.organisations]);

  useEffect(() => {
    if (searchTerm.length >= 3 && !selectedOrg) {
      const delayDebounceFn = setTimeout(() => {
        dispatch(searchOrganisations(searchTerm))
          .unwrap()
          .then((results) => {
            setSearchResults(results);
          });
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else if (searchResults.length > 0) {
      // Use setTimeout 0 to avoid setState in render cycle warning
      const timer = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, dispatch, selectedOrg, searchResults.length]);

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
                  <span className={wizardStyles.orgName}>{org.name}</span>
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
          {isAlreadyMember ? (
            <div className={wizardStyles.alreadyMemberNotice}>
              <Check size={18} style={{ marginRight: 8 }} />
              {t('onboarding.alreadyMember')}
            </div>
          ) : (
            <Button 
              className={wizardStyles.fullWidthBtn}
              onClick={() => onJoin(selectedOrg)}
            >
              {t('onboarding.requestAccess')} <ArrowRight size={18} style={{ marginLeft: 8 }} />
            </Button>
          )}
        </div>
      )}
    </>
  );
};

export default JoinOrgStep;

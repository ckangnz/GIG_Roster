import { useState, useEffect } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../../components/common/Button";
import { InputField } from "../../../components/common/InputField";
import { useAppDispatch } from "../../../hooks/redux";
import { Organisation } from "../../../model/model";
import { searchOrganisations } from "../../../store/slices/authSlice";
import wizardStyles from "../onboarding-wizard.module.css";

interface JoinOrgStepProps {
  onJoin: (org: Organisation) => void;
  selectedOrg: Organisation | null;
  onSelectOrg: (org: Organisation | null) => void;
}

const JoinOrgStep = ({ onJoin, selectedOrg, onSelectOrg }: JoinOrgStepProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Organisation[]>([]);

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
          <Button 
            className={wizardStyles.fullWidthBtn}
            onClick={() => onJoin(selectedOrg)}
          >
            {t('onboarding.requestAccess')} <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </Button>
        </div>
      )}
    </>
  );
};

export default JoinOrgStep;

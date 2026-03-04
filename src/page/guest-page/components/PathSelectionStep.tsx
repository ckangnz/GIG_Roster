import { Search, PlusCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import wizardStyles from "../onboarding-wizard.module.css";

interface PathSelectionStepProps {
  onJoinClick: () => void;
  onCreateClick: () => void;
}

const PathSelectionStep = ({
  onJoinClick,
  onCreateClick,
}: PathSelectionStepProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className={wizardStyles.stepHeader}>
        <h3 className={wizardStyles.stepTitle}>{t("onboarding.pathTitle")}</h3>
        <p className={wizardStyles.stepDescription}>
          {t("onboarding.pathDesc")}
        </p>
      </div>

      <div className={wizardStyles.choiceContainer}>
        <button className={wizardStyles.choiceCard} onClick={onJoinClick}>
          <div className={wizardStyles.choiceTitle}>
            <Search size={20} /> {t("onboarding.joinTitle")}
          </div>
          <p className={wizardStyles.choiceSubtitle}>
            {t("onboarding.joinDesc")}
          </p>
        </button>

        <button className={wizardStyles.choiceCard} onClick={onCreateClick}>
          <div className={wizardStyles.choiceTitle}>
            <PlusCircle size={20} /> {t("onboarding.createTitle")}
          </div>
          <p className={wizardStyles.choiceSubtitle}>
            {t("onboarding.createDesc")}
          </p>
        </button>
      </div>
    </>
  );
};

export default PathSelectionStep;

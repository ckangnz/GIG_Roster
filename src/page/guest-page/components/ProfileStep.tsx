import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../../components/common/Button";
import { InputField } from "../../../components/common/InputField";
import Pill, { PillGroup } from "../../../components/common/Pill";
import styles from "../guest-page.module.css";
import wizardStyles from "../onboarding-wizard.module.css";

interface ProfileStepProps {
  profile: {
    name: string;
    gender: string;
    preferredLanguage: string;
  };
  onProfileChange: (updates: Partial<ProfileStepProps['profile']>) => void;
  onContinue: () => void;
}

const ProfileStep = ({ profile, onProfileChange, onContinue }: ProfileStepProps) => {
  const { t, i18n } = useTranslation();

  const isNameValid = !!profile.name.trim();

  const handleLanguageChange = (lang: string) => {
    onProfileChange({ preferredLanguage: lang });
    i18n.changeLanguage(lang);
  };

  return (
    <>
      <div className={wizardStyles.stepHeader}>
        <h3 className={wizardStyles.stepTitle}>{t('onboarding.profileTitle')}</h3>
        <p className={wizardStyles.stepDescription}>{t('onboarding.profileDesc')}</p>
      </div>

      <div className={wizardStyles.form}>
        <InputField
          label={t('settings.name')}
          placeholder={t('settings.name')}
          value={profile.name}
          onChange={(e) => onProfileChange({ name: e.target.value })}
          error={profile.name !== undefined && !isNameValid}
          errorText={t('settings.nameRequired')}
          required
          aria-required="true"
        />

        <div className={styles.formGroup}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
            {t('settings.gender')}
          </label>
          <PillGroup>
            {[
              { label: t('settings.male'), value: "Male", colour: "var(--color-male)" },
              { label: t('settings.female'), value: "Female", colour: "var(--color-female)" },
              { label: t('settings.undefined'), value: "Undefined", colour: "var(--color-text-dim)" },
            ].map((g) => (
              <Pill
                key={g.value}
                colour={g.colour}
                onClick={() => onProfileChange({ gender: g.value })}
                isActive={profile.gender === g.value}
              >
                {g.label}
              </Pill>
            ))}
          </PillGroup>
        </div>

        <div className={styles.formGroup}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
            {t('settings.language')}
          </label>
          <PillGroup>
            {[
              { label: t('settings.english'), value: "en-NZ" },
              { label: t('settings.korean'), value: "ko" },
            ].map((l) => (
              <Pill
                key={l.value}
                onClick={() => handleLanguageChange(l.value)}
                isActive={profile.preferredLanguage === l.value}
              >
                {l.label}
              </Pill>
            ))}
          </PillGroup>
        </div>

        <div className={wizardStyles.wizardActions}>
          <Button 
            className={wizardStyles.fullWidthBtn}
            disabled={!isNameValid || !profile.gender}
            onClick={onContinue}
          >
            {t('onboarding.continue')} <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </Button>
        </div>
      </div>
    </>
  );
};

export default ProfileStep;

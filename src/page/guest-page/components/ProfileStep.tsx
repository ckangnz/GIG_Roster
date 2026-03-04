import { ArrowRight, Smile } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../../components/common/Button";
import { InputField } from "../../../components/common/InputField";
import Pill, { PillGroup } from "../../../components/common/Pill";
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

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return null;
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProfileStep = ({ profile, onProfileChange, onContinue }: ProfileStepProps) => {
  const { t, i18n } = useTranslation();

  const isNameValid = !!profile.name.trim();
  const initials = getInitials(profile.name);

  const handleLanguageChange = (lang: string) => {
    onProfileChange({ preferredLanguage: lang });
    i18n.changeLanguage(lang);
  };

  return (
    <>
      {/* Hero section */}
      <div className={wizardStyles.profileHero}>
        <div className={`${wizardStyles.profileAvatar} ${!initials ? wizardStyles.profileAvatarPlaceholder : ""}`}>
          {initials ?? <Smile size={32} />}
        </div>
        <h2 className={wizardStyles.profileHeroTitle}>
          {isNameValid ? `${t('onboarding.heyName', { name: profile.name.trim().split(' ')[0] })} 👋` : t('onboarding.profileTitle')}
        </h2>
        <p className={wizardStyles.profileHeroSubtitle}>{t('onboarding.profileDesc')}</p>
      </div>

      {/* Form fields */}
      <div className={wizardStyles.wizardBody}>
        <div className={wizardStyles.form}>
          <InputField
            label={t('settings.name')}
            placeholder={t('onboarding.namePlaceholder')}
            value={profile.name}
            onChange={(e) => onProfileChange({ name: e.target.value })}
            error={profile.name !== "" && !isNameValid}
            errorText={t('settings.nameRequired')}
            required
            aria-required="true"
            autoFocus
          />

          <div className={wizardStyles.fieldGroup}>
            <label className={wizardStyles.fieldLabel}>{t('settings.gender')}</label>
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

          <div className={wizardStyles.fieldGroup}>
            <label className={wizardStyles.fieldLabel}>{t('settings.language')}</label>
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
              {t('onboarding.continue')} <ArrowRight size={18} className={wizardStyles.btnIcon} />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileStep;

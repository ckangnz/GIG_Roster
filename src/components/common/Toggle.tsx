import styles from "./toggle.module.css";


interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle = ({ label, checked, onChange, disabled = false }: ToggleProps) => {
  return (
    <div className={`${styles.toggleContainer} ${disabled ? styles.disabled : ""}`}>
      {label && <span className={styles.label}>{label}</span>}
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className={styles.slider}></span>
      </label>
    </div>
  );
};

export default Toggle;

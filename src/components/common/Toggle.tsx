import styles from "./toggle.module.css";


interface ToggleProps {
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const Toggle = ({ isOn, onToggle, disabled, label }: ToggleProps) => {
  return (
    <div
      className={`${styles.toggleContainer} ${isOn ? styles.on : ""} ${disabled ? styles.disabled : ""}`}
      onClick={() => !disabled && onToggle(!isOn)}
      title={label}
    >
      <div className={styles.toggleTrack}>
        <div className={styles.toggleThumb} />
      </div>
    </div>
  );
};

export default Toggle;

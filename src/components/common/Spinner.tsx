import styles from './spinner.module.css';

interface SpinnerProps {
  container?: boolean;
}

const Spinner = ({ container = true }: SpinnerProps) => {
  const spinner = <div className={styles.spinner} />;

  if (container) {
    return <div className={styles.spinnerContainer}>{spinner}</div>;
  }

  return spinner;
};

export default Spinner;

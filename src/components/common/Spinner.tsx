import './spinner.css';

interface SpinnerProps {
  container?: boolean;
}

const Spinner = ({ container = true }: SpinnerProps) => {
  const spinner = <div className="spinner" />;

  if (container) {
    return <div className="spinner-container">{spinner}</div>;
  }

  return spinner;
};

export default Spinner;

import Spinner from "../../components/common/Spinner";

import styles from "./loading-page.module.css";

const LoadingPage = () => (
  <div className={styles.loadingContainer}>
    <Spinner container={false} />
  </div>
);

export default LoadingPage;

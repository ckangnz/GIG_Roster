import Spinner from '../../components/common/Spinner';
import './loading-page.css';

const LoadingPage = () => (
  <div className="loading-container">
    <Spinner container={false} />
  </div>
);

export default LoadingPage;

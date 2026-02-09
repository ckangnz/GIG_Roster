import RosterPage from './RosterPage';
import { useAppSelector } from '../../hooks/redux';

const RosterPageWrapper = () => {
  const firebaseUser = useAppSelector((state) => state.auth.firebaseUser);

  if (!firebaseUser) {
    return null;
  }

  return (
    <RosterPage
      uid={firebaseUser.uid}
      activePosition={null}
      activeTeamName={null}
    />
  );
};

export default RosterPageWrapper;

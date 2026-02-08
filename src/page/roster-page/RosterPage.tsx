import RosterTable from "../../components/common/RosterTable";
import { AppUser } from "../../model/model";

interface RosterPageProps {
  userData: AppUser;
  uid: string;
  activePosition: string | null;
}

const RosterPage = ({ activePosition }: RosterPageProps) => {
  return (
    <div className="roster-page">
      <RosterTable activePosition={activePosition} />
    </div>
  );
};

export default RosterPage;

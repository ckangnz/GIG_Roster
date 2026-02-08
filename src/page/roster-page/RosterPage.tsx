import RosterTable from "../../components/roster/RosterTable";

interface RosterPageProps {
  uid: string;
  activePosition: string | null;
  activeTeamName: string | null;
}

const RosterPage = ({ activePosition, activeTeamName }: RosterPageProps) => {
  return (
    <div className="roster-page">
      <RosterTable activePosition={activePosition} teamName={activeTeamName} />
    </div>
  );
};

export default RosterPage;

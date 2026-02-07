import "./roster-table.css";

interface RosterTableProps {
  activePosition: string | null;
}

const RosterTable = ({ activePosition }: RosterTableProps) => {
  return (
    <div className="table-placeholder">
      Grid for {activePosition || "All Positions"}...
    </div>
  );
};

export default RosterTable;

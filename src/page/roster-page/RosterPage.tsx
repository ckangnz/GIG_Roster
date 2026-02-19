import { useParams } from "react-router-dom";

import AbsenceRosterTable from "../../components/roster/AbsenceRoster/AbsenceRosterTable";
import AllRosterTable from "../../components/roster/AllRoster/AllRosterTable";
import CustomRosterTable from "../../components/roster/CustomRoster/CustomRosterTable";
import GeneralRosterTable from "../../components/roster/GeneralRoster/GeneralRosterTable";
import { useAppSelector } from "../../hooks/redux";

import styles from "./roster-page.module.css";

const RosterPage = () => {
  const { positionName } = useParams();
  const { positions } = useAppSelector((state) => state.positions);

  const currentPosition = positions.find((p) => p.name === positionName);

  const renderRoster = () => {
    if (positionName === "All") return <AllRosterTable />;
    if (positionName === "Absence") return <AbsenceRosterTable />;
    if (currentPosition?.isCustom) return <CustomRosterTable />;
    return <GeneralRosterTable />;
  };

  return (
    <div className={styles.rosterPage}>
      {renderRoster()}
    </div>
  );
};

export default RosterPage;

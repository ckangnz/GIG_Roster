import RosterTable from "../../components/roster/RosterTable";

import styles from "./roster-page.module.css";

const RosterPage = () => {
  return (
    <div className={styles.rosterPage}>
      <RosterTable />
    </div>
  );
};

export default RosterPage;

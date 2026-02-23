import { useState, useMemo, useEffect } from "react";

import { collection, query, where, onSnapshot } from "firebase/firestore";

import ThoughtWheel from "./ThoughtWheel";
import { SelectField } from "../../components/common/InputField";
import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppSelector, useAppDispatch } from "../../hooks/redux";
import { Thought, AppUser } from "../../model/model";
import { 
  setThoughts, 
  syncHeartRemote, 
  applyOptimisticHeart 
} from "../../store/slices/thoughtsSlice";
import { showAlert } from "../../store/slices/uiSlice";

import styles from "./thoughts-page.module.css";

const ThoughtsPage = () => {
  const dispatch = useAppDispatch();
  const { userData } = useAppSelector((state) => state.auth);
  const { loading: teamsLoading } = useAppSelector((state) => state.teams);
  const { allUsers } = useAppSelector((state) => state.userManagement);
  const { thoughts } = useAppSelector((state) => state.thoughts);

  const [selectedTeam, setSelectedTeam] = useState<string>(
    userData?.teams?.[0] || ""
  );
  const [focusedUser, setFocusedUser] = useState<AppUser | null>(null);

  const handleHeart = (thoughtId: string) => {
    if (!userData?.id) return;
    
    const thought = thoughts[thoughtId];
    if (!thought) return;

    // Check once per day constraint
    const lastHeart = thought.hearts?.[userData.id];
    if (lastHeart) {
      const today = new Date().setHours(0, 0, 0, 0);
      const lastHeartDate = new Date(lastHeart).setHours(0, 0, 0, 0);
      if (today === lastHeartDate) {
        dispatch(showAlert({
          title: "Already Hearted",
          message: "You can only heart a thought once per day!",
          showCancel: false
        }));
        return;
      }
    }

    dispatch(applyOptimisticHeart({ thoughtId, userUid: userData.id }));
    dispatch(syncHeartRemote({ thoughtId, userUid: userData.id }));
  };

  // Sync selectedTeam if it's empty but userData exists
  useEffect(() => {
    if (userData?.teams?.length && !selectedTeam) {
      const timer = setTimeout(() => {
        setSelectedTeam(userData.teams[0]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [userData, selectedTeam]);

  // Real-time thoughts listener
  useEffect(() => {
    if (!selectedTeam) return;

    const q = query(collection(db, "thoughts"), where("teamName", "==", selectedTeam));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const thoughtsMap: Record<string, Thought> = {};
      snapshot.forEach((doc) => {
        thoughtsMap[doc.id] = doc.data() as Thought;
      });
      dispatch(setThoughts(thoughtsMap));
    });

    return () => unsubscribe();
  }, [selectedTeam, dispatch]);

  const teamUsers = useMemo(() => {
    if (!selectedTeam) return [];
    return allUsers.filter(u => u.teams?.includes(selectedTeam) && u.isActive);
  }, [allUsers, selectedTeam]);

  if (teamsLoading) return <Spinner />;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.teamSwitcher}>
          <SelectField
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            {userData?.teams?.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className={styles.wheelWrapper}>
        {teamUsers.length > 0 ? (
          <ThoughtWheel 
            users={teamUsers} 
            currentUserEmail={userData?.email || null} 
            thoughts={thoughts}
            selectedTeam={selectedTeam}
            onUserFocus={setFocusedUser}
            onHeart={handleHeart}
          />
        ) : (
          <p className={styles.noUsers}>No users found in this team.</p>
        )}
      </div>

      <div className={styles.focusedUserInfo}>
        {focusedUser && (
          <div className={styles.focusLabel}>
            Viewing <strong>{focusedUser.name}</strong>'s thoughts
          </div>
        )}
      </div>
    </div>
  );
};

export default ThoughtsPage;


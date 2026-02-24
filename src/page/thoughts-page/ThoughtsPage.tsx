import { useState, useMemo, useEffect } from "react";

import { collection, query, where, onSnapshot } from "firebase/firestore";

import ThoughtWheel from "./ThoughtWheel";
import ActionSheet from "../../components/common/ActionSheet";
import Button from "../../components/common/Button";
import { SelectField, TextAreaField } from "../../components/common/InputField";
import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppSelector, useAppDispatch } from "../../hooks/redux";
import { Thought, AppUser } from "../../model/model";
import { 
  setThoughts, 
  syncHeartRemote, 
  removeHeartRemote,
  applyOptimisticHeart,
  applyOptimisticRemoveHeart,
  syncThoughtRemote,
  removeThoughtRemote,
  applyOptimisticThought,
  applyOptimisticRemove
} from "../../store/slices/thoughtsSlice";
import { showAlert } from "../../store/slices/uiSlice";

import styles from "./thoughts-page.module.css";

const ThoughtsPage = () => {
  const dispatch = useAppDispatch();
  const { userData, firebaseUser } = useAppSelector((state) => state.auth);
  const { loading: teamsLoading } = useAppSelector((state) => state.teams);
  const { allUsers } = useAppSelector((state) => state.userManagement);
  const { thoughts } = useAppSelector((state) => state.thoughts);

  const [selectedTeam, setSelectedTeam] = useState<string>(
    userData?.teams?.[0] || ""
  );
  const [focusedUser, setFocusedUser] = useState<AppUser | null>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [inputText, setInputText] = useState("");

  const myThoughtId = `${firebaseUser?.uid}_${selectedTeam}`;
  const myThought = thoughts[myThoughtId];

  // Focused user's thought
  const focusedThoughtId = focusedUser ? `${focusedUser.id}_${selectedTeam}` : "";
  const focusedThought = thoughts[focusedThoughtId];

  const isMyProfileFocused = focusedUser?.id === firebaseUser?.uid;

  const handleOpenInput = () => {
    // If admin is focused on someone else, open that person's thought for editing
    if (!isMyProfileFocused && userData?.isAdmin) {
      setInputText(focusedThought?.text || "");
    } else {
      setInputText(myThought?.text || "");
    }
    setIsInputOpen(true);
  };

  const handleSaveThought = () => {
    if (!selectedTeam || !inputText.trim()) return;

    // Determine whose thought we are saving
    let targetUid = firebaseUser?.uid;
    let targetName = userData?.name || "Anonymous";
    let targetId = myThoughtId;
    let existingHearts = myThought?.hearts || {};

    // Admin editing someone else
    if (userData?.isAdmin && !isMyProfileFocused && focusedUser) {
      targetUid = focusedUser.id || "";
      targetName = focusedUser.name || "Anonymous";
      targetId = focusedThoughtId;
      existingHearts = focusedThought?.hearts || {};
    }

    if (!targetUid) return;

    // Basic script injection prevention (strip html tags)
    const sanitizedText = inputText.trim().replace(/<[^>]*>?/gm, "");

    const payload = {
      userUid: targetUid,
      teamName: selectedTeam,
      userName: targetName,
      text: sanitizedText,
    };

    dispatch(applyOptimisticThought({
      id: targetId,
      ...payload,
      updatedAt: Date.now(),
      hearts: existingHearts,
    }));

    dispatch(syncThoughtRemote(payload))
      .unwrap()
      .then(() => console.log("Thought saved successfully"))
      .catch((err) => console.error("Failed to save thought:", err));
      
    setIsInputOpen(false);
  };

  const handleDeleteThought = (idToDelete: string = myThoughtId) => {
    const isEditingSelf = idToDelete === myThoughtId;
    const thoughtToClear = thoughts[idToDelete];
    const targetName = isEditingSelf ? "your" : `${thoughtToClear?.userName || "this user"}'s`;

    dispatch(showAlert({
      title: "Clear Thought",
      message: `Are you sure you want to clear ${targetName} thought? This will permanently remove the message and all ${thoughtToClear?.hearts ? Object.keys(thoughtToClear.hearts).length : 0} likes received for it.`,
      confirmText: "Clear",
      onConfirm: () => {
        dispatch(applyOptimisticRemove({ id: idToDelete }));
        dispatch(removeThoughtRemote({ id: idToDelete }));
        setIsInputOpen(false);
      }
    }));
  };

  const handleHeart = (thoughtId: string) => {
    if (!firebaseUser?.uid) return;
    
    const thought = thoughts[thoughtId];
    if (!thought) return;

    const hasHearted = !!thought.hearts?.[firebaseUser.uid];

    if (hasHearted) {
      dispatch(applyOptimisticRemoveHeart({ thoughtId, userUid: firebaseUser.uid }));
      dispatch(removeHeartRemote({ thoughtId, userUid: firebaseUser.uid }));
    } else {
      dispatch(applyOptimisticHeart({ thoughtId, userUid: firebaseUser.uid }));
      dispatch(syncHeartRemote({ thoughtId, userUid: firebaseUser.uid }));
    }
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
        const data = doc.data();
        const updatedAt = data.updatedAt;
        const serializableData = {
          ...data,
          updatedAt:
            updatedAt && typeof updatedAt === "object" && "toMillis" in updatedAt
              ? (updatedAt as { toMillis: () => number }).toMillis()
              : (updatedAt as number | undefined),
        };
        thoughtsMap[doc.id] = serializableData as Thought;
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
    <>
      <div className={styles.container}>
        {userData?.teams && userData.teams.length > 1 && (
          <div className={styles.header}>
            <div className={styles.teamSwitcher}>
              <SelectField
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                {userData.teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        )}

        <div className={styles.wheelWrapper}>
          <div className={styles.bgDescription}>
            <ol>
              <li>Share what's on your mind</li>
              <li>Tap to read, double-tap to love</li>
              <li>Clear your thought to start fresh</li>
            </ol>
          </div>
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
      <div className={styles.footer}>
        <Button 
          onClick={handleOpenInput} 
          className={styles.shareBtn}
          variant={(!isMyProfileFocused && userData?.isAdmin) ? "secondary" : "primary"}
        >
          {(!isMyProfileFocused && userData?.isAdmin)
            ? (focusedThought ? `Moderate ${focusedUser?.name}'s thought` : `Share for ${focusedUser?.name}`)
            : (myThought ? "Edit my thought" : "Share a thought")
          }
        </Button>
      </div>
    </div>

    <ActionSheet
      isOpen={isInputOpen}
      onClose={() => setIsInputOpen(false)}
      title={
        (!isMyProfileFocused && userData?.isAdmin)
          ? `Acting on behalf of ${focusedUser?.name}`
          : (myThought ? "Edit My Thought" : "Share a Thought")
      }
    >
        <div className={styles.inputContainer}>
          <TextAreaField
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="What's on your mind?"
            autoFocus
            aria-label="Your thought"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                handleSaveThought();
              }
            }}
          />
          <div className={styles.inputActions}>
            {((isMyProfileFocused && myThought) || (!isMyProfileFocused && userData?.isAdmin && focusedThought)) && (
              <Button variant="delete" onClick={() => handleDeleteThought(isMyProfileFocused ? myThoughtId : focusedThoughtId)}>
                Clear
              </Button>
            )}
            <Button
              onClick={handleSaveThought}
              disabled={!inputText.trim()}
              className={styles.saveBtn}
            >
              Save Thought
            </Button>
          </div>
        </div>
      </ActionSheet>
    </>
  );
};

export default ThoughtsPage;


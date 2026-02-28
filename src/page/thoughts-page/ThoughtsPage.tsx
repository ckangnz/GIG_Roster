import { useState, useMemo, useEffect, useCallback } from "react";

import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { ThoughtExpiry } from "./ThoughtExpiry";
import ThoughtWheel from "./ThoughtWheel";
import ActionSheet from "../../components/common/ActionSheet";
import Button from "../../components/common/Button";
import { TextAreaField } from "../../components/common/InputField";
import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppSelector, useAppDispatch } from "../../hooks/redux";
import { Thought, AppUser, ThoughtEntry } from "../../model/model";
import {
  setThoughts,
  syncThoughtEntriesRemote,
  removeThoughtRemote,
  applyOptimisticThoughts,
  applyOptimisticRemove,
  syncHeartEntryRemote,
} from "../../store/slices/thoughtsSlice";
import { showAlert } from "../../store/slices/uiSlice";

import styles from "./thoughts-page.module.css";

const formatRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const safeDecode = (str: string | undefined) => {
  if (!str) return "";
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

const ThoughtsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { teamName: rawTeamName } = useParams();
  const teamNameFromUrl = safeDecode(rawTeamName).trim();

  const { userData, firebaseUser } = useAppSelector((state) => state.auth);
  const { teams: allTeams, loading: teamsLoading } = useAppSelector((state) => state.teams);
  const { allUsers } = useAppSelector((state) => state.userManagement);
  const { thoughts } = useAppSelector((state) => state.thoughts);

  // Resolve UUID for data fetching
  const teamId = useMemo(() => {
    const found = allTeams.find(t => t.id === teamNameFromUrl || t.name === teamNameFromUrl);
    return found?.id || teamNameFromUrl || userData?.teams?.[0] || "";
  }, [allTeams, teamNameFromUrl, userData?.teams]);

  const [focusedUser, setFocusedUser] = useState<AppUser | null>(null);
  const [managementUser, setManagementUser] = useState<AppUser | null>(null);

  // UI State
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");

  const [likerList, setLikerList] = useState<
    { name: string; time: string }[] | null
  >(null);

  // Auto-navigate to first team if none in URL
  useEffect(() => {
    if (!teamNameFromUrl && userData?.teams?.[0]) {
      const firstTeamId = userData.teams[0];
      const firstTeam = allTeams.find(t => t.id === firstTeamId || t.name === firstTeamId);
      if (firstTeam) {
        navigate(`/app/thoughts/${firstTeam.id}`, { replace: true });
      }
    }
  }, [teamNameFromUrl, userData, navigate, allTeams]);

  const focusedThoughtId = focusedUser
    ? `${focusedUser.id}_${teamId}`
    : "";
  const focusedThought = thoughts[focusedThoughtId];

  const myThoughtId = firebaseUser ? `${firebaseUser.uid}_${teamId}` : "";
  const myThought = thoughts[myThoughtId];

  const targetThought = managementUser
    ? thoughts[`${managementUser.id}_${teamId}`]
    : null;

  const handleOpenManagement = () => {
    if (userData?.isAdmin) {
      setManagementUser(focusedUser);
    } else {
      const me = allUsers.find((u) => u.id === firebaseUser?.uid);
      setManagementUser(me || null);
    }
    setIsManagementOpen(true);
  };

  const handleOpenEditor = (entryId: string | null = null) => {
    setIsManagementOpen(false);
    if (entryId) {
      const entry = targetThought?.entries?.find((e) => e.id === entryId);
      setInputText(entry?.text || "");
      setEditingEntryId(entryId);
    } else {
      setInputText("");
      setEditingEntryId(null);
    }
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingEntryId(null);
    if (targetThought?.entries?.length) {
      setIsManagementOpen(true);
    }
  };

  const handleSaveThought = () => {
    if (!teamId || !inputText.trim() || !managementUser) return;

    const sanitizedText = inputText.trim().replace(/<[^>]*>?/gm, "");
    const currentEntries = [...(targetThought?.entries || [])];

    if (editingEntryId) {
      const index = currentEntries.findIndex((e) => e.id === editingEntryId);
      if (index >= 0) {
        currentEntries[index] = {
          ...currentEntries[index],
          text: sanitizedText,
          updatedAt: Date.now(),
        };
      }
    } else {
      if (currentEntries.length >= 5) {
        dispatch(
          showAlert({
            title: "Limit Reached",
            message: "You can only have up to 5 thoughts at a time.",
            showCancel: false,
          }),
        );
        return;
      }
      currentEntries.push({
        id: Math.random().toString(36).substring(2, 10),
        text: sanitizedText,
        hearts: {},
        updatedAt: Date.now(),
      });
    }

    const payload = {
      userUid: managementUser.id!,
      teamName: teamId, // Store as UUID
      userName: managementUser.name || "Anonymous",
      entries: currentEntries,
    };

    const id = `${payload.userUid}_${teamId}`;
    dispatch(applyOptimisticThoughts({ id, entries: currentEntries }));
    dispatch(syncThoughtEntriesRemote(payload));

    setIsEditorOpen(false);
    setEditingEntryId(null);
    setIsManagementOpen(true);
  };

  const handleClearEntry = (entryId: string) => {
    if (!targetThought || !managementUser) return;

    dispatch(
      showAlert({
        title: "Clear Thought",
        message:
          "Are you sure you want to clear this thought? This will permanently remove the message and all likes received for it.",
        confirmText: "Clear",
        onConfirm: () => {
          const updatedEntries =
            targetThought.entries?.filter((e) => e.id !== entryId) || [];

          if (updatedEntries.length === 0) {
            dispatch(applyOptimisticRemove({ id: targetThought.id }));
            dispatch(removeThoughtRemote({ id: targetThought.id }));
            setIsManagementOpen(false);
          } else {
            const payload = {
              userUid: targetThought.userUid,
              teamName: teamId,
              userName: targetThought.userName,
              entries: updatedEntries,
            };
            dispatch(
              applyOptimisticThoughts({
                id: targetThought.id,
                entries: updatedEntries,
              }),
            );
            dispatch(syncThoughtEntriesRemote(payload));
          }
          setIsEditorOpen(false);
        },
      }),
    );
  };

  const handleHeart = useCallback(
    (entryId: string) => {
      if (!firebaseUser?.uid || !focusedThought) return;

      const entryIndex = focusedThought.entries?.findIndex(
        (e) => e.id === entryId,
      );
      if (entryIndex === undefined || entryIndex < 0) return;

      const updatedEntries = JSON.parse(
        JSON.stringify(focusedThought.entries),
      ) as ThoughtEntry[];
      const entry = updatedEntries[entryIndex];

      if (entry.hearts[firebaseUser.uid]) {
        delete entry.hearts[firebaseUser.uid];
      } else {
        entry.hearts[firebaseUser.uid] = Date.now();
      }

      dispatch(
        applyOptimisticThoughts({
          id: focusedThought.id,
          entries: updatedEntries,
        }),
      );
      dispatch(
        syncHeartEntryRemote({
          thoughtId: focusedThought.id,
          entryId,
          userUid: firebaseUser.uid,
          updatedEntries,
        }),
      );
    },
    [firebaseUser, focusedThought, dispatch],
  );

  const handleShowLikers = useCallback(
    (hearts: Record<string, number>) => {
      const list = Object.entries(hearts).map(([uid, timestamp]) => {
        const user = allUsers.find((u) => u.id === uid);
        return {
          name: user?.name || "Unknown User",
          time: formatRelativeTime(timestamp),
          timestamp,
        };
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      setLikerList(list.map((l) => ({ name: l.name, time: l.time })));
    },
    [allUsers],
  );

  // Real-time thoughts listener (Query by UUID and Org scope)
  useEffect(() => {
    const orgId = userData?.orgId;
    if (!teamId || !orgId) return;

    const q = query(
      collection(db, "organisations", orgId, "thoughts"),
      where("teamName", "==", teamId),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const thoughtsMap: Record<string, Thought> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const updatedAt = data.updatedAt;
        const serializableData = {
          ...data,
          updatedAt:
            updatedAt &&
            typeof updatedAt === "object" &&
            "toMillis" in updatedAt
              ? (updatedAt as { toMillis: () => number }).toMillis()
              : (updatedAt as number | undefined),
        };
        thoughtsMap[doc.id] = { ...serializableData, id: doc.id } as Thought;
      });
      dispatch(setThoughts(thoughtsMap));
    });

    return () => unsubscribe();
  }, [teamId, dispatch, userData?.orgId]);

  const teamUsers = useMemo(() => {
    const orgId = userData?.orgId;
    if (!teamId || !orgId) return [];
    return allUsers.filter(
      (u) => u.teams?.includes(teamId) && u.isActive && u.orgId === orgId,
    );
  }, [allUsers, teamId, userData?.orgId]);

  if (teamsLoading) return <Spinner />;

  const isMyProfileFocused = focusedUser?.id === firebaseUser?.uid;
  const showAdminControls = userData?.isAdmin && !isMyProfileFocused;

  const displayTeamName = allTeams.find(t => t.id === teamId || t.name === teamId)?.name || teamId;
  const displayTitle = teamId
    ? `Thoughts • ${displayTeamName}`
    : "Team Thoughts";

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>{displayTitle}</h1>
        </div>

        <div className={styles.wheelWrapper}>
          {teamUsers.length > 0 ? (
            <ThoughtWheel
              users={teamUsers}
              currentUserEmail={userData?.email || null}
              currentUserId={firebaseUser?.uid}
              thoughts={thoughts}
              selectedTeam={teamId}
              onUserFocus={setFocusedUser}
              onHeart={handleHeart}
              onShowLikers={handleShowLikers}
            />
          ) : (
            <p className={styles.noUsers}>No users found in this team.</p>
          )}
        </div>

        <div className={styles.focusedUserInfo}>
          <div className={styles.instructions}>
            <span>Share what's on your mind</span>
            <span>Tap to read • Double-tap to love</span>
            <span style={{ color: "var(--color-text-dim)", fontSize: "0.7rem" }}>Thoughts expire in 7 days • Revive anytime</span>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            onClick={handleOpenManagement}
            className={styles.shareBtn}
            variant={showAdminControls ? "secondary" : "primary"}
          >
            {showAdminControls
              ? focusedThought
                ? `Moderate ${focusedUser?.name}'s thoughts`
                : `Share for ${focusedUser?.name}`
              : myThought?.entries?.length
                ? "Manage my thoughts"
                : "Share a thought"}
          </Button>
        </div>
      </div>

      <ActionSheet
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        title={
          managementUser?.id === firebaseUser?.uid
            ? "My Thoughts"
            : `Acting on behalf of ${managementUser?.name}`
        }
      >
        <div className={styles.managementList}>
          {targetThought?.entries?.map((entry) => (
            <div 
              key={entry.id} 
              className={`${styles.managementItem} ${entry.isExpired ? styles.managementItemExpired : ""}`}
            >
              <div className={styles.entryContent}>
                <div className={styles.entryText}>{entry.text}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <ThoughtExpiry
                    updatedAt={entry.updatedAt}
                    className={styles.expiryLabel}
                  />
                  {entry.isExpired && (
                    <span className={styles.expiredBadge}>Need revival</span>
                  )}
                </div>
              </div>
              <div className={styles.entryActions}>
                <Button
                  variant="secondary"
                  size="small"
                  isIcon
                  onClick={() => handleOpenEditor(entry.id)}
                >
                  <Edit2 size={14} />
                </Button>
                <Button
                  variant="delete"
                  size="small"
                  isIcon
                  onClick={() => handleClearEntry(entry.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}

          {(targetThought?.entries?.length || 0) < 5 &&
            (managementUser?.id === firebaseUser?.uid || userData?.isAdmin) && (
              <Button
                onClick={() => handleOpenEditor(null)}
                className={styles.addEntryBtn}
                variant="secondary"
              >
                <Plus size={16} style={{ marginRight: 8 }} /> Add another
                thought
              </Button>
            )}

          {!targetThought?.entries?.length && (
            <p className={styles.emptyThoughts}>No thoughts shared yet.</p>
          )}
        </div>
      </ActionSheet>

      <ActionSheet
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        title={editingEntryId ? "Edit Thought" : "Add Thought"}
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

      <ActionSheet
        isOpen={!!likerList}
        onClose={() => setLikerList(null)}
        title="Liked By"
      >
        <div className={styles.likerList}>
          {likerList?.map((user, idx) => (
            <div key={idx} className={styles.likerItem}>
              <span className={styles.likerName}>{user.name}</span>
              <span className={styles.likerTime}>{user.time}</span>
            </div>
          ))}
          {likerList?.length === 0 && (
            <p className={styles.emptyThoughts}>No likes yet.</p>
          )}
        </div>
      </ActionSheet>
    </>
  );
};

export default ThoughtsPage;

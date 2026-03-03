import { useState, useMemo, useEffect, useCallback } from "react";

import { collection, query, where, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Share,
  User,
  Users,
  ArrowUpAZ,
  ArrowDownAZ,
  Heart,
  MessageSquare,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { ThoughtExpiry } from "./ThoughtExpiry";
import ThoughtWheel from "./ThoughtWheel";
import ActionSheet from "../../components/common/ActionSheet";
import Button from "../../components/common/Button";
import { TextAreaField } from "../../components/common/InputField";
import Spinner from "../../components/common/Spinner";
import { db } from "../../firebase";
import { useAppSelector, useAppDispatch } from "../../hooks/redux";
import { Thought, AppUser, ThoughtEntry, OrgMembership } from "../../model/model";
import { selectUserData } from "../../store/slices/authSlice";
import {
  setThoughts,
  syncThoughtEntriesRemote,
  removeThoughtRemote,
  applyOptimisticThoughts,
  applyOptimisticRemove,
  syncHeartEntryRemote,
} from "../../store/slices/thoughtsSlice";
import { showAlert } from "../../store/slices/uiSlice";
import { safeDecode } from "../../utils/stringUtils";

import styles from "./thoughts-page.module.css";

const ThoughtsPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { teamName: rawTeamName } = useParams();
  const teamNameFromUrl = safeDecode(rawTeamName).trim();

  const { firebaseUser } = useAppSelector((state) => state.auth);
  const userData = useAppSelector(selectUserData);
  const { teams: allTeams, loading: teamsLoading } = useAppSelector(
    (state) => state.teams,
  );
  const { allUsers } = useAppSelector((state) => state.userManagement);
  const { thoughts } = useAppSelector((state) => state.thoughts);

  // Resolve UUID for data fetching
  const teamId = useMemo(() => {
    const found = allTeams.find(
      (t) => t.id === teamNameFromUrl || t.name === teamNameFromUrl,
    );
    return found?.id || teamNameFromUrl || userData?.teams?.[0] || "";
  }, [allTeams, teamNameFromUrl, userData?.teams]);

  const [focusedUser, setFocusedUser] = useState<AppUser | null>(null);
  const [managementUser, setManagementUser] = useState<AppUser | null>(null);

  // UI State
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");

  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isEveryoneOptionsOpen, setIsEveryoneOptionsOpen] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const [likerList, setLikerList] = useState<
    { name: string; time: string }[] | null
  >(null);

  // Auto-navigate to first team if none in URL
  useEffect(() => {
    if (!teamNameFromUrl && userData?.teams?.[0]) {
      const firstTeamId = userData.teams[0];
      const firstTeam = allTeams.find(
        (t) => t.id === firstTeamId || t.name === firstTeamId,
      );
      if (firstTeam) {
        navigate(`/app/thoughts/${firstTeam.id}`, { replace: true });
      }
    }
  }, [teamNameFromUrl, userData, navigate, allTeams]);

  const focusedThoughtId = focusedUser ? `${focusedUser.id}_${teamId}` : "";
  const focusedThought = thoughts[focusedThoughtId];

  const myThoughtId = firebaseUser ? `${firebaseUser.uid}_${teamId}` : "";
  const myThought = thoughts[myThoughtId];

  const targetThought = managementUser
    ? thoughts[`${managementUser.id}_${teamId}`]
    : null;

  const formatRelativeTimeLocal = useCallback(
    (timestamp: number) => {
      const diff = Date.now() - timestamp;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60)
        return t("common.justNow", { defaultValue: "just now" });
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    },
    [t],
  );

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
          time: formatRelativeTimeLocal(timestamp),
          timestamp,
        };
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      setLikerList(list.map((l) => ({ name: l.name, time: l.time })));
    },
    [allUsers, formatRelativeTimeLocal],
  );

  const handleShareMyThoughts = () => {
    if (!myThought?.entries?.length) return;

    const totalLikes = myThought.entries.reduce(
      (sum, entry) => sum + Object.keys(entry.hearts || {}).length,
      0,
    );
    let text = `My Thoughts (Total Likes: ${totalLikes})\n`;
    myThought.entries.forEach((entry, i) => {
      text += `${i + 1}. ${entry.text} (${Object.keys(entry.hearts || {}).length} ❤️)\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
      setIsShareSheetOpen(false);
    });
  };

  type SortOption =
    | "alpha-asc"
    | "alpha-desc"
    | "likes-desc"
    | "likes-asc"
    | "thoughts-desc"
    | "thoughts-asc";

  const handleShareEveryone = (sortOption: SortOption) => {
    const teamName =
      allTeams.find((t) => t.id === teamId || t.name === teamId)?.name ||
      "Team";
    let text = `Team Thoughts: ${teamName}\n\n`;

    const usersWithThoughts = teamUsers
      .map((user) => {
        const userThought = thoughts[`${user.id}_${teamId}`];
        const entries = userThought?.entries || [];
        const totalLikes = entries.reduce(
          (sum, e) => sum + Object.keys(e.hearts || {}).length,
          0,
        );
        return { user, entries, totalLikes, count: entries.length };
      })
      .filter((u) => u.count > 0);

    usersWithThoughts.sort((a, b) => {
      switch (sortOption) {
        case "alpha-asc":
          return (a.user.name || "").localeCompare(b.user.name || "");
        case "alpha-desc":
          return (b.user.name || "").localeCompare(a.user.name || "");
        case "likes-desc":
          return (
            b.totalLikes - a.totalLikes ||
            (a.user.name || "").localeCompare(b.user.name || "")
          );
        case "likes-asc":
          return (
            a.totalLikes - b.totalLikes ||
            (a.user.name || "").localeCompare(b.user.name || "")
          );
        case "thoughts-desc":
          return (
            b.count - a.count ||
            (a.user.name || "").localeCompare(b.user.name || "")
          );
        case "thoughts-asc":
          return (
            a.count - b.count ||
            (a.user.name || "").localeCompare(b.user.name || "")
          );
        default:
          return 0;
      }
    });

    usersWithThoughts.forEach((u) => {
      text += `${u.user.name} (${u.totalLikes} ❤️)\n`;
      u.entries.forEach((entry) => {
        text += `- ${entry.text}\n`;
      });
      text += "\n";
    });

    navigator.clipboard.writeText(text).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
      setIsEveryoneOptionsOpen(false);
      setIsShareSheetOpen(false);
    });
  };

  // Real-time thoughts listener (Query by UUID and Org scope)
  useEffect(() => {
    const orgId = userData?.activeOrgId;
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
  }, [teamId, dispatch, userData?.activeOrgId]);

  const teamUsers = useMemo(() => {
    const orgId = userData?.activeOrgId;
    if (!teamId || !orgId) return [];
    return allUsers.filter(
      (u) => {
        const orgs = u.organisations as Record<string, OrgMembership>;
        const orgEntry = orgs?.[orgId];
        return orgEntry?.teams?.includes(teamId) && orgEntry?.isActive;
      }
    );
  }, [allUsers, teamId, userData?.activeOrgId]);

  if (teamsLoading) return <Spinner />;

  const isMyProfileFocused = focusedUser?.id === firebaseUser?.uid;
  const showAdminControls = userData?.isAdmin && !isMyProfileFocused;

  const displayTeamName =
    allTeams.find((t) => t.id === teamId || t.name === teamId)?.name || teamId;
  const displayTitle = teamId
    ? `${t("nav.thoughts")} • ${displayTeamName}`
    : t("thoughts.title");

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
            <span>{t("thoughts.shareAThought")}</span>
            <span>
              {t("thoughts.instructions", {
                defaultValue: "Tap to read • Double-tap to love",
              })}
            </span>
            <span
              style={{ color: "var(--color-text-dim)", fontSize: "0.7rem" }}
            >
              {t("thoughts.expiryInfo")}
            </span>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerButtons}>
            <Button
              onClick={handleOpenManagement}
              className={styles.shareBtn}
              variant={showAdminControls ? "secondary" : "primary"}
              style={{ height: "48px" }}
            >
              {showAdminControls
                ? focusedThought
                  ? `${t("thoughts.editOtherThoughts", {
                      name: focusedUser?.name,
                    })} `
                  : `${t("thoughts.manageOtherThoughts", {
                      name: focusedUser?.name,
                    })}`
                : myThought?.entries?.length
                  ? t("thoughts.manageMyThoughts")
                  : t("thoughts.shareAThought")}
            </Button>
            <Button
              variant="secondary"
              className={styles.exportIconButton}
              onClick={() => setIsShareSheetOpen(true)}
              title={t("thoughts.shareThoughts")}
              style={{ height: "48px" }}
            >
              <Share size={20} />
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCopiedToast && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
          >
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      <ActionSheet
        isOpen={isShareSheetOpen}
        onClose={() => setIsShareSheetOpen(false)}
        title={t("thoughts.shareThoughts")}
      >
        <button
          className={styles.shareOptionItem}
          onClick={handleShareMyThoughts}
          disabled={!myThought?.entries?.length}
          style={{ opacity: !myThought?.entries?.length ? 0.5 : 1 }}
        >
          <div className={styles.shareOptionText}>
            <span className={styles.shareOptionLabel}>
              {t("thoughts.shareMyThoughts")}
            </span>
            <span className={styles.shareOptionSubtext}>
              {t("thoughts.shareMyThoughtsSub")}
            </span>
          </div>
          <User className={styles.shareOptionIcon} size={20} />
        </button>

        <button
          className={styles.shareOptionItem}
          onClick={() => setIsEveryoneOptionsOpen(true)}
        >
          <div className={styles.shareOptionText}>
            <span className={styles.shareOptionLabel}>
              {t("thoughts.shareEveryonesThoughts")}
            </span>
            <span className={styles.shareOptionSubtext}>
              {t("thoughts.shareEveryonesThoughtsSub")}
            </span>
          </div>
          <Users className={styles.shareOptionIcon} size={20} />
        </button>
      </ActionSheet>

      <ActionSheet
        isOpen={isEveryoneOptionsOpen}
        onClose={() => setIsEveryoneOptionsOpen(false)}
        title={t("thoughts.exportOrder")}
      >
        <button
          className={styles.shareOptionItem}
          onClick={() => handleShareEveryone("alpha-asc")}
        >
          <div className={styles.shareOptionText}>
            <span className={styles.shareOptionLabel}>
              {t("thoughts.alphaAsc")}
            </span>
            <span className={styles.shareOptionSubtext}>
              {t("thoughts.alphaAscSub", {
                defaultValue: "Order by member name ascending",
              })}
            </span>
          </div>
          <ArrowUpAZ className={styles.shareOptionIcon} size={20} />
        </button>

        <button
          className={styles.shareOptionItem}
          onClick={() => handleShareEveryone("alpha-desc")}
        >
          <div className={styles.shareOptionText}>
            <span className={styles.shareOptionLabel}>
              {t("thoughts.alphaDesc")}
            </span>
            <span className={styles.shareOptionSubtext}>
              {t("thoughts.alphaDescSub", {
                defaultValue: "Order by member name descending",
              })}
            </span>
          </div>
          <ArrowDownAZ className={styles.shareOptionIcon} size={20} />
        </button>

        <button
          className={styles.shareOptionItem}
          onClick={() => handleShareEveryone("likes-desc")}
        >
          <div className={styles.shareOptionText}>
            <span className={styles.shareOptionLabel}>
              {t("thoughts.mostLiked")}
            </span>
            <span className={styles.shareOptionSubtext}>
              {t("thoughts.mostLikedSub", {
                defaultValue: "Order by total hearts received",
              })}
            </span>
          </div>
          <Heart className={styles.shareOptionIcon} size={20} />
        </button>

        <button
          className={styles.shareOptionItem}
          onClick={() => handleShareEveryone("likes-asc")}
        >
          <div className={styles.shareOptionText}>
            <span className={styles.shareOptionLabel}>
              {t("thoughts.leastLiked")}
            </span>
            <span className={styles.shareOptionSubtext}>
              {t("thoughts.leastLikedSub", {
                defaultValue: "Order by fewest hearts received",
              })}
            </span>
          </div>
          <Heart
            className={styles.shareOptionIcon}
            size={20}
            style={{ opacity: 0.5 }}
          />
        </button>

        <button
          className={styles.shareOptionItem}
          onClick={() => handleShareEveryone("thoughts-desc")}
        >
          <div className={styles.shareOptionText}>
            <span className={styles.shareOptionLabel}>
              {t("thoughts.mostThoughts")}
            </span>
            <span className={styles.shareOptionSubtext}>
              {t("thoughts.mostThoughtsSub", {
                defaultValue: "Members with most active thoughts first",
              })}
            </span>
          </div>
          <MessageSquare className={styles.shareOptionIcon} size={20} />
        </button>

        <button
          className={styles.shareOptionItem}
          onClick={() => handleShareEveryone("thoughts-asc")}
        >
          <div className={styles.shareOptionText}>
            <span className={styles.shareOptionLabel}>
              {t("thoughts.leastThoughts")}
            </span>
            <span className={styles.shareOptionSubtext}>
              {t("thoughts.leastThoughtsSub", {
                defaultValue: "Members with fewest active thoughts first",
              })}
            </span>
          </div>
          <MessageSquare
            className={styles.shareOptionIcon}
            size={20}
            style={{ opacity: 0.5 }}
          />
        </button>
      </ActionSheet>

      <ActionSheet
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        title={
          managementUser?.id === firebaseUser?.uid
            ? t("thoughts.myThoughts")
            : t("thoughts.otherThoughts", { name: managementUser?.name })
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
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <ThoughtExpiry
                    updatedAt={entry.updatedAt}
                    className={styles.expiryLabel}
                  />
                  {entry.isExpired && (
                    <span className={styles.expiredBadge}>
                      {t("thoughts.expired")}
                    </span>
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
                <Plus size={16} style={{ marginRight: 8 }} />{" "}
                {t("thoughts.addAnotherThought")}
              </Button>
            )}

          {!targetThought?.entries?.length && (
            <p className={styles.emptyThoughts}>{t("thoughts.noThoughts")}</p>
          )}
        </div>
      </ActionSheet>

      <ActionSheet
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        title={
          editingEntryId ? t("thoughts.editThought") : t("thoughts.addThought")
        }
      >
        <div className={styles.inputContainer}>
          <TextAreaField
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t("thoughts.shareAThought")}
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
              {t("thoughts.saveThought")}
            </Button>
          </div>
        </div>
      </ActionSheet>

      <ActionSheet
        isOpen={!!likerList}
        onClose={() => setLikerList(null)}
        title={t("thoughts.likedBy")}
      >
        <div className={styles.likerList}>
          {likerList?.map((user, idx) => (
            <div key={idx} className={styles.likerItem}>
              <span className={styles.likerName}>{user.name}</span>
              <span className={styles.likerTime}>{user.time}</span>
            </div>
          ))}
          {likerList?.length === 0 && (
            <p className={styles.emptyThoughts}>{t("thoughts.noLikes")}</p>
          )}
        </div>
      </ActionSheet>
    </>
  );
};

export default ThoughtsPage;

import { useState, useEffect, useCallback, useRef } from "react";

import {
  motion,
  useMotionValue,
  animate,
  PanInfo,
  useTransform,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";

import SpeechBubble from "./SpeechBubble";
import { AppUser, Thought, ThoughtEntry } from "../../model/model";

import styles from "./thought-wheel.module.css";

const THOUGHT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

interface ThoughtWheelProps {
  users: AppUser[];
  currentUserEmail: string | null;
  thoughts: Record<string, Thought>;
  selectedTeam: string;
  onUserFocus: (user: AppUser) => void;
  onHeart: (entryId: string) => void;
  onShowLikers: (hearts: Record<string, number>) => void;
}

const ThoughtWheel = ({
  users,
  currentUserEmail,
  thoughts,
  selectedTeam,
  onUserFocus,
  onHeart,
  onShowLikers,
}: ThoughtWheelProps) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [realTimeRotation, setRealTimeRotation] = useState(0);
  const [radius, setRadius] = useState(window.innerWidth < 768 ? 250 : 500);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const isMobile = windowWidth < 768;

  // Force re-render periodically to catch real-time expirations
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const rotation = useMotionValue(0);
  const counterRotation = useTransform(rotation, (value) => -value);

  const userCount = users.length;
  const angleStep = userCount > 0 ? 360 / userCount : 0;
  const wheelSnapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen to rotation changes in real-time
  useMotionValueEvent(rotation, "change", (latest) => {
    setRealTimeRotation(latest);

    const snappedIndex = Math.round(-latest / angleStep);
    const normIdx = ((snappedIndex % userCount) + userCount) % userCount;

    if (normIdx !== focusedIndex) {
      setFocusedIndex(normIdx);
      onUserFocus(users[normIdx]);
      setExpandedEntryId(null); // Reset expansion on wheel move
    }
  });

  // Update radius and windowWidth on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setRadius(width < 768 ? 250 : 500);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (userCount === 0) return;

    const myIndex = users.findIndex((u) => u.email === currentUserEmail);
    const targetIndex = myIndex >= 0 ? myIndex : 0;
    const targetRotation = -targetIndex * angleStep;

    rotation.stop();
    rotation.set(targetRotation);

    const timer = setTimeout(() => {
      setFocusedIndex(targetIndex);
      onUserFocus(users[targetIndex]);
    }, 0);
    return () => clearTimeout(timer);
  }, [users, currentUserEmail, userCount, angleStep, onUserFocus, rotation]);

  const snapToItem = useCallback(
    (rot: number) => {
      const snappedIndex = Math.round(-rot / angleStep);
      const finalRot = -snappedIndex * angleStep;

      animate(rotation, finalRot, {
        type: "spring",
        stiffness: 150,
        damping: 30,
      });
    },
    [angleStep, rotation],
  );

  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const currentRot = rotation.get();
      const sensitivity = (360 / (2 * Math.PI * radius)) * 1.5;
      rotation.set(currentRot + info.delta.x * sensitivity);
    },
    [rotation, radius],
  );

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const currentRot = rotation.get();
      const angularVelocity = (info.velocity.x / radius) * 25;
      const targetRot = currentRot + angularVelocity;
      snapToItem(targetRot);
    },
    [rotation, snapToItem, radius],
  );

  const handleUserClick = useCallback(
    (index: number) => {
      const currentRot = rotation.get();
      const targetRotAbsolute = -index * angleStep;

      const diff = targetRotAbsolute - currentRot;
      const shortestDiff = ((((diff + 180) % 360) + 360) % 360) - 180;
      const finalRot = currentRot + shortestDiff;

      animate(rotation, finalRot, {
        type: "spring",
        stiffness: 150,
        damping: 30,
      });
    },
    [rotation, angleStep],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaY || e.deltaX;
      const currentRot = rotation.get();
      const newRot = currentRot - delta * 0.05;
      rotation.set(newRot);

      if (wheelSnapTimerRef.current) clearTimeout(wheelSnapTimerRef.current);
      wheelSnapTimerRef.current = setTimeout(() => {
        snapToItem(rotation.get());
      }, 150);
    },
    [rotation, snapToItem],
  );

  // Enhanced cluster bubble positioning with better spread
  const getBubbleOffset = (index: number, total: number) => {
    if (total === 1) return { x: 0, y: 0 };

    const isMobile = windowWidth < 768;
    const horizontalMargin = isMobile ? 40 : 150;
    const maxAvailableWidth = windowWidth - horizontalMargin;

    // Define relative "cloud cluster" layouts for 2-5 bubbles
    const layouts: Record<number, { x: number; y: number }[]> = {
      2: [
        { x: -90, y: 0 },
        { x: 90, y: -40 },
      ],
      3: [
        { x: -130, y: 0 },
        { x: 0, y: -70 },
        { x: 130, y: 0 },
      ],
      4: [
        { x: -150, y: -20 },
        { x: 150, y: -20 },
        { x: -70, y: -90 },
        { x: 70, y: -90 },
      ],
      5: [
        { x: 0, y: 0 }, // Bottom center
        { x: -180, y: -45 }, // Mid left
        { x: 180, y: -45 }, // Mid right
        { x: -100, y: -110 }, // Top left
        { x: 100, y: -110 }, // Top right
      ],
    };

    const baseLayout = layouts[total as keyof typeof layouts] || layouts[5];
    const pos = baseLayout[index] || { x: 0, y: 0 };

    // Calculate how much horizontal space this layout needs (approx bubble width 140px)
    const totalLayoutWidth =
      Math.max(...baseLayout.map((p) => Math.abs(p.x))) * 2 + 140;
    const scale = Math.min(1, maxAvailableWidth / totalLayoutWidth);

    return {
      x: pos.x * scale,
      y: pos.y,
    };
  };

  return (
    <motion.div
      className={styles.wheelContainer}
      onWheel={handleWheel}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{ "--wheel-radius": `${radius}px` } as React.CSSProperties}
    >
      <div className={styles.centerIndicator} />
      <div className={styles.wheelWrapper}>
        <motion.div className={styles.wheel} style={{ rotate: rotation }}>
          {users.map((user, index) => {
            const angle = index * angleStep;
            const rad = (angle - 90) * (Math.PI / 180);
            const x = radius * Math.cos(rad);
            const y = radius * Math.sin(rad);

            const angularDistanceFromCenter = Math.abs(
              ((((angle + realTimeRotation + 180) % 360) + 360) % 360) - 180,
            );
            const isVisible = angularDistanceFromCenter < 10;

            const userThought = thoughts[`${user.id}_${selectedTeam}`];
            const isDraggingThisUser = userThought?.entries?.some(e => e.id === activeDragId);

            // Real-time expiration check
            // eslint-disable-next-line react-hooks/purity
            const now = Date.now();
            const activeEntries =
              userThought?.entries?.filter((e) => {
                const isExpired =
                  e.isExpired || now - e.updatedAt >= THOUGHT_EXPIRATION_MS;
                return !isExpired;
              }) || [];

            return (
              <div
                key={user.id || user.email || index}
                className={`${styles.userNode} ${index === focusedIndex ? styles.userNodeActive : ""}`}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: `translate(-50%, -50%)`,
                  zIndex: isDraggingThisUser ? 200 : (index === focusedIndex ? 100 : 5),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUserClick(index);
                }}
              >
                <motion.div style={{ rotate: counterRotation }}>
                  <AnimatePresence>
                    {isVisible &&
                      activeEntries.map((entry: ThoughtEntry, idx: number) => {
                        const offset = getBubbleOffset(
                          idx,
                          activeEntries.length,
                        );
                        const isExpanded = expandedEntryId === entry.id;

                        const targetVh = isMobile ? "30vh" : "55vh";

                        return (
                          <motion.div
                            key={entry.id}
                            whileHover={!isExpanded ? { zIndex: 2000 } : {}}
                            initial={{
                              opacity: 0,
                              scale: 0.5,
                              x: "-50%",
                              y: 50,
                            }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              x: isExpanded
                                ? "-50%"
                                : `calc(-50% + ${offset.x}px)`,
                              y: isExpanded
                                ? `calc(${radius}px - ${targetVh} + 50%)`
                                : offset.y,
                              zIndex: isExpanded 
                                ? 3000 
                                : (activeDragId === entry.id ? 2000 : 100 + idx),
                            }}
                            exit={{
                              opacity: 0,
                              scale: 0.5,
                              x: "-50%",
                              y: 50,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 100,
                              damping: 20,
                              delay: isExpanded ? idx * 0.05 : 0,
                            }}
                            style={{
                              position: "absolute",
                              bottom: "100%",
                              left: "50%",
                            }}
                          >
                            <SpeechBubble
                              entry={entry}
                              onHeart={onHeart}
                              isExpanded={isExpanded}
                              onToggleExpand={() =>
                                setExpandedEntryId(isExpanded ? null : entry.id)
                              }
                              onShowLikers={onShowLikers}
                              onDragStart={() => setActiveDragId(entry.id)}
                              onDragEnd={() => setActiveDragId(null)}
                            />
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                  <div className={styles.userName}>
                    {user.name}
                    {activeEntries.length > 0 && index !== focusedIndex && (
                      <span className={styles.hasThoughtDot} />
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ThoughtWheel;

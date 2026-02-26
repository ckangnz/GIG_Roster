import { useState, useCallback, useRef, useEffect } from "react";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

import { ThoughtExpiry } from "./ThoughtExpiry";
import { ThoughtEntry } from "../../model/model";

import styles from "./speech-bubble.module.css";

interface SpeechBubbleProps {
  entry: ThoughtEntry;
  onHeart: (entryId: string) => void;
  isExpanded: boolean;
  currentUserId?: string;
  onToggleExpand: () => void;
  onShowLikers: (hearts: Record<string, number>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const SpeechBubble = ({
  entry,
  onHeart,
  isExpanded,
  currentUserId,
  onToggleExpand,
  onShowLikers,
  onDragStart,
  onDragEnd,
}: SpeechBubbleProps) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);

  // Randomize floating animation parameters for organic feel
  const [floatTransition] = useState(() => ({
    duration: 3 + Math.random() * 2,
    repeat: Infinity,
    repeatType: "mirror" as const,
    ease: "easeInOut" as const,
    delay: Math.random() * 2,
  }));

  // Check for truncation
  useEffect(() => {
    const checkTruncation = () => {
      if (!isExpanded && textRef.current) {
        setIsTruncated(
          textRef.current.scrollHeight > textRef.current.clientHeight,
        );
      }
    };

    checkTruncation();
    const timer = setTimeout(checkTruncation, 100);

    window.addEventListener("resize", checkTruncation);
    return () => {
      window.removeEventListener("resize", checkTruncation);
      clearTimeout(timer);
    };
  }, [entry.text, isExpanded]);

  const handleTap = useCallback(
    () => {
      // If a drag was recognized, don't trigger tap logic
      if (isDragging.current) return;

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        // Double tap to heart only when not expanded
        if (!isExpanded) onHeart(entry.id);
      } else {
        clickTimer.current = setTimeout(() => {
          onToggleExpand();
          clickTimer.current = null;
        }, 250);
      }
    },
    [onToggleExpand, entry.id, onHeart, isExpanded],
  );

  const handleHeartClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onShowLikers(entry.hearts);
    },
    [entry.hearts, onShowLikers],
  );

  const heartCount = entry.hearts ? Object.keys(entry.hearts).length : 0;
  const isLikedByMe = currentUserId && entry.hearts && !!entry.hearts[currentUserId];

  return (
    <div
      className={`${styles.bubbleContainer} ${isExpanded ? styles.expandedContainer : ""}`}
    >
      <motion.div
        className={`${styles.bubble} ${isExpanded ? styles.bubbleExpanded : ""}`}
        onTap={handleTap}
        onDragStart={() => {
          isDragging.current = true;
          if (onDragStart) onDragStart();
        }}
        onDragEnd={() => {
          // Use a short timeout to ensure the tap event (which fires on release) 
          // is caught and ignored by the handleTap logic
          setTimeout(() => {
            isDragging.current = false;
            if (onDragEnd) onDragEnd();
          }, 100);
        }}
        drag={!isExpanded}
        dragPropagation={false}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        dragSnapToOrigin={true}
        whileHover={!isExpanded ? { 
          scale: 1.05, 
          cursor: "grab",
          borderColor: "var(--color-link)",
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.12)"
        } : { cursor: "default" }}
        whileTap={!isExpanded ? { 
          scale: 1.05,
          cursor: "grabbing",
          borderColor: "var(--color-link)",
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.12)"
        } : { cursor: "default" }}
        whileDrag={{ 
          scale: 1.1, 
          cursor: "grabbing",
          borderColor: "var(--color-link)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)"
        }}
        animate={!isExpanded ? {
          y: [0, -12, 0],
        } : { y: 0 }}
        transition={!isExpanded ? {
          y: floatTransition
        } : {}}
      >
        <div
          ref={textRef}
          className={`${styles.text} ${!isExpanded ? styles.truncated : ""}`}
        >
          {entry.text}
        </div>
        {isTruncated && !isExpanded && (
          <div className={styles.readMore}>... read more</div>
        )}

        {(isExpanded || heartCount > 0) && (
          <div className={styles.bubbleFooter}>
            {isExpanded ? (
              <ThoughtExpiry
                updatedAt={entry.updatedAt}
                className={styles.expandedExpiry}
              />
            ) : (
              <div />
            )}

            {heartCount > 0 && (
              <div
                className={styles.heartOverlayInside}
                onClick={handleHeartClick}
              >
                <Heart 
                  size={10} 
                  fill={isLikedByMe ? "#ff4757" : "transparent"} 
                  stroke={isLikedByMe ? "#ff4757" : "var(--color-text-dim)"} 
                />
                <span style={{ marginLeft: 3, fontWeight: 800 }}>
                  {heartCount}
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SpeechBubble;

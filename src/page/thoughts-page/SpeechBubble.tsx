import { useState, useCallback, useRef, useEffect } from "react";

import { Heart } from "lucide-react";

import { Thought } from "../../model/model";

import styles from "./speech-bubble.module.css";

interface SpeechBubbleProps {
  thought?: Thought;
  onHeart: (thoughtId: string) => void;
}

const SpeechBubble = ({ thought, onHeart }: SpeechBubbleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for truncation whenever text changes
  useEffect(() => {
    const checkTruncation = () => {
      if (!isExpanded && textRef.current) {
        setIsTruncated(
          textRef.current.scrollHeight > textRef.current.clientHeight,
        );
      }
    };

    checkTruncation();
    // Small delay to ensure styles are applied
    const timer = setTimeout(checkTruncation, 100);
    
    window.addEventListener("resize", checkTruncation);
    return () => {
      window.removeEventListener("resize", checkTruncation);
      clearTimeout(timer);
    };
  }, [thought?.text, isExpanded]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (clickTimer.current) {
        // Double click detected
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        if (thought) onHeart(thought.id);
      } else {
        // First click
        clickTimer.current = setTimeout(() => {
          setIsExpanded(!isExpanded);
          clickTimer.current = null;
        }, 250); // 250ms threshold
      }
    },
    [isExpanded, thought, onHeart],
  );

  if (!thought || !thought.text) return null;

  const heartCount = thought.hearts ? Object.keys(thought.hearts).length : 0;

  return (
    <div className={styles.bubbleContainer}>
      <div
        className={`${styles.bubble} ${isExpanded ? styles.bubbleExpanded : ""}`}
        onClick={handleClick}
      >
        <div
          ref={textRef}
          className={`${styles.text} ${!isExpanded ? styles.truncated : ""}`}
        >
          {thought.text}
        </div>
        {isTruncated && !isExpanded && (
          <div className={styles.readMore}>... read more</div>
        )}
        <div className={styles.tail}>
          <div className={styles.tailInner} />
        </div>
      </div>

      {heartCount > 0 && (
        <div className={styles.heartOverlay}>
          <Heart size={12} fill="#ff4757" />
          <span style={{ marginLeft: 4, fontWeight: 800 }}>{heartCount}</span>
        </div>
      )}
    </div>
  );
};

export default SpeechBubble;

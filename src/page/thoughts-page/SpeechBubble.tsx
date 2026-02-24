import { useState, useCallback, useRef, useEffect } from "react";

import { Heart } from "lucide-react";

import { ThoughtEntry } from "../../model/model";

import styles from "./speech-bubble.module.css";

interface SpeechBubbleProps {
  entry: ThoughtEntry;
  onHeart: (entryId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onShowLikers: (hearts: Record<string, number>) => void;
}

const SpeechBubble = ({ entry, onHeart, isExpanded, onToggleExpand, onShowLikers }: SpeechBubbleProps) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Randomize floating animation duration and delay for a more organic feel
  const [floatStyle] = useState(() => ({
    animationDuration: `${4 + Math.random() * 3}s`,
    animationDelay: `${-Math.random() * 5}s`,
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

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        onHeart(entry.id);
      } else {
        clickTimer.current = setTimeout(() => {
          onToggleExpand();
          clickTimer.current = null;
        }, 250);
      }
    },
    [onToggleExpand, entry.id, onHeart],
  );

  const handleHeartClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShowLikers(entry.hearts);
  }, [entry.hearts, onShowLikers]);

  const heartCount = entry.hearts ? Object.keys(entry.hearts).length : 0;

  return (
    <div className={`${styles.bubbleContainer} ${isExpanded ? styles.expandedContainer : ""}`}>
      <div
        className={`${styles.bubble} ${isExpanded ? styles.bubbleExpanded : ""}`}
        onClick={handleClick}
        style={floatStyle}
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

        {heartCount > 0 && (
          <div className={styles.heartOverlayInside} onClick={handleHeartClick}>
            <Heart size={10} fill="#ff4757" stroke="none" />
            <span style={{ marginLeft: 3, fontWeight: 800 }}>{heartCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechBubble;

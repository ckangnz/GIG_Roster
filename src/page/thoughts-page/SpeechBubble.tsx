import { useState, useCallback, useRef } from "react";

import { Heart } from "lucide-react";

import { Thought } from "../../model/model";

import styles from "./speech-bubble.module.css";

interface SpeechBubbleProps {
  thought?: Thought;
  onHeart: (thoughtId: string) => void;
}

const SpeechBubble = ({ thought, onHeart }: SpeechBubbleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
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
  }, [isExpanded, thought, onHeart]);

  if (!thought || !thought.text) return null;

  const heartCount = thought.hearts ? Object.keys(thought.hearts).length : 0;

  return (
    <div className={styles.bubbleContainer}>
      <div 
        className={`${styles.bubble} ${isExpanded ? styles.bubbleExpanded : ""}`}
        onClick={handleClick}
      >
        <div className={`${styles.text} ${!isExpanded ? styles.truncated : ""}`}>
          {thought.text}
        </div>
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

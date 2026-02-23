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
  const lastTap = useRef<number>(0);

  const handleTouch = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (thought) onHeart(thought.id);
    } else {
      setIsExpanded(!isExpanded);
    }
    lastTap.current = now;
  }, [isExpanded, thought, onHeart]);

  if (!thought || !thought.text) return null;

  const heartCount = thought.hearts ? Object.keys(thought.hearts).length : 0;

  return (
    <div className={styles.bubbleContainer}>
      <div 
        className={`${styles.bubble} ${isExpanded ? styles.bubbleExpanded : ""}`}
        onClick={handleTouch}
      >
        <div className={`${styles.text} ${!isExpanded ? styles.truncated : ""}`}>
          {thought.text}
        </div>
        <div className={styles.tail}>
          <div className={styles.tailInner} />
        </div>
        
        {heartCount > 0 && (
          <div className={styles.heartOverlay}>
            <Heart size={12} fill="#ff4757" />
            <span style={{ marginLeft: 2, fontWeight: 800 }}>{heartCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechBubble;

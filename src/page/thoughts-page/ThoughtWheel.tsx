import { useState, useEffect, useCallback } from "react";

import { motion, useMotionValue, useSpring, animate, PanInfo, useTransform } from "framer-motion";

import SpeechBubble from "./SpeechBubble";
import { AppUser, Thought } from "../../model/model";

import styles from "./thought-wheel.module.css";

interface ThoughtWheelProps {
  users: AppUser[];
  currentUserEmail: string | null;
  thoughts: Record<string, Thought>;
  selectedTeam: string;
  onUserFocus: (user: AppUser) => void;
  onHeart: (thoughtId: string) => void;
}

const ThoughtWheel = ({ 
  users, 
  currentUserEmail, 
  thoughts, 
  selectedTeam,
  onUserFocus, 
  onHeart 
}: ThoughtWheelProps) => {

  const [focusedIndex, setFocusedIndex] = useState(0);
  
  // rotation in degrees
  const rotation = useMotionValue(0);
  const springRotation = useSpring(rotation, { stiffness: 150, damping: 30 });

  // Create a transformed motion value for counter-rotation
  const counterRotation = useTransform(springRotation, (value) => -value);

  const radius = 150; // pixels
  const userCount = users.length;
  const angleStep = userCount > 0 ? 360 / userCount : 0;

  // Initial focus on current user
  useEffect(() => {
    if (userCount === 0) return;
    
    const myIndex = users.findIndex(u => u.email === currentUserEmail);
    const targetIndex = myIndex >= 0 ? myIndex : 0;
    
    const targetRotation = -targetIndex * angleStep;
    
    rotation.set(targetRotation);
    // Use setTimeout to avoid cascading renders warning
    const timer = setTimeout(() => {
      setFocusedIndex(targetIndex);
      onUserFocus(users[targetIndex]);
    }, 0);
    return () => clearTimeout(timer);
  }, [users, currentUserEmail, userCount, angleStep, onUserFocus, rotation]);

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentRot = rotation.get();
    const velocity = info.velocity.x / 10; // Simple velocity scaling
    const targetRot = currentRot + velocity;
    
    // Snap to nearest item
    const snappedIndex = Math.round(-targetRot / angleStep);
    
    const finalRot = -snappedIndex * angleStep;
    
    animate(rotation, finalRot, {
      type: "spring",
      stiffness: 150,
      damping: 30,
      onUpdate: (latest) => {
        const idx = Math.round(-latest / angleStep);
        const normIdx = ((idx % userCount) + userCount) % userCount;
        if (normIdx !== focusedIndex) {
          setFocusedIndex(normIdx);
          onUserFocus(users[normIdx]);
        }
      }
    });
  }, [rotation, angleStep, userCount, focusedIndex, onUserFocus, users]);


  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <div className={styles.wheelContainer}>
      <div className={styles.centerIndicator} />
      <motion.div
        className={styles.wheel}
        style={{ rotate: springRotation }}
        drag="x"
        onDragEnd={handleDragEnd}
      >
        {users.map((user, index) => {
          const angle = index * angleStep;
          // Convert angle to radians for placement
          // Subtract 90 degrees so 0 is at the top
          const rad = (angle - 90) * (Math.PI / 180);
          const x = radius * Math.cos(rad);
          const y = radius * Math.sin(rad);

          return (
            <div
              key={user.email || index}
              className={`${styles.userNode} ${index === focusedIndex ? styles.userNodeActive : ""}`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: `translate(-50%, -50%) rotate(${-angle}deg)`, // Keep names upright? No, rotate relative to wheel
              }}
              onClick={() => {
                const targetRot = -index * angleStep;
                animate(rotation, targetRot, { type: "spring", stiffness: 150, damping: 30 });
                setFocusedIndex(index);
                onUserFocus(user);
              }}
            >
              {/* Counter-rotate internal content to keep it upright */}
              <motion.div 
                style={{ rotate: counterRotation, rotateZ: angle }}
              >
                 {index === focusedIndex && (
                   <SpeechBubble 
                     thought={thoughts[`${user.id}_${selectedTeam}`]} 
                     onHeart={onHeart}
                   />
                 )}
                 <div className={styles.avatar}>
                    {getInitials(user.name)}
                 </div>
                 <div className={styles.userName}>{user.name}</div>
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default ThoughtWheel;

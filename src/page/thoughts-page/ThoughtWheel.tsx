import { useState, useEffect, useCallback, useRef } from "react";

import { motion, useMotionValue, animate, PanInfo, useTransform, useMotionValueEvent, AnimatePresence } from "framer-motion";

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
  const [realTimeRotation, setRealTimeRotation] = useState(0);
  const [radius, setRadius] = useState(window.innerWidth < 768 ? 250 : 500);
  
  const rotation = useMotionValue(0);

  const userCount = users.length;
  const angleStep = userCount > 0 ? 360 / userCount : 0;

  // Listen to rotation changes in real-time
  useMotionValueEvent(rotation, "change", (latest) => {
    setRealTimeRotation(latest);
    
    const snappedIndex = Math.round(-latest / angleStep);
    const normIdx = ((snappedIndex % userCount) + userCount) % userCount;
    
    if (normIdx !== focusedIndex) {
      setFocusedIndex(normIdx);
      onUserFocus(users[normIdx]);
    }
  });
  // Remove useSpring to eliminate lag during direct interaction
  const counterRotation = useTransform(rotation, (value) => -value);

  const wheelSnapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update radius on resize
  useEffect(() => {
    const handleResize = () => {
      setRadius(window.innerWidth < 768 ? 250 : 500);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (userCount === 0) return;
    
    const myIndex = users.findIndex(u => u.email === currentUserEmail);
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

  const snapToItem = useCallback((rot: number) => {
    const snappedIndex = Math.round(-rot / angleStep);
    const finalRot = -snappedIndex * angleStep;
    
    animate(rotation, finalRot, {
      type: "spring",
      stiffness: 150,
      damping: 30,
    });
  }, [angleStep, rotation]);

  const handleDrag = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentRot = rotation.get();
    // Sensitivity based on radius - increased for snappier feel
    const sensitivity = (360 / (2 * Math.PI * radius)) * 1.5; 
    rotation.set(currentRot + info.delta.x * sensitivity);
  }, [rotation, radius]);

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentRot = rotation.get();
    // Reduce momentum multiplier to make it easier to stop
    const angularVelocity = (info.velocity.x / radius) * 25; 
    const targetRot = currentRot + angularVelocity;
    snapToItem(targetRot);
  }, [rotation, snapToItem, radius]);

  const handleUserClick = useCallback((index: number) => {
    const currentRot = rotation.get();
    const targetRotAbsolute = -index * angleStep;
    
    // Calculate shortest path
    const diff = targetRotAbsolute - currentRot;
    const shortestDiff = ((diff + 180) % 360 + 360) % 360 - 180;
    const finalRot = currentRot + shortestDiff;
    
    animate(rotation, finalRot, {
      type: "spring",
      stiffness: 150,
      damping: 30,
    });
  }, [rotation, angleStep]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY || e.deltaX;
    const currentRot = rotation.get();
    const newRot = currentRot - delta * 0.05; 
    rotation.set(newRot);
    
    if (wheelSnapTimerRef.current) clearTimeout(wheelSnapTimerRef.current);
    wheelSnapTimerRef.current = setTimeout(() => {
      snapToItem(rotation.get());
    }, 150);
  }, [rotation, snapToItem]);

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
        <motion.div
          className={styles.wheel}
          style={{ rotate: rotation }}
        >
          {users.map((user, index) => {
            const angle = index * angleStep;
            const rad = (angle - 90) * (Math.PI / 180);
            const x = radius * Math.cos(rad);
            const y = radius * Math.sin(rad);

            // Calculate how far this node is from the center (0 degrees / top)
            // realTimeRotation is the current wheel rotation.
            // A node at 'angle' is at the top when realTimeRotation == -angle
            const angularDistanceFromCenter = Math.abs(((angle + realTimeRotation + 180) % 360 + 360) % 360 - 180);
            const isVisible = angularDistanceFromCenter < 10; // 10 degree threshold

            return (
              <div
                key={user.id || user.email || index}
                className={`${styles.userNode} ${index === focusedIndex ? styles.userNodeActive : ""}`}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: `translate(-50%, -50%)`, 
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUserClick(index);
                }}
              >
                <motion.div 
                  style={{ rotate: counterRotation }}
                >
                   <AnimatePresence>
                     {isVisible && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.8, y: 10 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.8, y: 10 }}
                         transition={{ duration: 0.2 }}
                       >
                         <SpeechBubble 
                           thought={thoughts[`${user.id}_${selectedTeam}`]} 
                           onHeart={onHeart}
                         />
                       </motion.div>
                     )}
                   </AnimatePresence>
                   <div className={styles.userName}>
                                      {user.name}
                                      {thoughts[`${user.id}_${selectedTeam}`] && index !== focusedIndex && (
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

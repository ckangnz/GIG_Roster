import { useState, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Undo2 } from 'lucide-react';

import { useAppSelector } from '../../hooks/redux';
import { useUndo } from '../../hooks/useUndo';

import styles from './undo-toast.module.css';

const UndoToast = () => {
  const { undoAction, canUndo, lastActionDescription } = useUndo();
  const history = useAppSelector(state => state.undo.history);
  const [isVisible, setIsVisible] = useState(false);
  const lastHistoryId = useRef<string | null>(null);

  // Show toast when a new action is added to history
  useEffect(() => {
    const currentAction = history[0];
    if (currentAction && currentAction.id !== lastHistoryId.current) {
      lastHistoryId.current = currentAction.id;
      
      const showTimer = setTimeout(() => {
        setIsVisible(true);
      }, 10);
      
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // Hide after 5 seconds
      
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [history]);

  return (
    <AnimatePresence>
      {canUndo && isVisible && (
        <div className={styles.undoToastWrapper}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={styles.content}
          >
            <span className={styles.description}>{lastActionDescription}</span>
            <button className={styles.undoBtn} onClick={() => {
              undoAction();
              setIsVisible(false);
            }}>
              <Undo2 size={16} />
              Undo
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UndoToast;

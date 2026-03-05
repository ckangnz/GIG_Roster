import { ReactNode } from 'react';

import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';

import styles from './sortable-list.module.css';

interface SortableListProps<T> {
  items: T[];
  onReorder: (newOrder: T[]) => void;
  children: ReactNode;
  className?: string;
}

export function SortableList<T>({
  items,
  onReorder,
  children,
  className = ''
}: SortableListProps<T>) {
  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      className={`${styles.sortableList} ${className}`}
    >
      {children}
    </Reorder.Group>
  );
}

interface SortableItemProps {
  value: unknown;
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SortableItem({
  value,
  label,
  children,
  className = ''
}: SortableItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={dragControls}
      layout
      initial={{ opacity: 1 }}
      whileDrag={{ 
        scale: 1.02,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      }}
      className={`${styles.sortableItem} ${className}`}
    >
      <div className={styles.itemContainer}>
        <div 
          className={styles.dragHandle} 
          onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={18} />
        </div>
        
        <div className={styles.itemContent}>
          {label && (
            <div className={styles.itemHeader}>
              <h4 className={styles.itemLabel}>{label}</h4>
            </div>
          )}
          <div className={styles.itemBody}>
            {children}
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}

export default SortableList;

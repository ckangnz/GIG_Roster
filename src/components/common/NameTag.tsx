import { Fragment } from "react";

import styles from "./name-tag.module.css";

interface NameTagProps {
  displayName: string | null;
  isMe: boolean;
  isHighlighted?: boolean;
}

const NameTag = ({ displayName, isMe, isHighlighted }: NameTagProps) => {
  return (
    <Fragment>
      <span
        className={[isMe ? styles.isMe : "", isHighlighted ? styles.isHighlighted : ""].filter(Boolean).join(" ")}
      >
        {displayName}
      </span>
      {isMe && <span className={styles.meTag}>Me</span>}
    </Fragment>
  );
};

export default NameTag;

import { Fragment } from "react";

import styles from "./name-tag.module.css";

interface NameTagProps {
  displayName: string | null;
  isMe: boolean;
}

const NameTag = ({ displayName, isMe }: NameTagProps) => {
  return (
    <Fragment>
      <span className={isMe ? styles.isMe : ""}>{displayName}</span>
      {isMe && <span className={styles.meTag}>Me</span>}
    </Fragment>
  );
};

export default NameTag;

import styles from "./name-tag.module.css";

interface NameTagProps {
  displayName: string | null;
  isMe: boolean;
  isHighlighted?: boolean;
  gender?: string | null;
}

const NameTag = ({
  displayName,
  isMe,
  isHighlighted,
  gender,
}: NameTagProps) => {
  const isFemale = gender === "Female";

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: ".5rem" }}
    >
      <span
        className={[
          isMe ? styles.isMe : "",
          isHighlighted ? styles.isHighlighted : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {displayName}
      </span>
      {isMe && (
        <span
          className={`${styles.meTag} ${isFemale ? styles.meTagFemale : ""}`}
        >
          Me
        </span>
      )}
    </span>
  );
};

export default NameTag;

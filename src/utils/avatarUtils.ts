/**
 * Returns the avatar image URL for a user if their photo is not hidden,
 * or null if the user has hidden their photo (fall back to initials).
 */
export const getUserPhotoURL = (
  photoURL: string | null | undefined,
  hidePhoto: boolean | undefined,
): string | null => {
  if (!photoURL || hidePhoto) return null;
  return photoURL;
};

/**
 * Returns the initials (up to 2 characters) for a user's display name.
 */
export const getInitials = (name: string | null | undefined): string => {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(" ");
  return parts
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

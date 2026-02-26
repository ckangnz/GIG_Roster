import { useState, useEffect, useMemo } from "react";

interface ThoughtExpiryProps {
  updatedAt: number;
  className?: string;
}

const THOUGHT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

export const ThoughtExpiry = ({ updatedAt, className }: ThoughtExpiryProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expiryText = useMemo(() => {
    const expiryTime = updatedAt + THOUGHT_EXPIRATION_MS;
    const diff = expiryTime - now;

    if (diff <= 0) return "Expired";

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `Expires in ${days}d ${hours % 24}h`;
    if (hours > 0) return `Expires in ${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `Expires in ${minutes}m ${seconds % 60}s`;
    return `Expires in ${seconds}s`;
  }, [updatedAt, now]);

  return <span className={className}>{expiryText}</span>;
};

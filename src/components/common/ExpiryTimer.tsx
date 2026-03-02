import { useState, useEffect, useMemo } from "react";

import styles from "./expiry-timer.module.css";

interface ExpiryTimerProps {
  endTimeStr: string;
  showText?: boolean;
  className?: string;
  onExpire?: () => void;
}

/**
 * A reusable countdown timer component that shows remaining time until a specified "HH:mm" end time.
 * Only displays if the end time is within the next 60 minutes.
 */
const ExpiryTimer = ({
  endTimeStr,
  showText = true,
  className = "",
  onExpire,
}: ExpiryTimerProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeRemaining = useMemo(() => {
    if (!endTimeStr) return null;

    const [endH, endM] = endTimeStr.split(":").map(Number);
    const endTotalSecs = endH * 3600 + endM * 60;

    const nowTotalSecs =
      currentTime.getHours() * 3600 +
      currentTime.getMinutes() * 60 +
      currentTime.getSeconds();

    const diff = endTotalSecs - nowTotalSecs;

    if (diff <= 0) {
      if (onExpire) onExpire();
      return null;
    }

    if (diff > 3600) return null;

    const mm = Math.floor(diff / 60);
    const ss = diff % 60;
    return `${mm}:${ss.toString().padStart(2, "0")}`;
  }, [endTimeStr, currentTime, onExpire]);

  if (!timeRemaining) return null;

  return (
    <div
      className={`${styles.expiryTimer} ${className}`}
      title="This event is about to conclude and will be archived soon."
    >
      <span style={{ fontSize: "0.8rem" }}>⏳</span>
      {showText ? `Expiring in ${timeRemaining}` : timeRemaining}
    </div>
  );
};

export default ExpiryTimer;

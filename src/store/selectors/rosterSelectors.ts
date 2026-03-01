import { createSelector } from "@reduxjs/toolkit";

import { CoverageRequest } from "../../model/model";
import { RootState } from "../index";

/**
 * Selects all open coverage requests across all dates that the current user is qualified to fill.
 */
export const selectQualifiedCoverageRequests = createSelector(
  [(state: RootState) => state.roster.entries, (state: RootState) => state.auth.userData],
  (entries, userData) => {
    if (!userData || !userData.email) return [];

    const userQualifiedPositions = userData.teamPositions || {};
    const qualifiedRequests: { date: string; request: CoverageRequest; requestId: string }[] = [];

    Object.entries(entries).forEach(([date, entry]) => {
      const requests = entry.coverageRequests || {};
      Object.entries(requests).forEach(([reqId, req]) => {
        // Only show requests that are open AND NOT from the current user
        if (req.status !== "open" || req.absentUserEmail === userData.email) return;

        // Check if user is in this team and has this position
        const teamPos = userQualifiedPositions[req.teamName] || [];
        if (teamPos.includes(req.positionName)) {
          qualifiedRequests.push({ date, request: req, requestId: reqId });
        }
      });
    });

    // Sort by date ascending
    return [...qualifiedRequests].sort((a, b) => a.date.localeCompare(b.date));
  }
);

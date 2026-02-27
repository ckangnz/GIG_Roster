import { useCallback, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from './redux';
import { 
  applyOptimisticAssignment, 
  syncAssignmentRemote, 
  applyOptimisticAbsence, 
  syncAbsenceRemote,
  applyOptimisticEventName,
  syncEventNameRemote
} from '../store/slices/rosterSlice';
import { popAction, AssignmentUndoPayload, AbsenceUndoPayload, EventNameUndoPayload } from '../store/slices/undoSlice';

export const useUndo = () => {
  const dispatch = useAppDispatch();
  const { history } = useAppSelector((state) => state.undo);

  const undoAction = useCallback(() => {
    if (history.length === 0) return;

    const lastAction = history[0];
    const { type, payload } = lastAction;

    if (type === 'assignment') {
      const p = payload as AssignmentUndoPayload;
      const reversePayload = {
        date: p.date,
        teamName: p.teamName,
        userIdentifier: p.userEmail,
        updatedAssignments: p.previousAssignments,
      };
      dispatch(applyOptimisticAssignment(reversePayload));
      dispatch(syncAssignmentRemote(reversePayload));
    } else if (type === 'absence') {
      const p = payload as AbsenceUndoPayload;
      const reversePayload = {
        date: p.date,
        userIdentifier: p.userEmail,
        isAbsent: p.previousIsAbsent,
        reason: p.previousReason,
        clearedTeams: [], // Not needed for reversal
        clearedPositions: p.restoredAssignments || {},
      };
      
      dispatch(applyOptimisticAbsence({
        date: p.date,
        userIdentifier: p.userEmail,
        isAbsent: p.previousIsAbsent,
        reason: p.previousReason,
        clearedPositions: p.restoredAssignments,
      }));
      dispatch(syncAbsenceRemote(reversePayload));
    } else if (type === 'eventName') {
      const p = payload as EventNameUndoPayload;
      const reversePayload = {
        date: p.date,
        eventName: p.previousEventName,
      };
      dispatch(applyOptimisticEventName(reversePayload));
      dispatch(syncEventNameRemote(reversePayload));
    }

    dispatch(popAction());
  }, [dispatch, history]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === 'z';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isZ && isCmdOrCtrl && !e.shiftKey) {
        // Prevent default browser undo behavior if we have custom history
        if (history.length > 0) {
          e.preventDefault();
          undoAction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoAction, history.length]);

  return {
    undoAction,
    canUndo: history.length > 0,
    lastActionDescription: history.length > 0 ? history[0].description : null,
  };
};

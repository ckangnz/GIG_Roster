import { useEffect } from "react";

import { collection, onSnapshot, query } from "firebase/firestore";

import { useAppDispatch } from "./redux";
import { db } from "../firebase";
import { RosterEntry } from "../model/model";
import { setRosterEntries, setLoading } from "../store/slices/rosterSlice";

/**
 * Hook to listen to all roster entries in real-time.
 */
export const useRosterListener = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setLoading(true));
    const q = query(collection(db, "roster"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: Record<string, RosterEntry> = {};
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const updatedAt = data.updatedAt;
        
        // Ensure data is serializable for Redux
        const serializableData = {
          ...data,
          updatedAt:
            updatedAt && typeof updatedAt === 'object' && 'toMillis' in updatedAt
              ? (updatedAt as { toMillis: () => number }).toMillis()
              : (updatedAt as number | undefined),
        };
        
        entries[doc.id] = { ...serializableData, id: doc.id } as RosterEntry;
      });
      
      dispatch(setRosterEntries(entries));
    }, (error) => {
      console.error("Roster listener error:", error);
    });

    return () => unsubscribe();
  }, [dispatch]);
};

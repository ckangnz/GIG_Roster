/**
 * MIGRATION SCRIPT: Names to UNIQUE UUIDs
 *
 * This script performs a "Big Bang" migration:
 * 1. Generates truly unique IDs for all Teams and Positions.
 * 2. Updates Metadata (Teams and Positions collections).
 * 3. Updates ALL User documents (teams array and teamPositions map).
 * 4. Updates ALL Roster documents (teams map and coverageRequests).
 *
 * WARNING: Run this only when you are ready to fully decouple names from IDs.
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log("🚀 Starting BIG BANG ID Migration...");

  const teamMap: Record<string, { id: string; name: string }> = {};
  const positionMap: Record<string, { id: string; name: string }> = {};

  // --- 1. PREPARE MAPPING ---
  console.log("Reading metadata...");
  const posDocRef = doc(db, "metadata", "positions");
  const posSnap = await getDoc(posDocRef);
  const rawPositions = posSnap.exists() ? posSnap.data().list || [] : [];

  const teamsDocRef = doc(db, "metadata", "teams");
  const teamsSnap = await getDoc(teamsDocRef);
  const rawTeams = teamsSnap.exists() ? teamsSnap.data().list || [] : [];

  // Generate new IDs or keep existing UUIDs if they look like UUIDs
  rawPositions.forEach((p: any) => {
    // If it already looks like a UUID (length > 20 and has hyphens), keep it.
    // Otherwise, it's likely a legacy name-id.
    const isLegacy = p.id === p.name || p.id.length < 20;
    positionMap[p.name] = {
      id: isLegacy ? uuidv4() : p.id,
      name: p.name,
    };
  });

  rawTeams.forEach((t: any) => {
    const isLegacy = t.id === t.name || t.id.length < 20;
    teamMap[t.name] = {
      id: isLegacy ? uuidv4() : t.id,
      name: t.name,
    };
  });

  console.log(
    `Mapping ready: ${Object.keys(teamMap).length} teams, ${Object.keys(positionMap).length} positions.`,
  );

  // --- 2. UPDATE METADATA ---
  console.log("Updating metadata documents...");
  const migratedPositions = rawPositions.map((p: any) => ({
    ...p,
    id: positionMap[p.name].id,
    parentId: p.parentId
      ? positionMap[p.parentId]?.id || p.parentId
      : undefined,
  }));
  await updateDoc(posDocRef, { list: migratedPositions });

  const migratedTeams = rawTeams.map((t: any) => ({
    ...t,
    id: teamMap[t.name].id,
    positions: (t.positions || []).map((p: any) => {
      // Handle both object {id, name} and string "name" formats
      const pName = typeof p === 'string' ? p : (p.name || p.id);
      return positionMap[pName]?.id || (typeof p === 'string' ? p : p.id);
    })
  }));
  await updateDoc(teamsDocRef, { list: migratedTeams });

  // --- 3. UPDATE USERS ---
  console.log("Migrating User documents...");
  const usersSnap = await getDocs(collection(db, "users"));
  const userBatch = writeBatch(db);

  usersSnap.forEach((userDoc) => {
    const data = userDoc.data();
    const newTeams = (data.teams || []).map(
      (tName: string) => teamMap[tName]?.id || tName,
    );

    const newTeamPositions: Record<string, string[]> = {};
    if (data.teamPositions) {
      Object.entries(data.teamPositions).forEach(([tName, pNames]) => {
        const tId = teamMap[tName]?.id || tName;
        const pIds = (pNames as string[]).map(
          (pName) => positionMap[pName]?.id || pName,
        );
        newTeamPositions[tId] = pIds;
      });
    }

    userBatch.update(userDoc.ref, {
      teams: newTeams,
      teamPositions: newTeamPositions,
      // Recalculate indexed assignments for the new rules
      indexedAssignments: Object.entries(newTeamPositions).flatMap(
        ([tId, pIds]) => pIds.map((pId) => `${tId}|${pId}`),
      ),
    });
  });
  await userBatch.commit();
  console.log(`✅ Migrated ${usersSnap.size} users.`);

  // --- 4. UPDATE ROSTER ---
  console.log("Migrating Roster documents...");
  const rosterSnap = await getDocs(collection(db, "roster"));
  const rosterBatch = writeBatch(db);

  rosterSnap.forEach((rosterDoc) => {
    const data = rosterDoc.data();
    const newTeams: Record<string, any> = {};

    if (data.teams) {
      Object.entries(data.teams).forEach(([tName, userMap]) => {
        const tId = teamMap[tName]?.id || tName;
        const newUserMap: Record<string, string[]> = {};

        Object.entries(userMap as Record<string, string[]>).forEach(
          ([email, pNames]) => {
            newUserMap[email] = pNames.map(
              (pName) => positionMap[pName]?.id || pName,
            );
          },
        );
        newTeams[tId] = newUserMap;
      });
    }

    // Update Coverage Requests too
    const newCoverageRequests: Record<string, any> = {};
    if (data.coverageRequests) {
      Object.entries(data.coverageRequests).forEach(
        ([reqId, req]: [string, any]) => {
          const tId = teamMap[req.teamName]?.id || req.teamName;
          const pId = positionMap[req.positionName]?.id || req.positionName;
          const newReqId = `${tId}_${pId}_${req.absentUserEmail}`.replace(
            /\./g,
            "_",
          );

          newCoverageRequests[newReqId] = {
            ...req,
            teamName: tId,
            positionName: pId,
          };
        },
      );
    }

    rosterBatch.update(rosterDoc.ref, {
      teams: newTeams,
      coverageRequests: newCoverageRequests,
    });
  });
  await rosterBatch.commit();
  console.log(`✅ Migrated ${rosterSnap.size} roster entries.`);

  console.log("🎉 BIG BANG MIGRATION COMPLETE.");
}

migrate().catch(console.error);

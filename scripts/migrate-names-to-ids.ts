/**
 * MIGRATION SCRIPT: Names to UNIQUE UUIDs (Server Side)
 * 
 * This script performs a "Big Bang" migration using the Firebase Admin SDK:
 * 1. Generates truly unique IDs for all Teams and Positions.
 * 2. Updates Metadata (metadata/teams and metadata/positions documents).
 * 3. Updates ALL User documents (teams array, teamPositions map, indexedAssignments).
 * 4. Updates ALL Roster documents (teams map and coverageRequests).
 * 
 * USE: npx tsx scripts/migrate-names-to-ids.ts
 */

import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";

// Load service account
const serviceAccountPath = path.join(process.cwd(), "firebase-admin-key.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Error: firebase-admin-key.json not found in project root.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

async function migrate() {
  console.log("🚀 Starting BIG BANG ID Migration (Admin SDK)...");

  const teamMap: Record<string, { id: string, name: string }> = {};
  const positionMap: Record<string, { id: string, name: string }> = {};

  // --- 1. PREPARE MAPPING ---
  console.log("Reading metadata...");
  const posDocRef = db.doc("metadata/positions");
  const posSnap = await posDocRef.get();
  const rawPositions = posSnap.exists ? (posSnap.data()?.list || []) : [];

  const teamsDocRef = db.doc("metadata/teams");
  const teamsSnap = await teamsDocRef.get();
  const rawTeams = teamsSnap.exists ? (teamsSnap.data()?.list || []) : [];

  // Generate new IDs or keep existing UUIDs
  rawPositions.forEach((p: any) => {
    const isLegacy = !p.id || p.id === p.name || p.id.length < 20;
    positionMap[p.name] = { 
      id: isLegacy ? uuidv4() : p.id, 
      name: p.name 
    };
  });

  rawTeams.forEach((t: any) => {
    const isLegacy = !t.id || t.id === t.name || t.id.length < 20;
    teamMap[t.name] = { 
      id: isLegacy ? uuidv4() : t.id, 
      name: t.name 
    };
  });

  console.log(`Mapping ready: ${Object.keys(teamMap).length} teams, ${Object.keys(positionMap).length} positions.`);

  // --- 2. UPDATE METADATA ---
  console.log("Updating metadata documents...");
  const migratedPositions = rawPositions.map((p: any) => ({
    ...p,
    id: positionMap[p.name].id,
    parentId: p.parentId ? (positionMap[p.parentId]?.id || p.parentId) : undefined
  }));
  await posDocRef.update({ list: migratedPositions });

  const migratedTeams = rawTeams.map((t: any) => ({
    ...t,
    id: teamMap[t.name].id,
    positions: (t.positions || []).map((p: any) => {
      const pName = typeof p === 'string' ? p : (p.name || p.id);
      return positionMap[pName]?.id || (typeof p === 'string' ? p : p.id);
    })
  }));
  await teamsDocRef.update({ list: migratedTeams });

  // --- 3. UPDATE USERS ---
  console.log("Migrating User documents...");
  const usersSnap = await db.collection("users").get();
  const userBatch = db.batch();
  let userCount = 0;
  
  usersSnap.forEach((userDoc) => {
    const data = userDoc.data();
    const newTeams = (data.teams || []).map((tName: string) => teamMap[tName]?.id || tName);
    
    const newTeamPositions: Record<string, string[]> = {};
    if (data.teamPositions) {
      Object.entries(data.teamPositions).forEach(([tName, pNames]) => {
        const tId = teamMap[tName]?.id || tName;
        const pIds = (pNames as string[]).map(pName => positionMap[pName]?.id || pName);
        newTeamPositions[tId] = pIds;
      });
    }

    userBatch.update(userDoc.ref, {
      teams: newTeams,
      teamPositions: newTeamPositions,
      indexedAssignments: Object.entries(newTeamPositions).flatMap(([tId, pIds]) => 
        pIds.map(pId => `${tId}|${pId}`)
      )
    });
    userCount++;
  });
  
  if (userCount > 0) await userBatch.commit();
  console.log(`✅ Migrated ${userCount} users.`);

  // --- 4. UPDATE ROSTER ---
  console.log("Migrating Roster documents...");
  const rosterSnap = await db.collection("roster").get();
  const rosterBatch = db.batch();
  let rosterCount = 0;

  rosterSnap.forEach((rosterDoc) => {
    const data = rosterDoc.data();
    const newTeams: Record<string, any> = {};
    
    if (data.teams) {
      Object.entries(data.teams).forEach(([tName, userMap]) => {
        const tId = teamMap[tName]?.id || tName;
        const newUserMap: Record<string, string[]> = {};
        
        Object.entries(userMap as Record<string, string[]>).forEach(([email, pNames]) => {
          if (Array.isArray(pNames)) {
            newUserMap[email] = pNames.map(pName => positionMap[pName]?.id || pName);
          } else {
            newUserMap[email] = pNames;
          }
        });
        newTeams[tId] = newUserMap;
      });
    }

    const newCoverageRequests: Record<string, any> = {};
    if (data.coverageRequests) {
      Object.entries(data.coverageRequests).forEach(([reqId, req]: [string, any]) => {
        const tId = teamMap[req.teamName]?.id || req.teamName;
        const pId = positionMap[req.positionName]?.id || req.positionName;
        const newReqId = `${tId}_${pId}_${req.absentUserEmail}`.replace(/\./g, "_");
        
        newCoverageRequests[newReqId] = {
          ...req,
          teamName: tId,
          positionName: pId
        };
      });
    }

    rosterBatch.update(rosterDoc.ref, { 
      teams: newTeams,
      coverageRequests: newCoverageRequests
    });
    rosterCount++;
  });
  
  if (rosterCount > 0) await rosterBatch.commit();
  console.log(`✅ Migrated ${rosterCount} roster entries.`);

  console.log("🎉 BIG BANG MIGRATION COMPLETE.");
}

migrate().catch(console.error);

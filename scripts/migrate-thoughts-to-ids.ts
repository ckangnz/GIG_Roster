/**
 * MIGRATION SCRIPT: Thoughts to UNIQUE UUIDs
 * 
 * This script migrates the 'thoughts' collection:
 * 1. Maps 'teamName' field to 'teamId'.
 * 2. Renames document IDs from {userUid}_{teamName} to {userUid}_{teamId}.
 * 3. Deletes the old documents.
 */

import admin from "firebase-admin";
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
  console.log("🚀 Starting THOUGHTS ID Migration...");

  // 1. Build Team Map
  const teamMap: Record<string, string> = {};
  const teamsSnap = await db.doc("metadata/teams").get();
  const rawTeams = teamsSnap.exists ? (teamsSnap.data()?.list || []) : [];
  rawTeams.forEach((t: any) => {
    teamMap[t.name] = t.id;
  });

  // 2. Build Position Map (for the orphan cleanup)
  const positionMap: Record<string, string> = {};
  const posSnap = await db.doc("metadata/positions").get();
  const rawPositions = posSnap.exists ? (posSnap.data()?.list || []) : [];
  rawPositions.forEach((p: any) => {
    positionMap[p.name] = p.id;
  });

  console.log(`Mapping ready: ${Object.keys(teamMap).length} teams.`);

  // 3. Migrate Thoughts
  console.log("Migrating Thoughts collection...");
  const thoughtsSnap = await db.collection("thoughts").get();
  const batch = db.batch();
  let count = 0;

  for (const thoughtDoc of thoughtsSnap.docs) {
    const data = thoughtDoc.data();
    const oldTeamName = data.teamName;
    const teamId = teamMap[oldTeamName];

    if (teamId && teamId !== oldTeamName) {
      const newUserUid = data.userUid;
      const newDocId = `${newUserUid}_${teamId}`;
      const newDocRef = db.collection("thoughts").doc(newDocId);

      // Create new document with UUID
      batch.set(newDocRef, {
        ...data,
        teamName: teamId // Now contains the UUID
      });

      // Delete old document
      batch.delete(thoughtDoc.ref);
      count++;
    }
  }

  if (count > 0) await batch.commit();
  console.log(`✅ Migrated ${count} thoughts.`);

  // 4. ORPHAN POSITION CLEANUP (Fixing Issue #2)
  console.log("Cleaning up orphaned position names in Roster...");
  const rosterSnap = await db.collection("roster").get();
  let rosterCount = 0;
  const rosterBatch = db.batch();

  rosterSnap.forEach((doc) => {
    const data = doc.data();
    let changed = false;

    if (data.teams) {
      Object.entries(data.teams).forEach(([tId, userMap]) => {
        Object.entries(userMap as Record<string, string[]>).forEach(([email, pIds]) => {
          if (Array.isArray(pIds)) {
            const newPIds = pIds.map(pId => {
              if (positionMap[pId]) {
                changed = true;
                return positionMap[pId];
              }
              return pId;
            });
            (userMap as any)[email] = newPIds;
          }
        });
      });
    }

    if (changed) {
      rosterBatch.update(doc.ref, { teams: data.teams });
      rosterCount++;
    }
  });

  if (rosterCount > 0) await rosterBatch.commit();
  console.log(`✅ Cleaned up ${rosterCount} roster documents with orphaned position names.`);

  console.log("🎉 THOUGHTS MIGRATION & CLEANUP COMPLETE.");
}

migrate().catch(console.error);

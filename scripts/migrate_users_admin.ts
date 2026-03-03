import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../firebase-admin-key.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Firebase Admin key missing at:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

/**
 * PHASE 1: MIGRATE
 * This ensures all detailed data is in the sub-collection.
 * Root 'organisations' Map is preserved/restored for production stability during transition.
 */
export const migrateUsers = async () => {
  console.log("🚀 Starting migration to sub-collections...");
  const usersSnap = await db.collection("users").get();
  let count = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const userId = userDoc.id;
    
    // We collect data from wherever it currently exists (root or temp map)
    const orgId = data.orgId || (data.organisations && !Array.isArray(data.organisations) ? Object.keys(data.organisations)[0] : null);
    
    if (!orgId) continue;

    // Source data (prefer root if it still exists, otherwise use existing map entry)
    const legacyMap = (data.organisations && !Array.isArray(data.organisations)) ? data.organisations[orgId] : {};
    
    const membershipData = {
      teams: data.teams || legacyMap.teams || [],
      teamPositions: data.teamPositions || legacyMap.teamPositions || {},
      indexedAssignments: data.indexedAssignments || legacyMap.indexedAssignments || [],
      preferredLanguage: data.preferredLanguage || legacyMap.preferredLanguage || "en-NZ",
      isActive: data.isActive ?? legacyMap.isActive ?? true,
      isAdmin: data.isAdmin ?? legacyMap.isAdmin ?? false,
      isApproved: data.isApproved ?? legacyMap.isApproved ?? false
    };

    // 1. Overwrite sub-collection document
    const memRef = db.doc(`organisations/${orgId}/memberships/${userId}`);
    await memRef.set(membershipData, { merge: true });

    // 2. Ensure root map has the permissions (for production stability)
    const rootOrgMap = (data.organisations && !Array.isArray(data.organisations)) ? data.organisations : {};
    rootOrgMap[orgId] = {
      isActive: membershipData.isActive,
      isAdmin: membershipData.isAdmin,
      isApproved: membershipData.isApproved
    };

    await userDoc.ref.update({ organisations: rootOrgMap });
    count++;
  }

  console.log(`✅ Phase 1 Complete: Migrated and synced ${count} users.`);
};

/**
 * PHASE 2: CLEANUP
 * Removes all legacy fields and converts 'organisations' map to string[].
 */
export const cleanupUserFields = async () => {
  console.log("🚀 Starting cleanup of legacy root fields...");
  const usersSnap = await db.collection("users").get();
  const batch = db.batch();
  let count = 0;

  usersSnap.forEach((userDoc) => {
    const data = userDoc.data();
    
    const updates: any = {
      orgId: FieldValue.delete(),
      isAdmin: FieldValue.delete(),
      isActive: FieldValue.delete(),
      isApproved: FieldValue.delete(),
      activeOrgId: FieldValue.delete(),
      teams: FieldValue.delete(),
      teamPositions: FieldValue.delete(),
      indexedAssignments: FieldValue.delete(),
      preferredLanguage: FieldValue.delete(),
      preferredTheme: FieldValue.delete()
    };

    // Convert organisations Map -> Array of IDs
    if (data.organisations && !Array.isArray(data.organisations)) {
      updates.organisations = Object.keys(data.organisations);
    }

    batch.update(userDoc.ref, updates);
    count++;
  });

  if (count > 0) {
    await batch.commit();
    console.log(`✅ Phase 2 Complete: Cleaned up ${count} users.`);
  }
};

const mode = process.argv[2];
if (mode === 'migrate') migrateUsers().catch(console.error);
else if (mode === 'cleanup') cleanupUserFields().catch(console.error);
else console.log("Usage: npx tsx scripts/migrate_users_admin.ts [migrate|cleanup]");

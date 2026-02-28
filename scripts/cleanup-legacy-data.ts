/**
 * CLEANUP SCRIPT: Delete Legacy Root Data
 * 
 * DANGER: This script deletes the OLD root-level collections:
 * - /metadata (teams, positions)
 * - /roster (monolithic documents)
 * - /thoughts (if fully migrated)
 * 
 * It DOES NOT delete:
 * - /users (these are shared/global)
 * - /organisations (this is the new data)
 * 
 * USE: npx tsx scripts/cleanup-legacy-data.ts
 */

import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Load service account
const serviceAccountPath = path.join(process.cwd(), "firebase-admin-key.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Error: firebase-admin-key.json not found.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper to delete a collection recursively
async function deleteCollection(collectionPath: string, batchSize: number) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db: admin.firestore.Firestore, query: admin.firestore.Query, resolve: (value?: unknown) => void) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function cleanup() {
  console.log("⚠️  STARTING LEGACY DATA CLEANUP...");
  console.log("This will permanently delete root /metadata, /roster, and /thoughts.");
  console.log("Waiting 5 seconds... Press Ctrl+C to cancel.");
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("🔥 Deleting /metadata...");
  await deleteCollection("metadata", 50);
  
  console.log("🔥 Deleting /roster...");
  await deleteCollection("roster", 50);

  console.log("🔥 Deleting /thoughts...");
  await deleteCollection("thoughts", 50);

  console.log("✅ Cleanup Complete. Legacy data is gone.");
}

cleanup().catch(console.error);

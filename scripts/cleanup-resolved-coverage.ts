/**
 * CLEANUP SCRIPT: Remove Resolved Coverage Requests
 * 
 * This script scans the 'roster' collection and removes any coverage requests
 * that do not have the status 'open'.
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

async function cleanup() {
  console.log("🚀 Starting Coverage Request Cleanup...");

  const rosterSnap = await db.collection("roster").get();
  const batch = db.batch();
  let docsChanged = 0;
  let requestsRemoved = 0;

  rosterSnap.forEach((doc) => {
    const data = doc.data();
    if (!data.coverageRequests) return;

    const coverageRequests = data.coverageRequests;
    let hasChanges = false;
    const updates: Record<string, any> = {};

    Object.entries(coverageRequests).forEach(([id, req]: [string, any]) => {
      if (req.status !== "open") {
        // Mark for deletion using dot notation
        updates[`coverageRequests.${id}`] = admin.firestore.FieldValue.delete();
        hasChanges = true;
        requestsRemoved++;
      }
    });

    if (hasChanges) {
      batch.update(doc.ref, updates);
      docsChanged++;
    }
  });

  if (docsChanged > 0) {
    await batch.commit();
    console.log(`✅ Cleaned up ${requestsRemoved} resolved/dismissed requests across ${docsChanged} roster documents.`);
  } else {
    console.log("ℹ️ No resolved coverage requests found to clean up.");
  }

  console.log("🎉 CLEANUP COMPLETE.");
}

cleanup().catch(console.error);

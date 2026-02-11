/* global process, console */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";

// 1. Simple .env.local parser
const envPath = path.resolve(process.cwd(), ".env.local");
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split(/\r?\n/).forEach(line => {
    const [key, ...value] = line.split("=");
    if (key && value.length > 0) {
      envVars[key.trim()] = value.join("=").trim();
    }
  });
}

const firebaseConfig = {
  apiKey: envVars["VITE_FIREBASE_API_KEY"],
  authDomain: envVars["VITE_FIREBASE_AUTH_DOMAIN"],
  projectId: envVars["VITE_FIREBASE_PROJECT_ID"],
  storageBucket: envVars["VITE_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: envVars["VITE_FIREBASE_MESSAGING_SENDER_ID"],
  appId: envVars["VITE_FIREBASE_APP_ID"],
};

if (!firebaseConfig.projectId) {
  console.error("Error: Could not find VITE_FIREBASE_PROJECT_ID in .env.local");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check for rollback flag
const isRollback = process.argv.includes("--rollback") || process.argv.includes("-r");
const dayShift = isRollback ? -1 : 1;

async function migrate() {
  const directionText = isRollback ? "BACKWARD" : "FORWARD";
  console.log(`Starting migration: Shifting all roster dates 1 day ${directionText}...`);
  
  const rosterRef = collection(db, "roster");
  const snapshot = await getDocs(rosterRef);
  
  console.log(`Found ${snapshot.size} documents to migrate.`);
  
  let batch = writeBatch(db);
  let count = 0;
  let totalMigrated = 0;

  for (const snapshotDoc of snapshot.docs) {
    const data = snapshotDoc.data();
    const oldId = snapshotDoc.id; // YYYY-MM-DD
    
    // Parse YYYY-MM-DD
    const [y, m, d] = oldId.split("-").map(Number);
    // Create local date
    const date = new Date(y, m - 1, d);
    // Add/Subtract day
    date.setDate(date.getDate() + dayShift);
    
    // Format back to YYYY-MM-DD
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, "0");
    const newD = String(date.getDate()).padStart(2, "0");
    const newId = `${newY}-${newM}-${newD}`;
    
    console.log(`Migrating: ${oldId} -> ${newId}`);
    
    const newDocRef = doc(db, "roster", newId);
    const oldDocRef = doc(db, "roster", oldId);
    
    // Update the internal date field as well
    const newData = { ...data, id: newId, date: newId };
    
    batch.set(newDocRef, newData);
    batch.delete(oldDocRef);
    
    count++;
    totalMigrated++;

    if (count === 400) {
      console.log("Committing intermediate batch...");
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    console.log("Committing final batch...");
    await batch.commit();
  }

  if (totalMigrated === 0) {
    console.log("No documents to migrate.");
    return;
  }

  console.log(`Success! ${totalMigrated} documents shifted 1 day forward.`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
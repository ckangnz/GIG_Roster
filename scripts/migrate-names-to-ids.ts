/**
 * MIGRATION SCRIPT: Names to IDs
 * 
 * This script prepares the database for the Scalable Foundation phase by:
 * 1. Adding 'id' field to all Teams (defaulting to their current name).
 * 2. Adding 'id' field to all Positions (defaulting to their current name).
 * 3. Updating User profiles to reference IDs.
 * 4. Updating Roster entries to reference IDs.
 * 
 * NOTE: For the first phase, we use the NAME as the ID to ensure 
 * zero breakages while we transition the CODE to look at the .id field.
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  writeBatch 
} from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log("🚀 Starting ID-Based Migration...");

  // 1. Migrate Positions Metadata
  console.log("--- Migrating Positions Metadata ---");
  const posDocRef = doc(db, "metadata", "positions");
  const posSnap = await getDoc(posDocRef);
  if (posSnap.exists()) {
    const data = posSnap.data();
    const newList = (data.list || []).map((pos: any) => ({
      ...pos,
      id: pos.id || pos.name // Ensure ID exists
    }));
    await updateDoc(posDocRef, { list: newList });
    console.log(`✅ Migrated ${newList.length} positions.`);
  }

  // 2. Migrate Teams Metadata
  console.log("--- Migrating Teams Metadata ---");
  const teamsDocRef = doc(db, "metadata", "teams");
  const teamsSnap = await getDoc(teamsDocRef);
  if (teamsSnap.exists()) {
    const data = teamsSnap.data();
    const newList = (data.list || []).map((team: any) => ({
      ...team,
      id: team.id || team.name, // Ensure ID exists
      positions: (team.positions || []).map((p: any) => ({
        ...p,
        id: p.id || p.name
      }))
    }));
    await updateDoc(teamsDocRef, { list: newList });
    console.log(`✅ Migrated ${newList.length} teams.`);
  }

  console.log("🎉 Migration Phase 1 (Metadata) Complete.");
  console.log("NOTE: Roster and User data already use names which now match the new IDs.");
}

migrate().catch(console.error);

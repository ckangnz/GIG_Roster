import { collection, getDocs, writeBatch, doc, deleteField } from "firebase/firestore";
import { db } from "../src/firebase"; 

/**
 * PHASE 1: MIGRATE
 * Run this BEFORE pushing the new code.
 * This copies legacy fields into the new multi-org structure.
 */
export const migrateUsers = async () => {
  const usersSnap = await getDocs(collection(db, "users"));
  const batch = writeBatch(db);
  let count = 0;

  usersSnap.forEach((userDoc) => {
    const data = userDoc.data();
    
    // Check if migration is needed (has old orgId but no new organisations map)
    if (data.orgId && !data.organisations) {
      const orgId = data.orgId;
      const isActive = data.isActive ?? true;
      const isAdmin = data.isAdmin ?? false;
      const isApproved = data.isApproved ?? false;

      batch.update(userDoc.ref, {
        activeOrgId: orgId,
        organisations: {
          [orgId]: {
            isActive,
            isAdmin,
            isApproved
          }
        }
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`✅ Phase 1 Complete: Migrated ${count} users.`);
  } else {
    console.log("ℹ️ No users needed migration.");
  }
};

/**
 * PHASE 2: CLEANUP
 * Run this AFTER the new code is deployed and verified.
 * This removes the deprecated root-level fields.
 */
export const cleanupUserFields = async () => {
  const usersSnap = await getDocs(collection(db, "users"));
  const batch = writeBatch(db);
  let count = 0;

  usersSnap.forEach((userDoc) => {
    const data = userDoc.data();
    
    // Only cleanup if the legacy fields still exist
    if ("orgId" in data || "isAdmin" in data || "isActive" in data || "isApproved" in data) {
      batch.update(userDoc.ref, {
        orgId: deleteField(),
        isActive: deleteField(),
        isAdmin: deleteField(),
        isApproved: deleteField()
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`✅ Phase 2 Complete: Cleaned up legacy fields for ${count} users.`);
  } else {
    console.log("ℹ️ No legacy fields found to clean up.");
  }
};

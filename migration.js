// migration.js - Migrate old Electron Store data to Firebase
import { db, auth } from "./firebase.js";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";

export async function migrateOldData() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user logged in, skipping migration");
      return false;
    }

    // Check if migration has already been done for this user
    const migrationKey = `escs_migrated_${user.uid}`;
    const alreadyMigrated = localStorage.getItem(migrationKey);

    if (alreadyMigrated) {
      console.log("User already migrated");
      return false;
    }

    // Check for old data in localStorage
    const oldStudentsStr = localStorage.getItem("students");
    const oldAuthUsersStr = localStorage.getItem("authUsers");
    const oldCurrentUserStr = localStorage.getItem("currentUser");

    // Try to get data from electron-store via IPC
    const oldData = await window.electronAPI.getOldData(user.uid);

    if (
      !oldStudentsStr &&
      !oldAuthUsersStr &&
      !oldCurrentUserStr &&
      !oldData.students &&
      !oldData.history
    ) {
      console.log("No old data found");
      // Mark as checked anyway so we don't keep checking
      localStorage.setItem(migrationKey, "true");
      return false;
    }

    console.log("Found old data, starting migration...");

    let migratedCount = 0;

    // Parse old data
    try {
      let studentsToMigrate = oldData.students;
      if (!Array.isArray(studentsToMigrate)) {
        studentsToMigrate = oldStudentsStr ? JSON.parse(oldStudentsStr) : [];
      }
      if (!Array.isArray(studentsToMigrate)) {
        studentsToMigrate = [];
      }

      if (studentsToMigrate && studentsToMigrate.length > 0) {
        console.log(`Migrating ${studentsToMigrate.length} students...`);

        // Use batch write for efficiency
        const batch = writeBatch(db);

        studentsToMigrate.forEach((student) => {
          const studentRef = doc(
            db,
            `users/${user.uid}/students/${student.id}`,
          );
          batch.set(studentRef, {
            id: student.id,
            name: student.name,
            books: student.books || [],
            migratedAt: new Date().toISOString(),
          });
          migratedCount++;
        });

        // Migrate history if it exists
        if (oldData.history && typeof oldData.history === "object") {
          for (const [studentId, items] of Object.entries(oldData.history)) {
            if (Array.isArray(items) && items.length > 0) {
              const historyRef = doc(
                db,
                `users/${user.uid}/history/${studentId}`,
              );
              batch.set(historyRef, {
                items: items,
                migratedAt: new Date().toISOString(),
              });
              console.log(`Migrated history for student ${studentId}`);
            }
          }
        }

        // Commit the batch
        await batch.commit();
        console.log(`Successfully migrated ${migratedCount} students`);
      }
    } catch (error) {
      console.error("Error parsing old data:", error);
      return false;
    }

    // Mark migration as complete
    localStorage.setItem(migrationKey, "true");

    // Optional: Clean up old data (comment out if you want to keep backup)
    // localStorage.removeItem("students");
    // localStorage.removeItem("authUsers");
    // localStorage.removeItem("currentUser");
    // localStorage.removeItem("history");

    if (migratedCount > 0) {
      console.log(`Migration complete! Migrated ${migratedCount} items`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Migration error:", error);
    return false;
  }
}

// This function can be called to manually trigger migration if needed
export async function manualMigration() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No user logged in");
      return false;
    }

    // Clear the migration flag to allow re-migration
    const migrationKey = `escs_migrated_${user.uid}`;
    localStorage.removeItem(migrationKey);

    // Run migration
    const result = await migrateOldData();

    if (result) {
      console.log("Manual migration successful");
    } else {
      console.log("No old data to migrate");
    }

    return result;
  } catch (error) {
    console.error("Manual migration error:", error);
    return false;
  }
}

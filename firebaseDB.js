import { db, auth } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  orderBy,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Helper to get current user
const getCurrentUserId = () => auth.currentUser?.uid;

export async function getStudents() {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const studentsRef = collection(db, `users/${userId}/students`);
  const snapshot = await getDocs(studentsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function addStudent(studentName) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("No user logged in");

    const randomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const studentRef = doc(db, `users/${userId}/students/${randomId}`);

    await setDoc(studentRef, {
      name: studentName,
      id: randomId,
      books: [],
      createdAt: new Date().toISOString(),
    });

    return await getStudents();
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
}

export async function removeStudents(idsToRemove) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("No user logged in");

    for (const id of idsToRemove) {
      const studentRef = doc(db, `users/${userId}/students/${id}`);
      await deleteDoc(studentRef);
    }

    return await getStudents();
  } catch (error) {
    console.error("Error removing students:", error);
    throw error;
  }
}

// ========== STUDENT BOOKS ==========
export async function updateStudentBooks(studentId, books, action = "update") {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("No user logged in");

    const studentRef = doc(db, `users/${userId}/students/${studentId}`);

    // If checking in, save to history first
    if (action === "checkin") {
      const allStudents = await getStudents();
      const student = allStudents.find((s) => s.id === studentId);

      if (student && student.books) {
        // Find which books were removed (checked in)
        const checkedInBooks = student.books.filter(
          (oldBook) => !books.find((newBook) => newBook.isbn === oldBook.isbn),
        );

        // Add checkin date
        const now = new Date().toLocaleDateString();
        checkedInBooks.forEach((book) => {
          book.checkinDate = now;
          if (!book.checkoutDate) {
            book.checkoutDate = now;
          }
        });

        // Save to history collection
        if (checkedInBooks.length > 0) {
          const historyRef = collection(db, `users/${userId}/history`);
          for (const book of checkedInBooks) {
            const historyDocRef = doc(historyRef);
            await setDoc(historyDocRef, {
              studentId: studentId,
              studentName: student.name,
              ...book,
              historyTimestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Update current books
    await updateDoc(studentRef, { books });

    return await getStudents();
  } catch (error) {
    console.error("Error updating student books:", error);
    throw error;
  }
}

// ========== HISTORY ==========
// Get student's reading history
export async function getStudentHistory(studentId) {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      console.error("No user logged in");
      return [];
    }

    // Query the history collection for this student
    const historyRef = collection(db, `users/${userId}/history`);
    const q = query(
      historyRef,
      where("studentId", "==", studentId),
      orderBy("historyTimestamp", "desc"),
    );

    const snapshot = await getDocs(q);
    const history = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        isbn: data.isbn,
        title: data.title || "Unknown Book",
        author: data.author || "Unknown Author",
        cover: data.cover || "",
        checkoutDate: data.checkoutDate || "Unknown",
        checkinDate: data.checkinDate || "Unknown",
        timestamp: data.historyTimestamp,
      });
    });

    return history;
  } catch (error) {
    console.error("Error fetching student history:", error);
    return [];
  }
}

// Add to firebaseDB.js
export async function addToHistory(
  studentId,
  studentName,
  book,
  action = "checkin",
) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("No user logged in");

    const historyRef = collection(db, `users/${userId}/history`);
    const historyDoc = doc(historyRef);

    const historyData = {
      studentId,
      studentName,
      isbn: book.isbn,
      title: book.title || "Unknown Book",
      author: book.author || "Unknown Author",
      cover: book.cover || "",
      checkoutDate: book.checkoutDate || new Date().toLocaleDateString(),
      checkinDate:
        action === "checkin" ? new Date().toLocaleDateString() : null,
      action: action,
      timestamp: new Date().toISOString(),
    };

    await setDoc(historyDoc, historyData);
    console.log(`Added ${action} to history for ${studentName}`);
    return true;
  } catch (error) {
    console.error("Error adding to history:", error);
    return false;
  }
}

// ========== CUSTOM BARCODES ==========
export async function getCustomBarcodes() {
  try {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const barcodesRef = collection(db, `users/${userId}/barcodes`);
    const snapshot = await getDocs(barcodesRef);
    const barcodes = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      barcodes.push({
        id: doc.id,
        ...data,
        // Ensure all required fields exist
        title: data.title || "Unknown Book",
        author: data.author || "Unknown Author",
        cover: data.cover || "",
      });
    });

    return barcodes.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  } catch (error) {
    console.error("Error fetching custom barcodes:", error);
    return [];
  }
}

export async function saveCustomBarcode(barcodeData) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("No user logged in");

    const barcodesRef = collection(db, `users/${userId}/barcodes`);

    // Check if barcode already exists
    const existingBarcodes = await getCustomBarcodes();
    const exists = existingBarcodes.some((b) => b.isbn === barcodeData.isbn);

    if (exists) {
      throw new Error("Barcode already exists");
    }

    const barcodeDoc = {
      isbn: barcodeData.isbn,
      title: barcodeData.title || "Unknown Book",
      author: barcodeData.author || "Unknown Author",
      cover: barcodeData.cover || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(barcodesRef, barcodeDoc);

    // Update app state
    if (window.appState) {
      window.appState.customBarcodes = await getCustomBarcodes();
    }

    return { ...barcodeDoc, id: docRef.id };
  } catch (error) {
    console.error("Error saving custom barcode:", error);
    throw error;
  }
}

export async function deleteCustomBarcode(barcodeId) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("No user logged in");

    const barcodeRef = doc(db, `users/${userId}/barcodes/${barcodeId}`);
    await deleteDoc(barcodeRef);

    // Update app state
    if (window.appState) {
      window.appState.customBarcodes = await getCustomBarcodes();
    }

    return true;
  } catch (error) {
    console.error("Error deleting custom barcode:", error);
    throw error;
  }
}

export async function deleteCustomBarcodes(barcodeIds) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("No user logged in");

    for (const barcodeId of barcodeIds) {
      const barcodeRef = doc(db, `users/${userId}/barcodes/${barcodeId}`);
      await deleteDoc(barcodeRef);
    }

    // Update app state
    if (window.appState) {
      window.appState.customBarcodes = await getCustomBarcodes();
    }

    return true;
  } catch (error) {
    console.error("Error deleting custom barcodes:", error);
    throw error;
  }
}

export async function syncLocalBarcodesToFirebase() {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { synced: 0, error: "No user logged in" };
    }

    // Get local barcodes from localStorage
    const localBarcodes = JSON.parse(
      localStorage.getItem("createdBarcodes") || "[]",
    );

    if (localBarcodes.length === 0) {
      return { synced: 0, message: "No local barcodes to sync" };
    }

    // Get existing Firebase barcodes
    const firebaseBarcodes = await getCustomBarcodes();
    const firebaseIsbns = firebaseBarcodes.map((b) => b.isbn);

    let syncedCount = 0;
    const errors = [];

    // Sync each local barcode that doesn't exist in Firebase
    for (const localBarcode of localBarcodes) {
      if (!firebaseIsbns.includes(localBarcode.isbn)) {
        try {
          await saveCustomBarcode(localBarcode);
          syncedCount++;
        } catch (error) {
          console.error(`Error syncing barcode ${localBarcode.isbn}:`, error);
          errors.push(localBarcode.isbn);
        }
      }
    }

    // If all synced successfully, clear local storage
    if (syncedCount > 0 && errors.length === 0) {
      localStorage.removeItem("createdBarcodes");
      console.log(`Successfully synced ${syncedCount} barcode(s) to Firebase`);
    }

    return {
      synced: syncedCount,
      errors: errors,
      message: `Synced ${syncedCount} barcode(s) to Firebase`,
    };
  } catch (error) {
    console.error("Error syncing local barcodes to Firebase:", error);
    return { synced: 0, error: error.message };
  }
}

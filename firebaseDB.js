import { db, auth } from "./firebase.js";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
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
    const historyRef = doc(db, `users/${userId}/history/${studentId}`);

    // If checking in, save to history first
    if (action === "checkin") {
      const historySnapshot = await getDocs(
        collection(db, `users/${userId}/history`),
      );
      const currentHistory =
        historySnapshot.docs.find((d) => d.id === studentId)?.data()?.items ||
        [];

      // Find which books were removed (checked in)
      const allStudents = await getStudents();
      const student = allStudents.find((s) => s.id === studentId);

      if (student && student.books) {
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

        // Save to history
        await setDoc(
          historyRef,
          { items: arrayUnion(...checkedInBooks) },
          { merge: true },
        );
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
export async function getStudentHistory(studentId) {
  try {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const historyRef = doc(db, `users/${userId}/history/${studentId}`);
    const snapshot = await getDocs(collection(db, `users/${userId}/history`));
    const historyDoc = snapshot.docs.find((d) => d.id === studentId);

    return historyDoc?.data()?.items || [];
  } catch (error) {
    console.error("Error getting history:", error);
    return [];
  }
}

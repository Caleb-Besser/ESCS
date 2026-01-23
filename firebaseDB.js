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

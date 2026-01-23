// studentManager.js - Updated for Firebase & Exports
import {
  getStudents,
  addStudent as firebaseAddStudent,
  removeStudents as firebaseRemoveStudents,
} from "../firebaseDB.js";
import {
  addStudentToList,
  sortStudents,
  renderSelectedBooks,
  showToast,
  showConfirm,
} from "./uiRenderer.js";
import { focusBarcodeInput } from "./barcodeScanner.js";

export async function addStudent(studentName) {
  if (!studentName) return;
  try {
    const updated = await firebaseAddStudent(studentName);
    appState.studentsContainer.innerHTML = "";
    appState.selectedStudents = [];
    const sortedStudents = sortStudents(updated, appState.currentSort);
    sortedStudents.forEach(addStudentToList);
    renderSelectedBooks();
    setTimeout(focusBarcodeInput, 500);
  } catch (error) {
    showToast("Error adding student", "#ef4444");
  }
}

export async function handlePrint() {
  if (!appState.selectedStudents.length) {
    showToast("Select at least one student.", "#ef4444");
    return;
  }
  try {
    const all = await getStudents();
    const toPrint = all.filter((s) => appState.selectedStudents.includes(s.id));
    // ... (Keep existing print HTML logic)
    console.log("Printing students:", toPrint);
    if (window.electronAPI) {
      // window.electronAPI.openPrintPreview(html);
    }
  } catch (error) {
    showToast("Error preparing print", "#ef4444");
  }
}

export async function handleRemoveStudent() {
  if (!appState.selectedStudents.length) {
    showToast("No students selected.", "#ef4444");
    return;
  }
  const confirmed = await showConfirm(
    "Remove Students",
    `Remove ${appState.selectedStudents.length} student(s)?`,
    true,
  );
  if (!confirmed) return;
  try {
    const updated = await firebaseRemoveStudents(appState.selectedStudents);
    appState.studentsContainer.innerHTML = "";
    appState.selectedStudents = [];
    const sortedStudents = sortStudents(updated, appState.currentSort);
    sortedStudents.forEach(addStudentToList);
    renderSelectedBooks();
    setTimeout(focusBarcodeInput, 500);
    showToast("Students removed successfully", "#10b981");
  } catch (error) {
    showToast("Error removing students", "#ef4444");
  }
}

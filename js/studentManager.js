// studentManager.js - Updated for Firebase
import {
  getStudents,
  addStudent as firebaseAddStudent,
  removeStudents as firebaseRemoveStudents,
  updateStudentBooks as firebaseUpdateStudentBooks,
} from "../firebaseDB.js";

async function addStudent(studentName) {
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
    console.error("Error adding student:", error);
    showToast("Error adding student", "#ef4444");
  }
}

async function handlePrint() {
  if (!appState.selectedStudents.length) {
    showToast("Select at least one student.", "#ef4444");
    return;
  }

  try {
    const all = await getStudents();
    const toPrint = all.filter((s) => appState.selectedStudents.includes(s.id));

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print Student Cards</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: letter; margin: 0.5in; }
    body { font-family: Arial, sans-serif; background: #fff; padding-top: 80px; }
    .cards-container { display: flex; flex-wrap: wrap; gap: 0.25in; justify-content: flex-start; }
    .card { width: 3.375in; height: 2.125in; border: 2px dashed #333; border-radius: 8px; padding: 0.15in; display: flex; flex-direction: column; justify-content: center; align-items: center; page-break-inside: avoid; }
    .card-name { font-size: 18px; font-weight: bold; margin-bottom: 0.1in; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-barcode svg { max-width: 100%; height: auto; max-height: 1in; }
    .print-controls { position: fixed; top: 0; left: 0; width: 100%; background: #f1f5f9; padding: 15px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: flex-end; z-index: 1000; }
    .print-btn { background: #0d9488; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    @media print { body { padding-top: 0; } .no-print { display: none !important; } }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script></head><body>
  <div class="print-controls no-print"><button class="print-btn" onclick="window.print()">Print Cards</button></div>
  <div class="cards-container">`;

    toPrint.forEach((s) => {
      html += `<div class="card"><div class="card-name">${s.name}</div><div class="card-barcode"><svg class="barcode" data-id="${s.id}"></svg></div></div>`;
    });

    html += `</div><script>
  document.querySelectorAll('.barcode').forEach(svg => {
    JsBarcode(svg, svg.getAttribute('data-id'), { format: 'CODE128', displayValue: true, height: 45, width: 2, fontSize: 14, margin: 5 });
  });
<\/script></body></html>`;
    if (window.electronAPI) {
      window.electronAPI.openPrintPreview(html);
    } else {
      console.error("Electron API not found");
    }
  } catch (error) {
    console.error("Error preparing print:", error);
    showToast("Error preparing print", "#ef4444");
  }
}

async function handleRemoveStudent() {
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
    console.error("Error removing students:", error);
    showToast("Error removing students", "#ef4444");
  }
}

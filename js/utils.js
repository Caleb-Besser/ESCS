// Utility functions and shared constants

function showToast(message, color) {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: ${color}; color: white;
    padding: 16px 24px; border-radius: 8px; font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function generateBarcodeSVG(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("jsbarcode-format", "CODE128");
  svg.setAttribute("jsbarcode-value", id);
  svg.setAttribute("class", "barcode-svg");
  svg.setAttribute("width", "180");
  svg.setAttribute("height", "60");
  return svg;
}

export function showSkeletons(count = 4) {
  const studentsContainer = document.getElementById("students");
  if (!studentsContainer) return;

  studentsContainer.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "student-skeleton";
    skeleton.innerHTML = `<div class="skeleton-bar"></div><div class="skeleton-bar short"></div>`;
    studentsContainer.appendChild(skeleton);
  }
}

// Add CSS for skeletons and toasts
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  .student-skeleton {
    padding: 16px;
    margin: 4px 0;
    border-radius: 8px;
    background: white;
  }

  .skeleton-bar {
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .skeleton-bar.short {
    width: 60%;
  }

  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
document.head.appendChild(style);

// Global state
window.appState = {
  selectedStudents: [],
  currentSort: "name-asc",
  studentsContainer: null,
  selectedBooksContainer: null,
  booksHeaderEl: null,
  logoutBtn: null,
  selectAllCheckbox: null,
  selectAllHeaderBtn: null,
  sortHeaderBtn: null,
  sortMenu: null,
  barcodeButton: null,
  barcodeMenu: null,
  dynamicControls: null,
  barcodeInput: null,
};

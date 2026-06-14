const state = {
  files: [],
  selected: new Set(),
  listView: false,
  activeId: null,
  mergedBlob: null,
  mergedName: "merged-document.pdf",
  mergedUrl: null,
};

const palette = ["#2867e8", "#14b8a6", "#f97316", "#7c3aed", "#db2777", "#0891b2", "#65a30d"];
const fileInput = document.getElementById("fileInput");
const landing = document.getElementById("landing");
const workspace = document.getElementById("workspace");
const processing = document.getElementById("processing");
const done = document.getElementById("done");
const dropzone = document.getElementById("dropzone");
const fileGrid = document.getElementById("fileGrid");
const selectAll = document.getElementById("selectAll");
const progressBar = document.getElementById("progressBar");
const previewTitle = document.getElementById("previewTitle");
const previewMeta = document.getElementById("previewMeta");
const previewEmpty = document.getElementById("previewEmpty");
const pdfPreview = document.getElementById("pdfPreview");
const resultPreview = document.getElementById("resultPreview");
const renameInput = document.getElementById("renameInput");
const themeToggle = document.getElementById("themeToggle");
const toggleControlsBtn = document.getElementById("toggleControlsBtn");
const controlsPanel = document.getElementById("controlsPanel");
const closePreviewBtn = document.getElementById("closePreviewBtn");
const previewPanel = document.getElementById("previewPanel");
let previewRenderToken = 0;
let resultRenderToken = 0;

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

document.getElementById("chooseBtn").addEventListener("click", () => fileInput.click());
document.getElementById("addBtn").addEventListener("click", () => fileInput.click());
document.getElementById("backBtn").addEventListener("click", () => showView("landing"));
document.getElementById("resultBackBtn").addEventListener("click", () => showView("workspace"));
document.getElementById("finishBtn").addEventListener("click", finishMerge);
document.getElementById("downloadBtn").addEventListener("click", downloadMerged);
document.getElementById("clearBtn").addEventListener("click", resetApp);
document.getElementById("listBtn").addEventListener("click", () => setListView(true));
document.getElementById("gridBtn").addEventListener("click", () => setListView(false));
document.getElementById("sortBtn").addEventListener("click", sortFiles);
document.getElementById("deleteBtn").addEventListener("click", deleteSelected);
document.getElementById("rotateLeftBtn").addEventListener("click", () => rotateSelected(-90));
document.getElementById("rotateRightBtn").addEventListener("click", () => rotateSelected(90));
document.getElementById("filesTab").addEventListener("click", () => setTab("files"));
document.getElementById("pagesTab").addEventListener("click", () => setTab("pages"));
themeToggle.addEventListener("click", toggleTheme);

if (toggleControlsBtn && controlsPanel) {
  toggleControlsBtn.addEventListener("click", () => {
    const isOpen = controlsPanel.classList.toggle("open");
    toggleControlsBtn.setAttribute("aria-expanded", String(isOpen));
  });
}

if (closePreviewBtn && previewPanel) {
  closePreviewBtn.addEventListener("click", () => {
    previewPanel.classList.remove("mobile-active");
  });
}

applyTheme(localStorage.getItem("mergeStudioTheme") || "dark");

fileInput.addEventListener("change", async (event) => {
  await addFiles([...event.target.files]);
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", async (event) => {
  await addFiles([...event.dataTransfer.files]);
});

dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") fileInput.click();
});

selectAll.addEventListener("change", () => {
  state.selected = new Set(selectAll.checked ? state.files.map((file) => file.id) : []);
  renderFiles();
});

async function addFiles(rawFiles) {
  const usable = rawFiles.filter((file) => {
    const name = file.name.toLowerCase();
    return file.size > 0 && (file.type === "application/pdf" || name.endsWith(".pdf"));
  });
  if (!usable.length) return;

  const items = await Promise.all(usable.map(async (file, index) => ({
    id: crypto.randomUUID(),
    sourceId: null,
    file,
    name: file.name,
    size: file.size,
    pages: await estimatePages(file),
    pageIndex: null,
    rotation: 0,
    url: URL.createObjectURL(file),
    accent: palette[(state.files.length + index) % palette.length],
  })));

  state.files.push(...items);
  state.activeId = state.activeId || items[0].id;
  showView("workspace");
  renderFiles();
}

async function estimatePages(file) {
  try {
    const text = await file.slice(0, Math.min(file.size, 6_000_000)).text();
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return Math.max(1, matches ? matches.length : 1);
  } catch {
    return Math.max(1, Math.round(file.size / 550_000));
  }
}

function showView(name) {
  [landing, workspace, processing, done].forEach((view) => view.classList.remove("active"));
  ({ landing, workspace, processing, done })[name].classList.add("active");
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (name === "workspace") updatePreview();
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("theme-light") ? "dark" : "light";
  applyTheme(nextTheme);
  localStorage.setItem("mergeStudioTheme", nextTheme);
}

function applyTheme(theme) {
  const light = theme === "light";
  document.body.classList.toggle("theme-light", light);
  themeToggle.setAttribute("aria-pressed", String(light));
  themeToggle.querySelector(".theme-toggle-text").textContent = light ? "Dark" : "Light";
}

function renderFiles() {
  fileGrid.classList.toggle("list", state.listView);
  fileGrid.innerHTML = "";
  selectAll.checked = state.files.length > 0 && state.selected.size === state.files.length;
  document.getElementById("deleteBtn").classList.toggle("disabled", state.selected.size === 0);

  state.files.forEach((item) => {
    const card = document.createElement("article");
    card.className = `file-card${item.id === state.activeId ? " active" : ""}`;
    card.draggable = true;
    card.dataset.id = item.id;
    card.style.setProperty("--accent-card", item.accent);
    card.style.setProperty("--rot", `${item.rotation}deg`);

    card.innerHTML = `
      <label class="card-check" aria-label="Select ${escapeHtml(item.name)}">
        <input type="checkbox" ${state.selected.has(item.id) ? "checked" : ""} />
      </label>
      <div class="page-thumb"></div>
      <span class="file-name" title="${escapeHtml(item.name)}">${shortName(item.name)}</span>
      <div class="page-count">${item.pages} ${item.pages === 1 ? "page" : "pages"}</div>
    `;

    card.addEventListener("click", (event) => {
      if (event.target.closest("input")) return;
      state.activeId = item.id;
      renderFiles();
      if (previewPanel) {
        previewPanel.classList.add("mobile-active");
      }
    });

    card.querySelector("input").addEventListener("change", (event) => {
      if (event.target.checked) state.selected.add(item.id);
      else state.selected.delete(item.id);
      renderFiles();
    });

    card.addEventListener("dragstart", (event) => {
      card.classList.add("dragging");
      event.dataTransfer.setData("text/plain", item.id);
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", (event) => event.preventDefault());
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      moveFile(event.dataTransfer.getData("text/plain"), item.id);
    });

    fileGrid.appendChild(card);
  });

  const addCard = document.createElement("button");
  addCard.type = "button";
  addCard.className = "add-card";
  addCard.textContent = "Add more PDFs";
  addCard.addEventListener("click", () => fileInput.click());
  fileGrid.appendChild(addCard);
  updatePreview();
}

function updatePreview() {
  const active = state.files.find((file) => file.id === state.activeId) || state.files[0];
  if (!active) {
    previewTitle.textContent = "No PDF selected";
    previewMeta.textContent = "0 pages";
    previewEmpty.style.display = "grid";
    pdfPreview.classList.remove("active");
    pdfPreview.innerHTML = "";
    if (previewPanel) {
      previewPanel.classList.remove("mobile-active");
    }
    return;
  }

  state.activeId = active.id;
  previewTitle.textContent = active.name;
  previewMeta.textContent = `${active.pages} ${active.pages === 1 ? "page" : "pages"}`;
  previewEmpty.style.display = "none";
  renderPdfToCanvas(active.url, pdfPreview, ++previewRenderToken, "preview");
}

function moveFile(sourceId, targetId) {
  if (!sourceId || sourceId === targetId) return;
  const sourceIndex = state.files.findIndex((item) => item.id === sourceId);
  const targetIndex = state.files.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [source] = state.files.splice(sourceIndex, 1);
  state.files.splice(targetIndex, 0, source);
  renderFiles();
}

function setListView(enabled) {
  state.listView = enabled;
  document.getElementById("listBtn").classList.toggle("active", enabled);
  document.getElementById("gridBtn").classList.toggle("active", !enabled);
  renderFiles();
}

function setTab(tab) {
  document.getElementById("filesTab").classList.toggle("active", tab === "files");
  document.getElementById("pagesTab").classList.toggle("active", tab === "pages");
  if (tab === "pages") splitIntoPages();
  setListView(false);
}

function splitIntoPages() {
  state.files = state.files.flatMap((item) => {
    if (item.pages <= 1 || Number.isInteger(item.pageIndex)) return [item];
    return Array.from({ length: item.pages }, (_, index) => ({
      ...item,
      id: crypto.randomUUID(),
      sourceId: item.id,
      name: `${item.name.replace(/\.pdf$/i, "")} - page ${index + 1}.pdf`,
      pages: 1,
      pageIndex: index,
    }));
  });
  state.activeId = state.files[0]?.id || null;
}

function sortFiles() {
  state.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  renderFiles();
}

function deleteSelected() {
  if (!state.selected.size) return;
  state.files = state.files.filter((file) => !state.selected.has(file.id));
  state.selected.clear();
  if (!state.files.some((file) => file.id === state.activeId)) {
    state.activeId = state.files[0]?.id || null;
  }
  renderFiles();
}

function rotateSelected(degrees) {
  const ids = state.selected.size ? state.selected : new Set(state.activeId ? [state.activeId] : []);
  state.files.forEach((item) => {
    if (ids.has(item.id)) item.rotation = (item.rotation + degrees + 360) % 360;
  });
  renderFiles();
}

async function finishMerge() {
  if (!state.files.length) {
    fileInput.click();
    return;
  }

  showView("processing");
  progressBar.style.width = "0%";
  const progressTimer = animateProgress();

  try {
    state.mergedBlob = await mergeFiles();
  } finally {
    clearInterval(progressTimer);
    progressBar.style.width = "100%";
  }

  await wait(450);
  prepareResult();
  showView("done");
}

function animateProgress() {
  let value = 0;
  return setInterval(() => {
    value = Math.min(92, value + Math.random() * 13);
    progressBar.style.width = `${value}%`;
  }, 180);
}

async function mergeFiles() {
  if (window.PDFLib) {
    try {
      const merged = await PDFLib.PDFDocument.create();
      for (const item of state.files) {
        const source = await PDFLib.PDFDocument.load(await item.file.arrayBuffer(), { ignoreEncryption: true });
        const indices = Number.isInteger(item.pageIndex) ? [item.pageIndex] : source.getPageIndices();
        const copied = await merged.copyPages(source, indices.filter((index) => index < source.getPageCount()));
        copied.forEach((page) => {
          if (item.rotation) page.setRotation(PDFLib.degrees(item.rotation));
          merged.addPage(page);
        });
      }
      const bytes = await merged.save();
      return new Blob([bytes], { type: "application/pdf" });
    } catch {
      return createFallbackPdf();
    }
  }
  return createFallbackPdf();
}

function createFallbackPdf() {
  const safeNames = state.files.map((item, index) => `${index + 1}. ${item.name}`).join(" | ");
  const body = `BT /F1 20 Tf 72 730 Td (Merged PDF) Tj /F1 12 Tf 0 -34 Td (Files: ${safePdfText(safeNames).slice(0, 620)}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${body.length} >> stream\n${body}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function prepareResult() {
  const first = state.files[0];
  const totalPages = state.files.reduce((sum, file) => sum + file.pages, 0);
  const totalSize = state.files.reduce((sum, file) => sum + file.size, 0);
  const base = first?.name?.replace(/\.[^.]+$/, "") || "merged-document";
  state.mergedName = `${base}-merged.pdf`;

  if (state.mergedUrl) URL.revokeObjectURL(state.mergedUrl);
  state.mergedUrl = URL.createObjectURL(state.mergedBlob);

  document.getElementById("resultName").textContent = state.mergedName;
  document.getElementById("resultMeta").textContent = `${formatMb(totalSize)} MB - ${totalPages} pages`;
  renameInput.value = state.mergedName;
  renderPdfToCanvas(state.mergedUrl, resultPreview, ++resultRenderToken, "result");
}

function downloadMerged() {
  if (!state.mergedBlob) return;
  state.mergedName = normalizePdfName(renameInput.value);
  const link = document.createElement("a");
  link.href = state.mergedUrl || URL.createObjectURL(state.mergedBlob);
  link.download = state.mergedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function resetApp() {
  new Set(state.files.map((item) => item.url)).forEach((url) => URL.revokeObjectURL(url));
  if (state.mergedUrl) URL.revokeObjectURL(state.mergedUrl);
  state.files = [];
  state.selected.clear();
  state.activeId = null;
  state.mergedBlob = null;
  state.mergedUrl = null;
  pdfPreview.innerHTML = "";
  resultPreview.innerHTML = "";
  renderFiles();
  showView("landing");
}

async function renderPdfToCanvas(url, container, token, target) {
  container.classList.add("active");
  container.innerHTML = '<div class="render-note">Loading preview...</div>';

  if (!window.pdfjsLib) {
    container.innerHTML = '<div class="render-note">Preview renderer could not load. Download still works.</div>';
    return;
  }

  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    if (!isCurrentRender(token, target)) return;

    container.innerHTML = "";
    const maxPages = target === "result" ? Math.min(pdf.numPages, 12) : 1;
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      if (!isCurrentRender(token, target)) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(280, container.clientWidth - 42);
      const scale = Math.min(1.6, availableWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      if (!isCurrentRender(token, target)) return;
      container.appendChild(canvas);
    }

    if (pdf.numPages > maxPages) {
      const note = document.createElement("div");
      note.className = "render-note";
      note.textContent = `Showing ${maxPages} of ${pdf.numPages} pages. Download includes the full PDF.`;
      container.appendChild(note);
    }
  } catch {
    container.innerHTML = '<div class="render-note">This PDF cannot be previewed here, but download still works.</div>';
  }
}

function isCurrentRender(token, target) {
  return target === "result" ? token === resultRenderToken : token === previewRenderToken;
}

function shortName(name) {
  const base = name.replace(/\.[^.]+$/, "");
  return base.length > 24 ? `${base.slice(0, 21)}...` : base;
}

function formatMb(bytes) {
  return Math.max(.1, bytes / 1024 / 1024).toFixed(bytes > 10_000_000 ? 0 : 1);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function safePdfText(value) {
  return value.replace(/[()\\]/g, " ").replace(/[^\x20-\x7E]/g, "");
}

function normalizePdfName(value) {
  const cleaned = (value || "merged-document.pdf")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

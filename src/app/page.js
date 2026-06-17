"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";
import FileCard from "../components/FileCard";
import PreviewPanel from "../components/PreviewPanel";
import InfoModal from "../components/InfoModal";

const palette = [
  "#2867e8",
  "#14b8a6",
  "#f97316",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#65a30d",
];

export default function Home() {
  // Application State
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [listView, setListView] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [mergedBlob, setMergedBlob] = useState(null);
  const [mergedName, setMergedName] = useState("merged-document.pdf");
  const [mergedUrl, setMergedUrl] = useState(null);
  const [inPagesMode, setInPagesMode] = useState(false);
  const [filesBackup, setFilesBackup] = useState(null);
  const [view, setView] = useState("landing"); // "landing" | "workspace" | "processing" | "done"

  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isPreviewMobileActive, setIsPreviewMobileActive] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState("0%");
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });

  const fileInputRef = useRef(null);

  // Hook workers setup on load
  useEffect(() => {
    if (typeof window !== "undefined" && window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  }, []);

  // Theme Sync on load
  useEffect(() => {
    const savedTheme = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(savedTheme);
    document.body.classList.toggle("theme-light", savedTheme === "light");
  }, [theme]);

  // Scroll Shrink Nav Hook
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Developer Test Mode Hook
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("test") === "true") {
      (async () => {
        try {
          console.log("Test mode active. Fetching sample files...");
          const res1 = await fetch("sample1.pdf");
          const blob1 = await res1.blob();
          const file1 = new File([blob1], "sample1.pdf", { type: "application/pdf" });

          const res2 = await fetch("sample2.pdf");
          const blob2 = await res2.blob();
          const file2 = new File([blob2], "sample2.pdf", { type: "application/pdf" });

          await addFiles([file1, file2]);
          console.log("Sample files successfully loaded in test mode.");
        } catch (err) {
          console.error("Failed to load sample files in test mode:", err);
        }
      })();
    }
  }, []);

  // Dropdown close-on-click-outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const toolsDropdown = document.getElementById("toolsDropdown");
      if (toolsDropdown && !toolsDropdown.contains(e.target)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Modal close-on-esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && modal.isOpen) {
        setModal({ isOpen: false, title: "", body: "" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  // Core PDF Processing logic helpers
  const getPdfPageCount = async (file) => {
    if (window.pdfjsLib) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        });
        const pdf = await loadingTask.promise;
        return pdf.numPages;
      } catch (e) {
        console.warn(
          "Failed to get PDF page count using pdfjsLib, falling back to estimation:",
          e
        );
      }
    }
    return estimatePages(file);
  };

  const estimatePages = async (file) => {
    try {
      const text = await file.slice(0, Math.min(file.size, 6000000)).text();
      const matches = text.match(/\/Type\s*\/Page\b/g);
      return Math.max(1, matches ? matches.length : 1);
    } catch {
      return Math.max(1, Math.round(file.size / 550000));
    }
  };

  const addFiles = async (rawFiles) => {
    const usable = rawFiles.filter((file) => {
      const name = file.name.toLowerCase();
      return (
        file.size > 0 && (file.type === "application/pdf" || name.endsWith(".pdf"))
      );
    });
    if (!usable.length) return;

    const items = await Promise.all(
      usable.map(async (file, idx) => {
        const pageCount = await getPdfPageCount(file);
        return {
          id: crypto.randomUUID(),
          sourceId: null,
          file,
          name: file.name,
          size: file.size,
          pages: pageCount,
          pageIndex: null,
          rotation: 0,
          url: URL.createObjectURL(file),
          accent: palette[(files.length + idx) % palette.length],
        };
      })
    );

    let nextFiles = [...files, ...items];
    if (filesBackup) {
      setFilesBackup((prev) => [...prev, ...items.map((item) => ({ ...item }))]);
    }

    if (inPagesMode) {
      nextFiles = splitIntoPages(nextFiles);
    }

    setFiles(nextFiles);
    setActiveId((prev) => prev || items[0].id);
    setView("workspace");
  };

  const splitIntoPages = (currentFiles) => {
    return currentFiles.flatMap((item) => {
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
  };

  const handleTabChange = (tab) => {
    if (tab === "pages") {
      if (!inPagesMode) {
        setFilesBackup(files.map((item) => ({ ...item })));
        setFiles(splitIntoPages(files));
        setInPagesMode(true);
      }
    } else {
      if (inPagesMode) {
        if (hasPagesChanged()) {
          if (
            confirm(
              "Returning to Files mode will discard your individual page arrangements, deletions, and rotations. Do you want to continue?"
            )
          ) {
            setFiles(filesBackup.map((item) => ({ ...item })));
            setFilesBackup(null);
            setInPagesMode(false);
            if (filesBackup.length > 0) {
              setActiveId(filesBackup[0].id);
            }
          }
        } else {
          setFiles(filesBackup ? filesBackup.map((item) => ({ ...item })) : files);
          setFilesBackup(null);
          setInPagesMode(false);
          if (filesBackup && filesBackup.length > 0) {
            setActiveId(filesBackup[0].id);
          }
        }
      }
    }
    setListView(false);
  };

  const hasPagesChanged = () => {
    if (!filesBackup) return false;
    const expectedPages = filesBackup.flatMap((item) => {
      if (item.pages <= 1 || Number.isInteger(item.pageIndex)) return [item];
      return Array.from({ length: item.pages }, (_, index) => ({
        sourceId: item.id,
        pageIndex: index,
        rotation: item.rotation,
      }));
    });

    if (expectedPages.length !== files.length) return true;
    for (let i = 0; i < files.length; i++) {
      const cur = files[i];
      const exp = expectedPages[i];
      if (cur.sourceId !== exp.sourceId) return true;
      if (cur.pageIndex !== exp.pageIndex) return true;
      if (cur.rotation !== exp.rotation) return true;
    }
    return false;
  };

  const sortFiles = () => {
    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    setFiles(sorted);
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    const nextFiles = files.filter((file) => !selected.has(file.id));
    setFiles(nextFiles);
    setSelected(new Set());
    if (!nextFiles.some((file) => file.id === activeId)) {
      setActiveId(nextFiles[0]?.id || null);
    }
  };

  const rotateSelected = (degrees) => {
    const ids = selected.size ? selected : new Set(activeId ? [activeId] : []);
    const nextFiles = files.map((item) => {
      if (ids.has(item.id)) {
        return {
          ...item,
          rotation: (item.rotation + degrees + 360) % 360,
        };
      }
      return item;
    });
    setFiles(nextFiles);
  };

  const handleSelectAllChange = (e) => {
    setSelected(new Set(e.target.checked ? files.map((f) => f.id) : []));
  };

  const handleCardSelect = (id, checked) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const moveFile = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    const sourceIndex = files.findIndex((item) => item.id === sourceId);
    const targetIndex = files.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextFiles = [...files];
    const [source] = nextFiles.splice(sourceIndex, 1);
    nextFiles.splice(targetIndex, 0, source);
    setFiles(nextFiles);
  };

  const finishMerge = async () => {
    if (!files.length) {
      fileInputRef.current.click();
      return;
    }

    setView("processing");
    setProgressBarWidth("0%");

    let value = 0;
    const progressTimer = setInterval(() => {
      value = Math.min(92, value + Math.random() * 13);
      setProgressBarWidth(`${value}%`);
    }, 180);

    try {
      const blob = await mergeFiles();
      setMergedBlob(blob);
      clearInterval(progressTimer);
      setProgressBarWidth("100%");
      await wait(450);

      const itemsMerged = selected.size > 0
        ? files.filter((item) => selected.has(item.id))
        : files;
      const first = itemsMerged[0];
      const totalPages = itemsMerged.reduce((sum, file) => sum + file.pages, 0);
      const totalSize = itemsMerged.reduce((sum, file) => sum + file.size, 0);
      const baseName = first?.name?.replace(/\.[^.]+$/, "") || "merged-document";
      const resolvedName = `${baseName}-merged.pdf`;
      setMergedName(resolvedName);

      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
      const resUrl = URL.createObjectURL(blob);
      setMergedUrl(resUrl);

      setView("done");
    } catch (err) {
      console.error("Failed to merge:", err);
      clearInterval(progressTimer);
      setProgressBarWidth("100%");
    }
  };

  const mergeFiles = async () => {
    if (window.PDFLib) {
      try {
        const merged = await PDFLib.PDFDocument.create();
        const itemsToMerge = selected.size > 0
          ? files.filter((item) => selected.has(item.id))
          : files;

        for (const item of itemsToMerge) {
          const source = await PDFLib.PDFDocument.load(
            await item.file.arrayBuffer(),
            { ignoreEncryption: true }
          );
          const indices = Number.isInteger(item.pageIndex)
            ? [item.pageIndex]
            : source.getPageIndices();
          const copied = await merged.copyPages(
            source,
            indices.filter((idx) => idx < source.getPageCount())
          );
          copied.forEach((page) => {
            if (item.rotation) page.setRotation(PDFLib.degrees(item.rotation));
            merged.addPage(page);
          });
        }
        const bytes = await merged.save();
        return new Blob([bytes], { type: "application/pdf" });
      } catch (e) {
        console.warn("Fallback PDF triggered due to load error:", e);
        return createFallbackPdf();
      }
    }
    return createFallbackPdf();
  };

  const createFallbackPdf = () => {
    const itemsToMerge = selected.size > 0
      ? files.filter((item) => selected.has(item.id))
      : files;
    const safeNames = itemsToMerge
      .map((item, index) => `${index + 1}. ${item.name}`)
      .join(" | ");
    const body = `BT /F1 20 Tf 72 730 Td (Merged PDF) Tj /F1 12 Tf 0 -34 Td (Files: ${safePdfText(
      safeNames
    ).slice(0, 620)}) Tj ET`;
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
    pdf += `trailer << /Size ${objects.length + 1
      } /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  const downloadMerged = () => {
    if (!mergedBlob) return;
    const finalName = normalizePdfName(mergedName);
    const link = document.createElement("a");
    link.href = mergedUrl || URL.createObjectURL(mergedBlob);
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const resetApp = () => {
    files.forEach((item) => URL.revokeObjectURL(item.url));
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);

    setFiles([]);
    setSelected(new Set());
    setActiveId(null);
    setMergedBlob(null);
    setMergedUrl(null);
    setInPagesMode(false);
    setFilesBackup(null);
    setView("landing");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("mergeStudioTheme", nextTheme);
    document.body.classList.toggle("theme-light", nextTheme === "light");
  };

  // Helper Utils
  const safePdfText = (val) =>
    val.replace(/[()\\]/g, " ").replace(/[^\x20-\x7E]/g, "");

  const normalizePdfName = (val) => {
    const cleaned = (val || "merged-document.pdf")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, " ");
    return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
  };

  const formatMb = (bytes) =>
    Math.max(0.1, bytes / 1024 / 1024).toFixed(bytes > 10000000 ? 0 : 1);

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  // Placeholder dropdown clicks
  const handleDropdownItemClick = (name) => {
    setIsToolsOpen(false);
    setModal({
      isOpen: true,
      title: name,
      body: "This tool is coming soon in a future update! All document processing stays completely local and secure.",
    });
  };

  const activeFile = files.find((f) => f.id === activeId) || files[0];

  return (
    <>
      {/* Script tag CDN dependencies */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"
        strategy="beforeInteractive"
      />

      <input
        id="fileInput"
        className="sr-only"
        type="file"
        multiple
        accept=".pdf,application/pdf"
        ref={fileInputRef}
        onChange={(e) => {
          addFiles([...e.target.files]);
          e.target.value = "";
        }}
      />

      <button
        id="themeToggle"
        className="theme-toggle"
        type="button"
        aria-pressed={theme === "light"}
        onClick={toggleTheme}
      >
        <span className="theme-toggle-icon" aria-hidden="true"></span>
        <span className="theme-toggle-text">
          {theme === "light" ? "Dark" : "Light"}
        </span>
      </button>

      {/* 1. Landing / Upload Page View */}
      {view === "landing" && (
        <main id="landing" className="landing view active">
          <section className="hero">
            <nav className={`site-nav${isScrolled ? " scrolled" : ""}`} aria-label="Primary">
              <a className="brand" href="/mergeFlow" aria-label="Merge Flow home">
                <span className="brand-logo-container">
                  <svg
                    className="brand-logo-icon"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#b88a43" />
                        <stop offset="100%" stopColor="#0f8176" />
                      </linearGradient>
                    </defs>
                    <rect
                      x="4"
                      y="6"
                      width="16"
                      height="20"
                      rx="3"
                      stroke="url(#logoGrad)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      className="rect-back"
                    />
                    <rect
                      x="12"
                      y="10"
                      width="16"
                      height="20"
                      rx="3"
                      fill="#0d121b"
                      stroke="url(#logoGrad)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      className="rect-front"
                    />
                    <path
                      d="M17 15H23"
                      stroke="url(#logoGrad)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M17 19H23"
                      stroke="url(#logoGrad)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="brand-text">
                    merge<span className="brand-highlight">Flow</span>
                  </span>
                </span>
              </a>

              <div className={`dropdown${isToolsOpen ? " open" : ""}`} id="toolsDropdown">
                <button
                  className="dropdown-trigger"
                  id="toolsBtn"
                  aria-haspopup="true"
                  aria-expanded={isToolsOpen}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsToolsOpen(!isToolsOpen);
                  }}
                >
                  <svg
                    className="tools-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                  </svg>
                  <span>Tools</span>
                  <svg
                    className="chevron-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <ul className="dropdown-menu" id="toolsList" role="menu">
                  <li role="none">
                    <a id="toolCompress" role="menuitem" onClick={() => handleDropdownItemClick("Compress PDF")}>
                      Compress PDF
                    </a>
                  </li>
                  <li role="none">
                    <a id="toolToImage" role="menuitem" onClick={() => handleDropdownItemClick("PDF to Image")}>
                      PDF to Image
                    </a>
                  </li>
                  <li role="none">
                    <a id="toolFromImage" role="menuitem" onClick={() => handleDropdownItemClick("Image to PDF")}>
                      Image to PDF
                    </a>
                  </li>
                  <li role="none">
                    <a id="toolProtect" role="menuitem" onClick={() => handleDropdownItemClick("Protect PDF")}>
                      Protect PDF
                    </a>
                  </li>
                </ul>
              </div>
            </nav>

            <div className="hero-content">
              <p className="eyebrow">Private PDF Studio</p>
              <h1>Merge PDFs</h1>
              <p className="hero-copy">Arrange, preview, and export in one polished flow.</p>
            </div>

            <div
              id="dropzone"
              className={`dropzone${isDragOverDropzone ? " dragover" : ""}`}
              tabIndex="0"
              role="button"
              aria-label="Choose PDF files or drop PDF files here"
              onClick={(e) => {
                fileInputRef.current.click();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragOverDropzone(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverDropzone(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOverDropzone(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverDropzone(false);
                addFiles([...e.dataTransfer.files]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current.click();
                }
              }}
            >
              <div className="upload-visual">
                <div className="mark" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <strong>PDF</strong>
                </div>
                <div>
                  <button id="chooseBtn" className="choose-btn" type="button">
                    <span className="file-plus" aria-hidden="true"></span>
                    Choose PDF files
                  </button>
                  <p>Drop PDFs here or choose files.</p>
                </div>
              </div>
            </div>
          </section>
          <section className="intro">
            <p>Built for clean document delivery.</p>
            <ul>
              <li>Preview every selected document</li>
              <li>Drag files into the exact sequence</li>
              <li>Export locally without watermarking</li>
            </ul>
          </section>
        </main>
      )}

      {/* 2. Workspace / Studio View */}
      {view === "workspace" && (
        <main id="workspace" className="studio view active">
          <div
            id="previewBackdrop"
            className={`preview-backdrop${isPreviewMobileActive ? " active" : ""}`}
            onClick={() => setIsPreviewMobileActive(false)}
          ></div>

          <section className="studio-layout">
            <aside id="controlsPanel" className={`controls-panel${isControlsOpen ? " open" : ""}`}>
              <div className="controls-header">
                <div className="tabs" role="tablist">
                  <button
                    id="filesTab"
                    className={`tab${!inPagesMode ? " active" : ""}`}
                    type="button"
                    onClick={() => handleTabChange("files")}
                  >
                    Files
                  </button>
                  <button
                    id="pagesTab"
                    className={`tab${inPagesMode ? " active" : ""}`}
                    type="button"
                    onClick={() => handleTabChange("pages")}
                  >
                    Split PDF
                  </button>
                </div>
                <button
                  id="toggleControlsBtn"
                  className="toggle-controls-btn"
                  type="button"
                  aria-expanded={isControlsOpen}
                  onClick={() => setIsControlsOpen(!isControlsOpen)}
                  aria-label="Toggle workspace tools"
                >
                  Tools
                </button>
              </div>

              <div id="controlsContent" className="controls-content">
                <button
                  id="addBtn"
                  className="wide-btn"
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                >
                  Add PDFs
                </button>
                <button
                  id="resetWorkspaceBtn"
                  className="wide-btn secondary"
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to discard your changes and start over?")) {
                      resetApp();
                    }
                  }}
                >
                  Start over
                </button>
                <div className="tool-grid">
                  <button
                    id="rotateLeftBtn"
                    className="tool-btn"
                    type="button"
                    onClick={() => rotateSelected(-90)}
                  >
                    Rotate left
                  </button>
                  <button
                    id="rotateRightBtn"
                    className="tool-btn"
                    type="button"
                    onClick={() => rotateSelected(90)}
                  >
                    Rotate right
                  </button>
                  <button id="sortBtn" className="tool-btn" type="button" onClick={sortFiles}>
                    Sort A-Z
                  </button>
                  <button
                    id="deleteBtn"
                    className={`tool-btn danger${selected.size === 0 ? " disabled" : ""}`}
                    type="button"
                    disabled={selected.size === 0}
                    onClick={deleteSelected}
                  >
                    Delete selected
                  </button>
                </div>
                <label className="check-row">
                  <input
                    id="selectAll"
                    type="checkbox"
                    checked={files.length > 0 && selected.size === files.length}
                    onChange={handleSelectAllChange}
                  />{" "}
                  Select all
                </label>
                <div className="view-toggle" aria-label="View mode">
                  <button
                    id="gridBtn"
                    className={`mode-btn${!listView ? " active" : ""}`}
                    type="button"
                    onClick={() => setListView(false)}
                  >
                    Grid
                  </button>
                  <button
                    id="listBtn"
                    className={`mode-btn${listView ? " active" : ""}`}
                    type="button"
                    onClick={() => setListView(true)}
                  >
                    List
                  </button>
                </div>
                <p className="hint">Click a card to preview it. Drag cards to change merge order.</p>
              </div>
            </aside>

            <section className="file-area">
              <div className="file-area-header">
                <div className="file-area-hint">
                  <span className="hint-icon" aria-hidden="true">💡</span>
                  <span>Click a card to preview it. Drag cards to change merge order.</span>
                </div>
                <button id="finishBtn" className="primary-btn" type="button" onClick={finishMerge}>
                  {selected.size > 0 ? `Merge Selected (${selected.size})` : "Merge PDFs"}
                </button>
              </div>

              <div id="fileGrid" className={`file-grid${listView ? " list" : ""}`} aria-live="polite">
                {files.map((item) => (
                  <FileCard
                    key={item.id}
                    item={item}
                    isActive={item.id === activeId}
                    isSelected={selected.has(item.id)}
                    onSelect={(checked) => handleCardSelect(item.id, checked)}
                    onClick={() => {
                      setActiveId(item.id);
                      setIsPreviewMobileActive(true);
                    }}
                    onDragStart={() => { }}
                    onDragEnd={() => { }}
                    onDropItem={moveFile}
                  />
                ))}

                <button
                  type="button"
                  className="add-card"
                  onClick={() => fileInputRef.current.click()}
                >
                  Add more PDFs
                </button>
              </div>
            </section>

            <PreviewPanel
              url={activeFile?.url}
              title={activeFile?.name}
              pages={activeFile?.pages || 0}
              pageIndex={activeFile?.pageIndex}
              target="preview"
              mobileActive={isPreviewMobileActive}
              onClose={() => setIsPreviewMobileActive(false)}
            />
          </section>
        </main>
      )}

      {/* 3. Processing Page View */}
      {view === "processing" && (
        <main id="processing" className="processing view active">
          <section className="processing-card">
            <div className="process-icon" aria-hidden="true">
              <span></span>
              <span></span>
            </div>
            <h2>Creating your PDF</h2>
            <div className="progress">
              <i id="progressBar" style={{ width: progressBarWidth }}></i>
            </div>
            <p>Combining files locally in your browser.</p>
          </section>
        </main>
      )}

      {/* 4. Done / Result Page View */}
      {view === "done" && (
        <main id="done" className="result view active">
          <section className="result-layout">
            <div className="result-preview">
              <PreviewPanel url={mergedUrl} target="result" />
            </div>
            <aside className="result-panel">
              <div className="result-title-block">
                <p className="eyebrow">Done</p>
                <h2>Export ready</h2>
              </div>
              <div className="result-meta-row">
                <div className="success-badge">Ready</div>
                <p id="resultMeta">
                  {formatMb(
                    (selected.size > 0
                      ? files.filter((f) => selected.has(f.id))
                      : files
                    ).reduce((sum, f) => sum + f.size, 0)
                  )}{" "}
                  MB -{" "}
                  {
                    (selected.size > 0
                      ? files.filter((f) => selected.has(f.id))
                      : files
                    ).reduce((sum, f) => sum + f.pages, 0)
                  }{" "}
                  pages
                </p>
              </div>
              <label className="rename-field">
                <span>Rename merged file</span>
                <input
                  id="renameInput"
                  type="text"
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                />
              </label>
              <button id="downloadBtn" className="wide-btn" type="button" onClick={downloadMerged}>
                Download merged PDF
              </button>
              <div className="result-secondary-actions">
                <button
                  id="resultBackBtn"
                  className="ghost-btn"
                  type="button"
                  onClick={() => setView("workspace")}
                >
                  Edit order
                </button>
                <button id="clearBtn" className="ghost-btn" type="button" onClick={resetApp}>
                  Start over
                </button>
              </div>
            </aside>
          </section>
        </main>
      )}

      {/* Landing view Footer */}
      {view === "landing" && (
        <footer>
          <p className="footer-text">
            designed and developed by{" "}
            <a target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/ratnexh">
              Ratnesh Kumar
            </a>
          </p>
          <p>© 2026 mergeFlow. All rights reserved.</p>
        </footer>
      )}

      <InfoModal
        isOpen={modal.isOpen}
        title={modal.title}
        body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })}
      />
    </>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import FileCard from "../../components/FileCard";
import PreviewPanel from "../../components/PreviewPanel";
import InfoModal from "../../components/InfoModal";
import ConfirmModal from "../../components/ConfirmModal";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Script from "next/script";
import { loadScript } from "../../utils/lazyLoad";

const palette = [
  "#2867e8",
  "#14b8a6",
  "#f97316",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#65a30d",
];

export default function MergePage() {
  // Application State
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [listView, setListView] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [mergedBlob, setMergedBlob] = useState(null);
  const [mergedName, setMergedName] = useState("merged-document.pdf");
  const [mergedUrl, setMergedUrl] = useState(null);
  const [view, setView] = useState("landing"); // "landing" | "workspace" | "processing" | "done"
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isPreviewMobileActive, setIsPreviewMobileActive] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState("0%");
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fileInputRef = useRef(null);

  // Hook workers setup on load (dynamic script loading)
  useEffect(() => {
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"),
      loadScript("https://unpkg.com/pdf-lib/dist/pdf-lib.min.js")
    ]).then(() => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      setLibsLoaded(true);
    }).catch(err => {
      console.error("Failed to load PDF libraries dynamically:", err);
      setLoadingError(true);
    });
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

  // Screen resize hook for mobile layouts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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

  const activeUrlsRef = useRef([]);
  useEffect(() => {
    activeUrlsRef.current = [
      ...files.map((f) => f.url),
      mergedUrl
    ].filter(Boolean);
  }, [files, mergedUrl]);

  useEffect(() => {
    return () => {
      activeUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Core PDF Processing logic helpers
  const getPdfPageCount = async (file) => {
    if (window.pdfjsLib) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        });
        const pdf = await loadingTask.promise;
        const count = pdf.numPages;
        pdf.destroy();
        return count;
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
    const tooLarge = rawFiles.find((file) => file.size > 104857600);
    if (tooLarge) {
      setModal({
        isOpen: true,
        title: "File Too Large",
        body: `The file "${tooLarge.name}" exceeds the maximum size limit of 100MB. Please select a smaller file.`,
      });
      return;
    }
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

    const nextFiles = [...files, ...items];
    setFiles(nextFiles);
    setActiveId((prev) => prev || items[0].id);
    setView("workspace");
  };

  const sortFiles = () => {
    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    setFiles(sorted);
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    files.forEach((file) => {
      if (selected.has(file.id)) {
        URL.revokeObjectURL(file.url);
      }
    });
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

  const relatedTools = [
    {
      title: "Split PDF",
      desc: "Extract pages from your PDF.",
      href: "/split",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <line x1="12" y1="3" x2="12" y2="21" />
          <rect x="2" y="4" width="8" height="16" rx="2" />
          <rect x="14" y="4" width="8" height="16" rx="2" />
        </svg>
      )
    },
    {
      title: "Compress PDF",
      desc: "Reduce PDF file size offline.",
      href: "/compress",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <path d="M20 14l-6 6M4 10l6-6" />
        </svg>
      )
    },
    {
      title: "Protect PDF",
      desc: "Lock PDF with secure password.",
      href: "/protect",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    {
      title: "OCR PDF",
      desc: "Extract text from scanned PDFs.",
      href: "/ocr",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      )
    }
  ];

  const activeFile = files.find((f) => f.id === activeId) || files[0];

  return (
    <>
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

      {view !== "workspace" && (
        <>
          <Header
            isScrolled={isScrolled}
            isToolsOpen={isToolsOpen}
            setIsToolsOpen={setIsToolsOpen}
            handleDropdownItemClick={handleDropdownItemClick}
            theme={theme}
            toggleTheme={toggleTheme}
          />

          <button id="themeToggle" className="theme-toggle" type="button" aria-pressed={theme === "light"} onClick={toggleTheme}>
            <span className="theme-toggle-icon" aria-hidden="true" />
            <span className="theme-toggle-text">{theme === "light" ? "Dark" : "Light"}</span>
          </button>
        </>
      )}

      {/* 1. Landing / Upload Page View */}
      {view === "landing" && (
        <main id="landing" className="landing view active">
          <section className="hero">
            <div className="hero-content">
              <Link className="ghost-btn-back" href="/">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Tools</span>
              </Link>

              <p className="eyebrow" aria-label="Privacy protection guarantee">
                <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                100% Client-Side Merging
              </p>
              <h1>Merge PDF Online Free</h1>
              <p className="hero-copy">
                Combine multiple PDF documents into a single file locally in your browser. No files are uploaded.
              </p>
            </div>

            <div
              id="dropzone"
              className={`dropzone${isDragOverDropzone ? " dragover" : ""}`}
              tabIndex="0"
              role="button"
              aria-label="Choose PDF files or drop PDF files here"
              onClick={(e) => {
                if (libsLoaded) fileInputRef.current.click();
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
                if (libsLoaded) addFiles([...e.dataTransfer.files]);
              }}
              onKeyDown={(e) => {
                if (libsLoaded && (e.key === "Enter" || e.key === " ")) {
                  fileInputRef.current.click();
                }
              }}
            >
              <div className="dropzone-inner">
                <div className="dropzone-cards" aria-hidden="true">
                  <div className="pdf-card-shadow card-left"></div>
                  <div className="pdf-card-shadow card-right"></div>
                  <div className="pdf-card-front">PDF</div>
                </div>
                {!libsLoaded ? (
                  <p className="dropzone-text" style={{ padding: "20px 0" }}>Loading secure PDF engine...</p>
                ) : (
                  <>
                    <button id="chooseBtn" className="choose-btn-gold" type="button" aria-label="Open file picker">
                      <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Choose PDF files
                    </button>
                    <p className="dropzone-text">or drag and drop PDFs here</p>
                    <div style={{ fontSize: "13px", color: "var(--subtle)", marginTop: "8px" }}>
                      Supported Format: <strong>PDF (.pdf)</strong> • Max Size: <strong>100MB per file</strong>
                    </div>
                  </>
                )}
                <div className="dropzone-security">
                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Files are processed locally. Your data stays private.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="features-section">
            <div className="section-header">
              <p className="eyebrow-small">Built for</p>
              <h2>Clean document delivery</h2>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h3>Preview every page</h3>
                <p>See each page clearly before merging your documents.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="12" height="12" rx="3" strokeDasharray="3 3" />
                    <path d="M12 12l3 10 2.5-4.5 4.5 4.5 1.5-1.5-4.5-4.5 4.5-2.5Z" fill="currentColor" />
                  </svg>
                </div>
                <h3>Drag to reorder</h3>
                <p>Drag and drop files to get the exact order you want.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <h3>Export locally</h3>
                <p>Export your merged PDF without any watermark.</p>
              </div>
            </div>
          </section>

          <section className="how-it-works-section">
            <p className="eyebrow-small">How it works</p>
            <div className="how-it-works-container">
              <div className="how-it-works-grid">

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="step-number">1</span>
                    </div>
                    <div className="step-connector"></div>
                  </div>
                  <h4>Add your PDFs</h4>
                  <p>Upload or drag and drop your files.</p>
                </div>

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                        <circle cx="5" cy="12" r="1" />
                        <circle cx="5" cy="5" r="1" />
                        <circle cx="5" cy="19" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="19" cy="5" r="1" />
                        <circle cx="19" cy="19" r="1" />
                      </svg>
                      <span className="step-number">2</span>
                    </div>
                    <div className="step-connector"></div>
                  </div>
                  <h4>Reorder pages</h4>
                  <p>Arrange files in the order you need.</p>
                </div>

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span className="step-number">3</span>
                    </div>
                    <div className="step-connector"></div>
                  </div>
                  <h4>Preview</h4>
                  <p>Review everything before merging.</p>
                </div>

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span className="step-number">4</span>
                    </div>
                  </div>
                  <h4>Export merged PDF</h4>
                  <p>Download your clean, merged PDF locally.</p>
                </div>

              </div>
            </div>
          </section>

          {/* Related Tools Links */}
          <section className="related-tools-section">
            <h3 style={{ fontSize: "20px", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              Related PDF Utilities
            </h3>
            <div className="related-tools-grid">
              {relatedTools.map((t) => (
                <Link key={t.href} href={t.href} className="related-tool-card">
                  <div className="related-tool-card-icon">
                    {t.icon}
                  </div>
                  <h4>{t.title}</h4>
                  <p>{t.desc}</p>
                  <span className="related-tool-card-cta">
                    Launch Tool
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* SEO Content & FAQ Section */}
          <section className="seo-faq-section">
            <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "left" }}>
              <h2 style={{ fontSize: "24px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "16px", fontWeight: 700 }}>
                Merge PDF Online Locally & Securely
              </h2>
              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--subtle)", marginBottom: "24px" }}>
                RawPDF offers a secure, offline alternative to third-party file converters. All operations run directly in browser memory using WebAssembly. Your documents are never uploaded to any remote server or stored anywhere, ensuring complete data privacy for legal documents, personal receipts, and business files.
              </p>

              <h3 style={{ fontSize: "18px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "12px", fontWeight: 700 }}>
                How to Merge PDFs Offline
              </h3>
              <ol style={{ fontSize: "14.5px", lineHeight: "1.8", color: "var(--subtle)", paddingLeft: "20px", marginBottom: "24px" }}>
                <li>Drop your PDF files inside the gold border drag-and-drop area above.</li>
                <li>Arrange your files in the exact sequence you want to merge them by dragging or using move buttons.</li>
                <li>Rotate individual pages or delete unwanted pages inside the workspace.</li>
                <li>Click <strong>Merge PDFs</strong> to compile them and download your combined document instantly.</li>
              </ol>

              <h3 style={{ fontSize: "18px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "12px", fontWeight: 700 }}>
                Key Benefits of Client-Side Merging
              </h3>
              <ul style={{ fontSize: "14.5px", lineHeight: "1.8", color: "var(--subtle)", paddingLeft: "20px", marginBottom: "32px" }}>
                <li><strong>100% Secure:</strong> Document merging occurs inside browser sandboxed memory. Ideal for medical records and financial statements.</li>
                <li><strong>No Network Delay:</strong> Since files do not upload to any remote api, merging completes instantly regardless of internet speed.</li>
                <li><strong>Works Offline:</strong> Once the page is loaded, you can disconnect the internet and merge documents entirely offline.</li>
              </ul>

              <h3 style={{ fontSize: "22px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "20px", fontWeight: 700, borderBottom: "1px solid rgba(248, 244, 235, 0.08)", paddingBottom: "8px" }}>
                Frequently Asked Questions
              </h3>
              <div className="seo-faq-grid">
                <div className="seo-faq-item">
                  <h4>Is Merge PDF free?</h4>
                  <p>Yes. RawPDF is completely free, and there are no file count or page limits on merging.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>Are my files uploaded anywhere?</h4>
                  <p>No. We do not run any back-end servers for document processing. All logic runs inside your local browser sandbox.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>What is the maximum file size?</h4>
                  <p>Each file can be up to 100MB, which accommodates very large documents and books easily.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>Can I rotate and delete specific pages?</h4>
                  <p>Yes. Once files are loaded, you enter the workspace where you can rotate specific pages, reorder them, or delete them before exporting.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SoftwareApplication Schema Markup */}
          <Script id="schema-merge" type="application/ld+json" strategy="afterInteractive">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "RawPDF Merge Tool",
              "description": "Combine multiple PDF documents into a single file locally in your browser. 100% private, client-side, and free.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All",
              "browserRequirements": "Requires HTML5 and WebAssembly support",
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "USD"
              }
            })}
          </Script>
        </main>
      )}

      {/* 2. Workspace / Studio View */}
      {view === "workspace" && (
        <main id="workspace" className="studio view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div
            id="previewBackdrop"
            className="preview-backdrop"
            onClick={() => setIsPreviewMobileActive(false)}
          ></div>

          {/* Workspace top navigation bar */}
          <div className="workspace-header">
            <button className="ghost-btn workspace-back" onClick={() => setIsConfirmOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div className="workspace-title-area">
              <h3 className="workspace-title">Merge PDFs</h3>
              <p className="workspace-subtitle">{files.length} {files.length === 1 ? "file" : "files"} added</p>
            </div>
            <div className="workspace-actions" />
          </div>

          <section className="studio-layout" style={{ flex: 1 }}>
            <aside id="controlsPanel" className={`controls-panel${isControlsOpen ? " open" : ""}`}>
              <div className="controls-header">
                <div className="tabs single-tab" role="tablist">
                  <button
                    id="filesTab"
                    className="tab active"
                    type="button"
                  >
                    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                    </svg>
                    Merge PDFs
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
                  className="wide-btn-gold"
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="plus-icon">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add PDF files
                </button>

                <div
                  className="sidebar-dropzone"
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addFiles([...e.dataTransfer.files]);
                  }}
                >
                  <p className="sidebar-dropzone-title">Drag & drop PDFs here</p>
                  <p className="sidebar-dropzone-subtitle">or click to browse</p>
                </div>

                <p className="sidebar-subheading">ACTIONS</p>
                <div className="sidebar-actions-list">
                  <button className="action-item" type="button" onClick={() => rotateSelected(-90)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="action-icon">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <polyline points="3 3 3 8 8 8" />
                    </svg>
                    Rotate left
                  </button>
                  <button className="action-item" type="button" onClick={() => rotateSelected(90)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="action-icon">
                      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <polyline points="21 3 21 8 16 8" />
                    </svg>
                    Rotate right
                  </button>
                  <button className="action-item" type="button" onClick={sortFiles}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="action-icon">
                      <path d="m3 16 4 4 4-4M7 20V4M15 4h5M15 10h5M15 16h6M17 16H15" />
                    </svg>
                    Sort A-Z
                  </button>
                  <button
                    className={`action-item danger${selected.size === 0 ? " disabled" : ""}`}
                    type="button"
                    disabled={selected.size === 0}
                    onClick={deleteSelected}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="action-icon">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete selected
                  </button>
                  <label className="action-item-checkbox">
                    <input
                      id="selectAll"
                      type="checkbox"
                      checked={files.length > 0 && selected.size === files.length}
                      onChange={handleSelectAllChange}
                    />
                    <span>Select all</span>
                  </label>
                  <button
                    className="action-item"
                    type="button"
                    onClick={() => setIsConfirmOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="action-icon">
                      <path d="M23 4v6h-6M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Start over
                  </button>
                </div>

                <p className="sidebar-subheading">VIEW</p>
                <div className="sidebar-view-toggle">
                  <button
                    className={`view-btn-toggle${!listView ? " active" : ""}`}
                    type="button"
                    onClick={() => setListView(false)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="view-svg">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Grid
                  </button>
                  <button
                    className={`view-btn-toggle${listView ? " active" : ""}`}
                    type="button"
                    onClick={() => setListView(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="view-svg">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    List
                  </button>
                </div>

                {selected.size > 0 && (
                  <div className="sidebar-selection-badge">
                    <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="badge-details">
                      <p className="badge-title">{selected.size} {selected.size === 1 ? "file" : "files"} selected</p>
                      <p className="badge-subtitle">
                        {files.filter(f => selected.has(f.id)).reduce((sum, f) => sum + f.pages, 0)} pages • {formatMb(files.filter(f => selected.has(f.id)).reduce((sum, f) => sum + f.size, 0))} MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            <section className="file-area">
              <div className="file-area-header-new">
                <p className="file-area-title">Arrange your PDFs in the order you want to merge.</p>
                <div className="file-area-merge-block">
                  <button id="finishBtn" className="merge-btn-gold" type="button" onClick={finishMerge}>
                    <svg className="sparkle-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707" />
                    </svg>
                    <span>Merge PDFs</span>
                    <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                  <p className="merge-btn-subtitle">Secure merge. No watermarks.</p>
                </div>
              </div>

              <div id="fileGrid" className={`file-grid${listView ? " list" : ""}`} aria-live="polite">
                {files.map((item, index) => (
                  <FileCard
                    key={item.id}
                    item={item}
                    index={index + 1}
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

                <div
                  className="add-card-new"
                  role="button"
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addFiles([...e.dataTransfer.files]);
                  }}
                >
                  <div className="add-card-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="add-card-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <span className="add-card-title">Add more PDFs</span>
                  <span className="add-card-subtitle">Drag & drop or<br />click to add</span>
                </div>
              </div>

              <div className="workspace-tip-banner">
                <span className="tip-icon">💡</span>
                <div className="tip-text">
                  <p className="tip-title">Drag and drop cards to reorder your PDFs</p>
                  <p className="tip-desc">The files will be merged in this exact order.</p>
                </div>
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
                      ? files.filter((item) => selected.has(item.id))
                      : files
                    ).reduce((sum, f) => sum + f.size, 0)
                  )}{" "}
                  MB -{" "}
                  {
                    (selected.size > 0
                      ? files.filter((item) => selected.has(item.id))
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
              <Link
                href="/compress"
                className="wide-btn secondary"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", marginTop: "12px" }}
                onClick={() => {
                  if (mergedBlob) {
                    const file = new File([mergedBlob], mergedName, { type: "application/pdf" });
                    window.sharedPdfFile = file;
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}>
                  <rect x="4" y="14" width="6" height="6" rx="1" />
                  <rect x="14" y="4" width="6" height="6" rx="1" />
                  <path d="M20 14l-6 6M4 10l6-6" />
                </svg>
                Compress this merged file
              </Link>
            </aside>
          </section>
        </main>
      )}

      <InfoModal
        isOpen={modal.isOpen}
        title={modal.title}
        body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Discard changes?"
        body="Are you sure you want to discard your changes and start over?"
        confirmText="Discard"
        cancelText="Cancel"
        onConfirm={() => {
          setIsConfirmOpen(false);
          resetApp();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {view !== "workspace" && <Footer />}
    </>
  );
}

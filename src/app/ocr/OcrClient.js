"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import InfoModal from "../../components/InfoModal";
import ConfirmModal from "../../components/ConfirmModal";
import Script from "next/script";
import { loadScript } from "../../utils/lazyLoad";

function cleanOcrText(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const cleanedLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleanedLines.push(""); // Keep paragraph breaks
      continue;
    }

    // Count character types
    let letters = 0;
    let digits = 0;
    let symbols = 0;
    for (let char of trimmed) {
      if (/[a-zA-Z]/.test(char)) {
        letters++;
      } else if (/[0-9]/.test(char)) {
        digits++;
      } else if (/\s/.test(char)) {
        // Space
      } else {
        symbols++;
      }
    }

    const totalAlphanumeric = letters + digits;
    const totalChars = trimmed.length;

    // Rule 1: Drop lines that consist entirely of symbols/lines
    if (totalAlphanumeric === 0 && symbols > 0) {
      continue;
    }

    // Rule 2: Drop very short lines that are mostly symbols or single random characters
    if (trimmed.length <= 3) {
      // Keep valid single letter words or numbers
      if (/^(a|A|i|I|[0-9])$/.test(trimmed)) {
        cleanedLines.push(trimmed);
      }
      continue;
    }

    // Rule 3: Drop tokens containing only single letter elements (stray columns/noise)
    const tokens = trimmed.split(/\s+/);
    const alphanumericTokens = tokens.filter(t => /[a-zA-Z0-9]/.test(t));
    if (alphanumericTokens.length > 0 && alphanumericTokens.every(t => t.length === 1) && alphanumericTokens.length < 3) {
      continue;
    }

    // Rule 4: If symbols/punctuation make up a large portion (e.g. > 35%) of the line and alphanumeric is low
    if (symbols / (totalChars || 1) > 0.35 && totalAlphanumeric < 6) {
      continue;
    }

    // Rule 5: Drop lines that match common OCR garbage/separator patterns
    if (/^[\[\]\(\)\|\/\-\+=_\\%\s\.:]+$/.test(trimmed)) {
      continue;
    }

    // Rule 6: Drop lines with low alphanumeric density and containing specific garbage letters
    if (letters < 3 && symbols > letters) {
      continue;
    }

    cleanedLines.push(line);
  }

  // Remove duplicate consecutive empty lines to keep output compact
  const finalLines = [];
  for (let line of cleanedLines) {
    if (line === "") {
      if (finalLines.length > 0 && finalLines[finalLines.length - 1] !== "") {
        finalLines.push("");
      }
    } else {
      finalLines.push(line);
    }
  }

  return finalLines.join("\n").trim();
}

export default function OcrClient() {
  // Navigation & Theme States
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modal States
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Tesseract Loader State
  const [isLibLoaded, setIsLibLoaded] = useState(false);

  // OCR Processing States
  const [pdfFile, setPdfFile] = useState(null);
  const [view, setView] = useState("upload"); // upload | processing | workspace
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  
  // Results States
  const [extractedPages, setExtractedPages] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const fileInputRef = useRef(null);
  const [historyStack, setHistoryStack] = useState([]);
  const [ocrLogs, setOcrLogs] = useState([]);

  const addLog = (text, type = "system") => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    setOcrLogs((prev) => [...prev, { text, type, timestamp }].slice(-4));
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Initialize Theme
  useEffect(() => {
    const saved = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(saved);
    document.body.classList.toggle("theme-light", saved === "light");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("mergeStudioTheme", next);
    document.body.classList.toggle("theme-light", next === "light");
  };

  // Scroll Nav Shrink Hook
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dropdown click-outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const el = document.getElementById("toolsDropdown");
      if (el && !el.contains(e.target)) setIsToolsOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Dynamic library loading
  useEffect(() => {
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js")
    ]).then(() => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      setIsLibLoaded(true);
    }).catch(err => {
      console.error("Failed to load OCR libraries dynamically:", err);
      setModal({
        isOpen: true,
        title: "Load Error",
        body: "Failed to load OCR libraries. Please check your network connection and reload the page.",
      });
    });
  }, []);

  const handleFileSelect = (files) => {
    const pdf = [...files].find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdf) return;

    // Enforce 100MB file size limit
    const MAX_SIZE = 100 * 1024 * 1024;
    if (pdf.size > MAX_SIZE) {
      setModal({
        isOpen: true,
        title: "File Too Large",
        body: `The file "${pdf.name}" exceeds the maximum size limit of 100MB. Please select a smaller file.`,
      });
      return;
    }

    if (!isLibLoaded || !window.Tesseract) {
      setModal({
        isOpen: true,
        title: "Library Loading",
        body: "OCR libraries are still loading. Please wait a moment and try again.",
      });
      return;
    }

    setPdfFile(pdf);
    startOcr(pdf);
  };

  const startOcr = async (file) => {
    setView("processing");
    setProgress(0);
    setOcrLogs([]);
    setStatusText("Initializing PDF.js reader...");
    addLog(`Loading document: ${file.name}`, "system");

    try {
      const buffer = await file.arrayBuffer();
      addLog("Parsing PDF file structure...", "system");
      const pdfDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const totalPages = pdfDoc.numPages;
      addLog(`Loaded: ${totalPages} pages found.`, "success");

      let worker = null;
      const getWorker = async () => {
        if (worker) return worker;
        setStatusText("Spawning local WebAssembly OCR worker...");
        addLog("Spawning WebAssembly OCR worker...", "worker");
        worker = await window.Tesseract.createWorker({
          logger: (m) => {
            if (m.status === "recognizing text") {
              const pageProgress = m.progress || 0;
              const overall = Math.round(((currentPageNum - 1) / totalPages + pageProgress / totalPages) * 100);
              setProgress(overall);
              setStatusText(`Extracting text: Page ${currentPageNum} of ${totalPages} (${Math.round(pageProgress * 100)}%)...`);
            }
          }
        });
        addLog("Initializing Tesseract language library...", "worker");
        await worker.loadLanguage("eng");
        await worker.initialize("eng");
        addLog("OCR worker ready.", "success");
        return worker;
      };

      let currentPageNum = 1;
      const pagesData = [];

      for (let i = 1; i <= totalPages; i++) {
        currentPageNum = i;
        setStatusText(`Analyzing page ${i} of ${totalPages}...`);
        addLog(`Analyzing page ${i} of ${totalPages}...`, "system");

        const page = await pdfDoc.getPage(i);
        
        // 1. Try to extract digital text first
        const textContent = await page.getTextContent();
        let pageText = textContent.items.map(item => item.str).join(" ").trim();
        let isDigital = false;
        
        if (pageText.replace(/\s+/g, "").length > 30) {
          isDigital = true;
          addLog(`Page ${i}: Found embedded digital text stream.`, "success");
          // Sort items by coordinate: y descending (top to bottom), x ascending (left to right)
          const sortedItems = [...textContent.items].sort((a, b) => {
            const yA = a.transform[5];
            const yB = b.transform[5];
            if (Math.abs(yA - yB) > 5) {
              return yB - yA; // top to bottom
            }
            return a.transform[4] - b.transform[4]; // left to right
          });

          let lastY = null;
          let textLines = [];
          let currentLine = "";
          for (let item of sortedItems) {
            const y = item.transform[5];
            if (lastY === null) {
              currentLine = item.str;
            } else if (Math.abs(y - lastY) > 5) {
              textLines.push(currentLine);
              currentLine = item.str;
            } else {
              currentLine += (currentLine ? " " : "") + item.str;
            }
            lastY = y;
          }
          if (currentLine) textLines.push(currentLine);
          pageText = textLines.join("\n");
        }

        // Render PDF page to high-res offscreen canvas for previews/thumbnails
        const viewport = page.getViewport({ scale: 3.0 }); // 3.0x scale provides crisp text for high OCR accuracy
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Save as optimized JPEG to prevent browser memory bloat
        const imgUrl = canvas.toDataURL("image/jpeg", 0.8);

        if (!isDigital) {
          setStatusText(`Extracting text from page ${i} of ${totalPages} via OCR...`);
          addLog(`Page ${i}: No text layer. Spawning WebAssembly OCR...`, "worker");
          const activeWorker = await getWorker();
          const { data: { text } } = await activeWorker.recognize(canvas);
          pageText = text.trim() || "[No text detected on this page]";
          addLog(`Page ${i}: OCR recognition complete.`, "success");
        }

        // Apply custom text cleaning filter
        pageText = cleanOcrText(pageText);

        pagesData.push({
          pageNum: i,
          text: pageText,
          imgUrl,
        });
      }

      if (worker) {
        setStatusText("Cleaning up worker resources...");
        addLog("Terminating WebAssembly worker sessions...", "system");
        await worker.terminate();
      }

      addLog("Successfully extracted all pages.", "success");
      setExtractedPages(pagesData);
      setActivePageIndex(0);
      setView("workspace");
    } catch (e) {
      console.error(e);
      setModal({
        isOpen: true,
        title: "OCR Failed",
        body: "An error occurred while processing the PDF file. Please ensure it is unencrypted and readable.",
      });
      setView("upload");
    }
  };

  const copyText = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setToastMessage("Copied!");
      }).catch(err => {
        console.error("Clipboard copy failed: ", err);
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setToastMessage("Copied!");
    } catch (err) {
      console.error("Fallback copy failed: ", err);
      setModal({
        isOpen: true,
        title: "Copy Failed",
        body: "Could not copy text automatically. Please select the text and copy manually.",
      });
    }
  };

  const downloadTxt = () => {
    const fullText = extractedPages.map(p => `--- PAGE ${p.pageNum} ---\n${p.text}`).join("\n\n");
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFile ? pdfFile.name.replace(/\.pdf$/i, "") + "_ocr.txt" : "extracted_text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveToHistory = () => {
    // Deep clone extractedPages state to avoid direct reference mutation
    const snapshot = extractedPages.map(p => ({ ...p }));
    setHistoryStack(prev => [...prev, snapshot]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setExtractedPages(previous);
    setHistoryStack(prev => prev.slice(0, -1));
    setToastMessage("Undone");
  };

  const handleUppercase = () => {
    if (!extractedPages[activePageIndex]) return;
    saveToHistory();
    const updated = [...extractedPages];
    updated[activePageIndex].text = updated[activePageIndex].text.toUpperCase();
    setExtractedPages(updated);
    setToastMessage("Converted to UPPERCASE");
  };

  const handleLowercase = () => {
    if (!extractedPages[activePageIndex]) return;
    saveToHistory();
    const updated = [...extractedPages];
    updated[activePageIndex].text = updated[activePageIndex].text.toLowerCase();
    setExtractedPages(updated);
    setToastMessage("Converted to lowercase");
  };

  const handleCapitalize = () => {
    if (!extractedPages[activePageIndex]) return;
    saveToHistory();
    const updated = [...extractedPages];
    const text = updated[activePageIndex].text;
    const capitalized = text.replace(/\b[a-z]/g, char => char.toUpperCase());
    updated[activePageIndex].text = capitalized;
    setExtractedPages(updated);
    setToastMessage("Capitalized text");
  };

  const handleSentenceCase = () => {
    if (!extractedPages[activePageIndex]) return;
    saveToHistory();
    const updated = [...extractedPages];
    const text = updated[activePageIndex].text;
    const sentenceCased = text.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, char => char.toUpperCase());
    updated[activePageIndex].text = sentenceCased;
    setExtractedPages(updated);
    setToastMessage("Converted to Sentence Case");
  };

  const handleReduceSpaces = () => {
    if (!extractedPages[activePageIndex]) return;
    saveToHistory();
    const updated = [...extractedPages];
    const text = updated[activePageIndex].text;
    const cleaned = text
      .split("\n")
      .map(line => line.replace(/\s+/g, " ").trim())
      .join("\n");
    updated[activePageIndex].text = cleaned;
    setExtractedPages(updated);
    setToastMessage("Reduced spacing");
  };

  const handleRemoveLineBreaks = () => {
    if (!extractedPages[activePageIndex]) return;
    saveToHistory();
    const updated = [...extractedPages];
    const text = updated[activePageIndex].text;
    // Replace single line breaks with spaces, while preserving double line breaks
    const merged = text
      .replace(/([^\n])\n([^\n])/g, "$1 $2")
      .replace(/[ \t]+/g, " ");
    updated[activePageIndex].text = merged;
    setExtractedPages(updated);
    setToastMessage("Merged lines");
  };

  const resetOcr = () => {
    setPdfFile(null);
    setExtractedPages([]);
    setView("upload");
  };

  const filteredPages = extractedPages.filter(p => 
    p.text.toLowerCase().includes(searchText.toLowerCase())
  );

  const relatedTools = [
    {
      title: "Text Editor",
      desc: "Format case and edit text offline.",
      href: "/text-editor",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      title: "Merge PDF",
      desc: "Combine multiple PDFs into one.",
      href: "/merge",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="11" height="11" rx="2" />
        </svg>
      )
    },
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
    }
  ];

  return (
    <>
      {view !== "workspace" && (
        <>
          <Header
            isScrolled={isScrolled}
            isToolsOpen={isToolsOpen}
            setIsToolsOpen={setIsToolsOpen}
            handleDropdownItemClick={() => setIsToolsOpen(false)}
            theme={theme}
            toggleTheme={toggleTheme}
          />

          <button id="themeToggle" className="theme-toggle" type="button" aria-pressed={theme === "light"} onClick={toggleTheme}>
            <span className="theme-toggle-icon" aria-hidden="true" />
            <span className="theme-toggle-text">{theme === "light" ? "Dark" : "Light"}</span>
          </button>
        </>
      )}

      {view === "upload" && (
        <main id="ocr" className="landing view active">
          {/* Hero Section — full layout matching other tools */}
          <section className="hero">
            <div className="hero-content">
              <Link className="ghost-btn-back" href="/">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Tools</span>
              </Link>

              <p className="eyebrow">
                <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Private PDF Studio
              </p>
              <h1>OCR PDF Text Extractor</h1>
              <p className="hero-copy">
                Convert scanned PDFs to editable text using WebAssembly — all processed locally in your browser.
              </p>
            </div>

            <div
              id="ocrDropzone"
              className={`dropzone${isDragOver ? " dragover" : ""}`}
              tabIndex="0"
              role="button"
              aria-label="Choose a scanned PDF file to extract text"
              onClick={() => {
                if (isLibLoaded) fileInputRef.current.click();
              }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (isLibLoaded) handleFileSelect([...e.dataTransfer.files]);
              }}
              onKeyDown={(e) => {
                if (isLibLoaded && (e.key === "Enter" || e.key === " ")) {
                  fileInputRef.current.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(e) => { handleFileSelect([...e.target.files]); e.target.value = ""; }}
              />
              <div className="dropzone-inner">
                <div className="dropzone-cards" aria-hidden="true">
                  <div className="pdf-card-shadow card-left"></div>
                  <div className="pdf-card-shadow card-right"></div>
                  <div className="pdf-card-front">OCR</div>
                </div>
                {!isLibLoaded ? (
                  <p className="dropzone-text" style={{ padding: "20px 0" }}>Loading secure OCR engine...</p>
                ) : (
                  <>
                    <button id="chooseBtn" className="choose-btn-gold" type="button" aria-label="Open file picker">
                      <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Choose PDF file
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
              <h2>Seamless text extraction</h2>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="9" x2="15" y2="9" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <h3>100% Client-Side OCR</h3>
                <p>Processes documents locally via WebAssembly. Your files never touch a server.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3>Privacy-first parsing</h3>
                <p>Secure browser-based extraction protects confidential or sensitive information.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <h3>Standard text export</h3>
                <p>Export extracted text directly to a .txt file or copy it with a single click.</p>
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
                  <h4>Upload PDF</h4>
                  <p>Select a scanned PDF file from your device.</p>
                </div>

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      <span className="step-number">2</span>
                    </div>
                    <div className="step-connector"></div>
                  </div>
                  <h4>Extract text</h4>
                  <p>Wait as WebAssembly OCR workers transcribe the pages.</p>
                </div>

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span className="step-number">3</span>
                    </div>
                    <div className="step-connector"></div>
                  </div>
                  <h4>Review & Edit</h4>
                  <p>Compare the scanned image with the extracted text side-by-side.</p>
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
                  <h4>Download</h4>
                  <p>Copy the text or download it as a .txt file.</p>
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
                Extract Text from PDF with Local OCR Securely
              </h2>
              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--subtle)", marginBottom: "24px" }}>
                Extract text from scanned PDFs or images using Tesseract WebAssembly directly inside your browser. With RawPDF, OCR is processed entirely client-side, ensuring your business documents, receipts, invoices, or legal records remain 100% confidential. No data is sent to external servers or API end-points.
              </p>

              <h3 style={{ fontSize: "18px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "12px", fontWeight: 700 }}>
                How to Run OCR on PDF Offline
              </h3>
              <ol style={{ fontSize: "14.5px", lineHeight: "1.8", color: "var(--subtle)", paddingLeft: "20px", marginBottom: "24px" }}>
                <li>Drop your scanned PDF document in the gold-outlined area above.</li>
                <li>Our client-side engine automatically parses the document. If it lacks an embedded text layer, it spawns a local Tesseract.js worker to transcribe it.</li>
                <li>Track real-time progress on each page as WebAssembly transcribes it.</li>
                <li>Compare the original page scans side-by-side with the extracted text. You can edit text case and structure inside the workspace.</li>
                <li>Click <strong>Download Text</strong> to export it as a <code>.txt</code> file, or copy specific pages directly.</li>
              </ol>

              <h3 style={{ fontSize: "18px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "12px", fontWeight: 700 }}>
                Key Benefits of Browser-Based OCR
              </h3>
              <ul style={{ fontSize: "14.5px", lineHeight: "1.8", color: "var(--subtle)", paddingLeft: "20px", marginBottom: "32px" }}>
                <li><strong>Uncompromised Privacy:</strong> No remote servers analyze your pages. Scanned tax returns or contracts remain entirely local.</li>
                <li><strong>Hybrid Engine:</strong> Digital text streams are loaded instantly, while scanned images are fallback-routed to a local Tesseract worker automatically.</li>
                <li><strong>In-Browser Editor:</strong> Fix spacings, remove lines, swap capitalization, and copy or save files instantly with no internet required.</li>
              </ul>

              <h3 style={{ fontSize: "22px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "20px", fontWeight: 700, borderBottom: "1px solid rgba(248, 244, 235, 0.08)", paddingBottom: "8px" }}>
                Frequently Asked Questions
              </h3>
              <div className="seo-faq-grid">
                <div className="seo-faq-item">
                  <h4>Is PDF OCR free?</h4>
                  <p>Yes. RawPDF provides unlimited text extraction and local OCR completely free of cost.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>Are my files stored or uploaded?</h4>
                  <p>No. Tesseract.js runs inside your browser sandbox via WebAssembly. Your documents never leave your local system.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>Which languages are supported?</h4>
                  <p>RawPDF currently supports high-accuracy English text recognition, with more language models planned in future updates.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>Can I search inside extracted pages?</h4>
                  <p>Yes. The RawPDF OCR workspace has an active text filter that highlights and searches pages containing matching keywords.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SoftwareApplication Schema Markup */}
          <Script id="schema-ocr" type="application/ld+json" strategy="afterInteractive">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "RawPDF OCR Tool",
              "description": "Extract text from scanned PDFs locally in your browser using client-side OCR. 100% private, client-side, and free.",
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

      {view === "processing" && (
        <main className="landing view active">
          <section className="processing-container" style={{ minHeight: "70svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px 40px" }}>
            <div className="ocr-processing-card" style={{ maxWidth: "520px", width: "100%", textAlign: "center" }}>
              
              {/* Document Scanner Graphic */}
              <div className="ocr-scanner-visual">
                <div className="ocr-scanner-laser"></div>
                <div className="ocr-scanner-line-doc" style={{ width: "85%" }}></div>
                <div className="ocr-scanner-line-doc" style={{ width: "70%" }}></div>
                <div className="ocr-scanner-line-doc" style={{ width: "90%" }}></div>
                <div className="ocr-scanner-line-doc" style={{ width: "60%" }}></div>
              </div>

              <h2 style={{ fontSize: "22px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, marginBottom: "8px", color: "#f8f4eb" }}>
                Extracting Text...
              </h2>
              
              <p style={{ color: "var(--subtle)", fontSize: "13.5px", marginBottom: "28px", minHeight: "20px" }}>
                {statusText}
              </p>

              {/* Circular Progress Ring */}
              <div className="ocr-progress-ring-wrap">
                <svg width="140" height="140">
                  <circle
                    stroke="rgba(248, 244, 235, 0.05)"
                    fill="transparent"
                    strokeWidth="8"
                    cx="70"
                    cy="70"
                    r="58"
                  />
                  <circle
                    className="ocr-progress-ring-circle"
                    stroke="var(--gold)"
                    fill="transparent"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 58}`}
                    strokeDashoffset={`${2 * Math.PI * 58 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    cx="70"
                    cy="70"
                    r="58"
                  />
                </svg>
                <div className="ocr-progress-percent">
                  {progress}%
                  <span>Complete</span>
                </div>
              </div>

              {/* Console logs */}
              <div className="ocr-console-terminal">
                {ocrLogs.map((log, index) => (
                  <div key={index} className={`ocr-console-line ${log.type}`}>
                    <span style={{ color: "var(--muted)", marginRight: 8 }}>{log.timestamp}</span>
                    {log.text}
                  </div>
                ))}
                {ocrLogs.length === 0 && (
                  <div className="ocr-console-line system">
                    <span style={{ color: "var(--muted)", marginRight: 8 }}>--:--:--</span>
                    Starting extraction engine...
                  </div>
                )}
              </div>

            </div>
          </section>
        </main>
      )}

      {view === "workspace" && (
        <main className="workspace-view active">
          {/* Workspace top navigation bar */}
          <div className="workspace-header">
            <button className="ghost-btn workspace-back" onClick={() => setIsConfirmOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div className="workspace-title-area">
              <h3 className="workspace-title">{pdfFile?.name}</h3>
              <p className="workspace-subtitle">{extractedPages.length} Pages Processed</p>
            </div>
            <div className="workspace-actions">
              <button className="workspace-action-btn copy-all" onClick={() => copyText(extractedPages.map(p => p.text).join("\n\n"))}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy All Text
              </button>
              <button className="workspace-action-btn download-txt" onClick={downloadTxt}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download .TXT
              </button>
            </div>
          </div>

          <div className="ocr-workspace-layout">
            {/* Sidebar list of thumbnails */}
            <aside className="ocr-sidebar">
              <div className="ocr-search-wrap">
                <input
                  type="text"
                  placeholder="Search in extracted text..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="ocr-search-input"
                />
              </div>
              <div className="ocr-thumbnails-list">
                {filteredPages.map((page, idx) => {
                  const actualIndex = extractedPages.indexOf(page);
                  return (
                    <button
                      key={page.pageNum}
                      className={`ocr-thumbnail-item${activePageIndex === actualIndex ? " active" : ""}`}
                      onClick={() => setActivePageIndex(actualIndex)}
                    >
                      <div className="ocr-thumb-num">Page {page.pageNum}</div>
                      <div className="ocr-thumb-preview">
                        <img src={page.imgUrl} alt={`Page ${page.pageNum}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Main side-by-side view */}
            <div className="ocr-workspace-main">
              {extractedPages[activePageIndex] && (
                  <div className="ocr-text-panel">
                    <div className="ocr-panel-title-bar">
                      <span>Extracted Text</span>
                    </div>
                    <div className="ocr-editor-toolbar">
                      <button className="editor-tool-btn undo-btn" onClick={handleUndo} disabled={historyStack.length === 0} title="Undo last formatting action">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                          <path d="M3 7v6h6" />
                          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                        </svg>
                        Undo
                      </button>
                      <div className="toolbar-divider" />
                      <button className="editor-tool-btn" onClick={handleUppercase} title="Convert text to uppercase">
                        UPPERCASE
                      </button>
                      <button className="editor-tool-btn" onClick={handleLowercase} title="Convert text to lowercase">
                        lowercase
                      </button>
                      <button className="editor-tool-btn" onClick={handleCapitalize} title="Capitalize the first letter of each word">
                        Capitalize
                      </button>
                      <button className="editor-tool-btn" onClick={handleSentenceCase} title="Capitalize the first letter of each sentence">
                        Sentence case
                      </button>
                      <button className="editor-tool-btn" onClick={handleReduceSpaces} title="Remove multiple spaces and trim lines">
                        Reduce Spaces
                      </button>
                      <button className="editor-tool-btn" onClick={handleRemoveLineBreaks} title="Format text into continuous paragraphs">
                        Merge Lines
                      </button>
                    </div>
                    <textarea
                      className="ocr-text-textarea"
                      value={extractedPages[activePageIndex].text}
                      onChange={(e) => {
                        const updated = [...extractedPages];
                        updated[activePageIndex].text = e.target.value;
                        setExtractedPages(updated);
                      }}
                    />
                  </div>
              )}
            </div>
          </div>
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
        body="Are you sure you want to discard your extracted text and start over?"
        confirmText="Discard"
        cancelText="Cancel"
        onConfirm={() => {
          setIsConfirmOpen(false);
          resetOcr();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {view !== "workspace" && <Footer />}

      {toastMessage && (
        <div className="ocr-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}

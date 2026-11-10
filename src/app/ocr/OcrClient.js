"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../../components/Header";
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

  return (
    <>
      <Header
        isScrolled={isScrolled}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        isWorkspace={view === "workspace"}
        onBack={() => setIsConfirmOpen(true)}
        workspaceTitle={pdfFile?.name || "OCR PDF"}
        workspaceSubtitle={`${extractedPages.length} Pages Processed`}
        workspaceActions={view === "workspace" ? (
          <div className="header-ocr-actions">
            <button className="workspace-action-btn copy-all" onClick={() => copyText(extractedPages.map(p => p.text).join("\n\n"))}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy All</span>
            </button>
            <button className="workspace-action-btn download-txt" onClick={downloadTxt}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download .TXT</span>
            </button>
          </div>
        ) : null}
      />

      {view === "upload" && (
        <main id="ocr" className="landing view active">
          {/* Hero Section — full layout matching other tools */}
          <section className="hero">
            {/* Ambient Glowing Golden Ribbons in Background */}
            <div className="bg-golden-ribbons" aria-hidden="true">
              <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="goldRibbonTopOcr" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#e5a93c" stopOpacity="0" />
                    <stop offset="15%" stopColor="#e5a93c" stopOpacity="0.75" />
                    <stop offset="40%" stopColor="#ffe494" stopOpacity="0.95" />
                    <stop offset="70%" stopColor="#f5c768" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#e5a93c" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="goldRibbonBottomOcr" x1="100%" y1="50%" x2="0%" y2="50%">
                    <stop offset="0%" stopColor="#e5a93c" stopOpacity="0" />
                    <stop offset="20%" stopColor="#e5a93c" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#ffe494" stopOpacity="0.95" />
                    <stop offset="80%" stopColor="#f5c768" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#e5a93c" stopOpacity="0" />
                  </linearGradient>
                  <filter id="ribbonGlowSoftOcr" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                  <filter id="ribbonGlowWideOcr" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="16" />
                  </filter>
                </defs>
                {/* Top-Left Ribbon: Graceful sweeping bezier curve across top quadrant */}
                <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopOcr)" strokeWidth="18" filter="url(#ribbonGlowWideOcr)" opacity="0.35" />
                <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopOcr)" strokeWidth="5" filter="url(#ribbonGlowSoftOcr)" opacity="0.85" />
                <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopOcr)" strokeWidth="2" opacity="1" />

                {/* Bottom-Right Ribbon: Sweeping bezier curve across bottom quadrant */}
                <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomOcr)" strokeWidth="18" filter="url(#ribbonGlowWideOcr)" opacity="0.35" />
                <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomOcr)" strokeWidth="5" filter="url(#ribbonGlowSoftOcr)" opacity="0.85" />
                <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomOcr)" strokeWidth="2" opacity="1" />
              </svg>
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
              <div className="dropzone-bottom-glow" aria-hidden="true"></div>
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
                  <div className="pdf-card-front">
                    <div className="pdf-card-dogear"></div>
                    <span>OCR</span>
                  </div>
                </div>

                <h2 className="dropzone-title">OCR PDF</h2>
                <p className="dropzone-subtitle">or drag and drop PDFs here</p>

                {!isLibLoaded ? (
                  <p className="dropzone-loading">Loading secure OCR engine...</p>
                ) : (
                  <button id="chooseBtn" className="choose-btn-gold" type="button" aria-label="Open file picker">
                    <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Choose PDF file</span>
                  </button>
                )}

                <div className="dropzone-formats">
                  Supported Format: <strong>PDF (.pdf)</strong> • Max Size: <strong>100MB per file</strong>
                </div>

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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function HowItWorksPage() {
  const [theme, setTheme] = useState("dark");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeId, setActiveId] = useState("merge");

  const hiwSections = [
    { id: "merge", label: "Merge PDFs" },
    { id: "split", label: "Split PDF" },
    { id: "compress", label: "Compress PDF" },
    { id: "protect", label: "Protect PDF" },
    { id: "edit", label: "Edit PDF" },
    { id: "pdf-to-image", label: "PDF to Image" },
    { id: "image-to-pdf", label: "Image to PDF" },
    { id: "ocr", label: "OCR PDF" },
    { id: "text-editor", label: "Text Editor" },
  ];

  useEffect(() => {
    const saved = localStorage.getItem("mergeStudioTheme") || "dark";
    setTheme(saved);
    document.body.classList.toggle("theme-light", saved === "light");
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
      for (const s of [...hiwSections].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveId(s.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onOutside = (e) => {
      const el = document.getElementById("toolsDropdown");
      if (el && !el.contains(e.target)) setIsToolsOpen(false);
    };
    document.addEventListener("click", onOutside);
    return () => document.removeEventListener("click", onOutside);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("mergeStudioTheme", next);
    document.body.classList.toggle("theme-light", next === "light");
  };

  const handleDropdownItemClick = () => setIsToolsOpen(false);

  const mergeSteps = [
    {
      number: "01",
      title: "Select your PDFs",
      desc: "Click the upload zone or drag and drop your PDF files directly from your computer. You can add as many files as you need — there's no limit.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="6" width="22" height="28" rx="4" />
          <rect x="18" y="14" width="22" height="28" rx="4" />
          <path d="M19 22h12M19 28h8" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Arrange the order",
      desc: "Drag and drop the file cards to set the exact merge order. Preview any document by clicking it — full page-by-page rendering, all locally in your browser.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 16h32M8 24h32M8 32h32" />
          <path d="M4 12l4-4 4 4M4 36l4 4 4-4" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Merge & Export",
      desc: "Click Merge PDFs. The documents are combined in your browser using pdf-lib — no file ever leaves your device. Rename the output and download instantly.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v16l4-4m-4 4l-4-4" />
          <path d="M36 40V24l-4 4m4-4l4 4" />
          <path d="M12 24h24" />
        </svg>
      ),
    },
  ];

  const compressSteps = [
    {
      number: "01",
      title: "Upload your PDF",
      desc: "Drop a PDF file onto the Compress page. Only one file is processed at a time so you stay in full control of the result.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 32V16m0 0l-6 6m6-6l6 6" />
          <rect x="8" y="36" width="32" height="4" rx="2" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Choose compression level",
      desc: "Pick from three levels — Less Compression (high quality), Recommended (balanced), or Extreme (smallest size). Each shows an estimated output size.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 36h8v-8H8zM20 36h8V20h-8zM32 36h8V8h-8z" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Download optimized file",
      desc: "rawPDF re-renders every page as an optimised JPEG and rebuilds the PDF using pdf-lib — entirely in your browser. Review the before/after size, rename, and save.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 16v16m0 0l-6-6m6 6l6-6" />
          <path d="M8 38h32" />
        </svg>
      ),
    },
  ];

  const protectSteps = [
    {
      number: "01",
      title: "Upload your PDF",
      desc: "Drag and drop a PDF file onto the Protect page. The file stays inside browser memory, fully offline.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 32V16m0 0l-6 6m6-6l6 6" />
          <rect x="8" y="36" width="32" height="4" rx="2" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Choose password",
      desc: "Input a strong, secure key password to lock the document and confirm it to prevent typos.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="12" y="22" width="24" height="18" rx="4" />
          <path d="M18 22v-6a6 6 0 0 1 12 0v6" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Lock & Download",
      desc: "Web Crypto cryptographically locks the PDF using AES-256 standards directly in your browser. Download your secure document instantly.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 16v16m0 0l-6-6m6 6l6-6" />
          <path d="M8 38h32" />
        </svg>
      ),
    },
  ];

  const splitSteps = [
    {
      number: "01",
      title: "Upload your PDF",
      desc: "Drag and drop or select your PDF file. The page count is resolved instantly in memory on your browser.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="6" width="32" height="36" rx="4" />
          <path d="M16 14h16M16 22h16" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Select, Reorder & Rotate",
      desc: "Drag pages to sort the output layout. Select cards to rotate pages clockwise or delete unwanted pages in the list.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 24a12 12 0 1 1 12 12M12 24v-6h6" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Split and Export",
      desc: "Click Split PDF. The customized pages are extracted and packaged into a clean, watermark-free PDF document 100% locally.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="24" y1="8" x2="24" y2="40" />
          <rect x="6" y="12" width="12" height="24" rx="2" />
          <rect x="30" y="12" width="12" height="24" rx="2" />
        </svg>
      ),
    },
  ];

  const editSteps = [
    {
      number: "01",
      title: "Select a PDF",
      desc: "Drop a PDF file onto the editor page. All page layouts are loaded as high-resolution rendering templates offline.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="10" y="6" width="28" height="36" rx="4" />
          <path d="M18 16h12M18 24h12" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Apply custom edits",
      desc: "Place text boxes, highlight content, draw shape overlays, or embed custom images directly onto any page on the canvas.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 6l12 12-24 24-12 4 4-12z" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Export losslessly",
      desc: "Click Download PDF. Edits are layered and exported losslessly, preserving the original document content perfectly.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 16v16m0 0l-6-6m6 6l6-6" />
          <path d="M8 38h32" />
        </svg>
      ),
    },
  ];

  const toPdfSteps = [
    {
      number: "01",
      title: "Select your images",
      desc: "Drag and drop or click to upload JPG, PNG, WEBP, or GIF images. You can add multiple images at once — no quantity limit.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="8" width="32" height="32" rx="4" />
          <circle cx="19" cy="19" r="3" />
          <polyline points="40 30 30 20 18 32" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Arrange & customize",
      desc: "Drag to reorder images. Choose a page size (A4, Letter, or fit-to-image), set orientation, and optionally add a background color to every page.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 16h32M8 24h32M8 32h32" />
          <path d="M4 12l4-4 4 4M4 36l4 4 4-4" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Convert & download PDF",
      desc: "Click Convert to PDF. Each image is embedded into its own page and packed into a clean PDF — 100% client-side using pdf-lib. Download instantly.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="6" width="32" height="36" rx="4" />
          <path d="M16 14h16M16 22h16M16 30h10" />
          <path d="M24 16v16m0 0l-6-6m6 6l6-6" />
        </svg>
      ),
    },
  ];

  const toImageSteps = [
    {
      number: "01",
      title: "Upload your PDF",
      desc: "Drag and drop or select your PDF document. The pages are loaded instantly and rendered fully client-side.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="10" y="6" width="28" height="36" rx="4" />
          <path d="M18 16h12M18 24h12" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Choose format & quality",
      desc: "Select output format (PNG or JPEG) and choose target resolution scale (1x, 2x, or 3x). Toggle selection of pages to convert.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="8" width="32" height="32" rx="4" />
          <circle cx="20" cy="20" r="4" />
          <polyline points="40 30 30 20 18 32" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Convert & download ZIP",
      desc: "Every selected page is rendered to high-quality images locally in your browser. Download all as a single ZIP archive.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 16v16m0 0l-6-6m6 6l6-6" />
          <path d="M8 38h32" />
        </svg>
      ),
    },
  ];

  const ocrSteps = [
    {
      number: "01",
      title: "Upload scanned PDF",
      desc: "Drag and drop or select your scanned PDF file. The document is read in-memory in your browser, keeping your data entirely local.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="10" y="6" width="28" height="36" rx="4" />
          <path d="M18 16h12M18 24h12" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Local Wasm OCR",
      desc: "rawPDF spawns a local Tesseract.js worker running inside WebAssembly. It renders each PDF page to canvas and performs OCR text recognition offline.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="18" />
          <path d="M24 16v16M16 24h16" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Edit & Download",
      desc: "View the side-by-side extracted text, search through it, copy specific pages, or download the full text as a clean .TXT document.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 16v16m0 0l-6-6m6 6l6-6" />
          <path d="M8 38h32" />
        </svg>
      ),
    },
  ];

  const textEditorSteps = [
    {
      number: "01",
      title: "Enter your text",
      desc: "Type directly, paste copied content, or compose new text in the main workspace editor area. All entries stay inside browser memory.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 36h24M16 28h16M20 20h8" />
          <rect x="8" y="6" width="32" height="36" rx="4" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Format & Convert Cases",
      desc: "Convert text instantly to sentence case, lowercase, uppercase, capitalized, or title case. Clean up space formatting, merge lines, or run Find & Replace queries.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="6" />
          <circle cx="32" cy="32" r="6" />
          <line x1="20" y1="20" x2="28" y2="28" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Copy or Download",
      desc: "Download your completed composition as a plain text (.TXT) file or copy it with a single click — all offline.",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 16v16m0 0l-6-6m6 6l6-6" />
          <path d="M8 38h32" />
        </svg>
      ),
    },
  ];

  return (
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

      <main className="landing view active">
        {/* Hero */}
        <section className="hero" style={{ minHeight: "50svh" }}>
          <div className="hero-content" style={{ textAlign: "center" }}>
            <p className="eyebrow">Guide</p>
            <h1>How It Works</h1>
            <p className="hero-copy">
              Everything happens in your browser — no uploads, no accounts, no waiting.
            </p>
          </div>
        </section>

        {/* Two-column layout: sticky TOC + content */}
        <section className="hiw-layout">

          {/* Sticky sidebar */}
          <aside className="privacy-toc">
            <p className="privacy-toc-label">On this page</p>
            <nav>
              {hiwSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`privacy-toc-link${activeId === s.id ? " active" : ""}`}
                  onClick={() => setActiveId(s.id)}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="hiw-content">

            {/* Merge */}
            <div id="merge" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #b88a43, #0f8176)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">Merge PDFs</h2>
              </div>
              <div className="hiw-steps">
                {mergeSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/merge" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Merging <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="hiw-divider" />

            {/* Split */}
            <div id="split" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #0f8176, #b88a43)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <rect x="2" y="4" width="8" height="16" rx="2" />
                    <rect x="14" y="4" width="8" height="16" rx="2" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">Split PDF</h2>
              </div>
              <div className="hiw-steps">
                {splitSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/split" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Splitting <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="hiw-divider" />

            {/* Compress */}
            <div id="compress" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #0f8176, #2867e8)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">Compress PDF</h2>
              </div>
              <div className="hiw-steps">
                {compressSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/compress" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Compressing <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="hiw-divider" />

            {/* Protect */}
            <div id="protect" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #b88a43, #714c14)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">Protect PDF</h2>
              </div>
              <div className="hiw-steps">
                {protectSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/protect" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Protecting <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="hiw-divider" />

            {/* Edit */}
            <div id="edit" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #e11d48, #b88a43)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">Edit PDF <span className="beta-badge" style={{ fontSize: "11px", padding: "2px 8px", marginLeft: "8px", top: "-3px" }}>Beta</span></h2>
              </div>
              <div className="hiw-steps">
                {editSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/edit" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Editing <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="hiw-divider" />

            {/* PDF to Image */}
            <div id="pdf-to-image" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #f97316, #b88a43)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">Convert PDF to Image</h2>
              </div>
              <div className="hiw-steps">
                {toImageSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/pdf-to-image" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Converting <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="hiw-divider" />

            {/* Image to PDF */}
            <div id="image-to-pdf" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #8b5cf6, #0f8176)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">Image to PDF</h2>
              </div>
              <div className="hiw-steps">
                {toPdfSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/image-to-pdf" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Converting <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="hiw-divider" />

            {/* OCR PDF */}
            <div id="ocr" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #10b981, #0f8176)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">OCR PDF Text Extraction</h2>
              </div>
              <div className="hiw-steps">
                {ocrSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/ocr" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Extracting <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="hiw-divider" />

            {/* Text Editor */}
            <div id="text-editor" className="hiw-section">
              <div className="hiw-section-header">
                <span className="hiw-section-icon" style={{ background: "linear-gradient(135deg, #e5c07b, #c6a052)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </span>
                <h2 className="hiw-section-title">Text Editor & Case Converter</h2>
              </div>
              <div className="hiw-steps">
                {textEditorSteps.map((step) => (
                  <div key={step.number} className="hiw-card">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">{step.icon}</div>
                    <h3 className="hiw-title">{step.title}</h3>
                    <p className="hiw-desc">{step.desc}</p>
                  </div>
                ))}
                <div className="hiw-card hiw-cta-card">
                  <h3 className="hiw-cta-title">Ready to start?</h3>
                  <Link href="/text-editor" className="wide-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "0 32px" }}>
                    Start Editing <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}


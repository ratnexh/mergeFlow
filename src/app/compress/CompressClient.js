"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PreviewPanel from "../../components/PreviewPanel";
import InfoModal from "../../components/InfoModal";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const palette = [
  "#2867e8",
  "#14b8a6",
  "#f97316",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#65a30d",
];

export default function CompressPage() {
  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });

  // Compression State
  const [compressFile, setCompressFile] = useState(null);
  const [compressionLevel, setCompressionLevel] = useState("medium"); // "low" | "medium" | "high"
  const [compressView, setCompressView] = useState("upload"); // "upload" | "processing" | "done"
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [compressedUrl, setCompressedUrl] = useState(null);
  const [compressedName, setCompressedName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [compressionProgress, setCompressionProgress] = useState(0);

  const compressInputRef = useRef(null);

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

  // Check for shared file from merge page (in-memory transition)
  useEffect(() => {
    if (typeof window !== "undefined" && window.sharedPdfFile) {
      const file = window.sharedPdfFile;
      window.sharedPdfFile = null; // Clear to prevent double processing
      setCompressFile(file);
      setOriginalSize(file.size);
      setCompressView("settings");
    }
  }, []);

  // Scroll Shrink Nav Hook
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("mergeStudioTheme", nextTheme);
    document.body.classList.toggle("theme-light", nextTheme === "light");
  };

  const handleDropdownItemClick = (name) => {
    setIsToolsOpen(false);
    if (name === "Compress PDF") {
      resetCompressState();
    } else {
      setModal({
        isOpen: true,
        title: name,
        body: "This tool is coming soon in a future update! All document processing stays completely local and secure.",
      });
    }
  };

  const resetCompressState = () => {
    setCompressFile(null);
    setCompressionLevel("medium");
    setCompressView("upload");
    setCompressedBlob(null);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setCompressedUrl(null);
    setCompressedName("");
    setOriginalSize(0);
    setCompressedSize(0);
    setCompressionProgress(0);
  };

  const handleCompressFileSelect = (filesList) => {
    const usable = filesList.filter((file) => {
      const name = file.name.toLowerCase();
      return file.size > 0 && (file.type === "application/pdf" || name.endsWith(".pdf"));
    });
    if (!usable.length) return;
    const file = usable[0];
    setCompressFile(file);
    setOriginalSize(file.size);
    setCompressView("settings");
  };

  const compressPdf = async (targetFile = compressFile, level = compressionLevel) => {
    if (!targetFile) return;
    setCompressView("processing");
    setCompressionProgress(0);

    try {
      const arrayBuffer = await targetFile.arrayBuffer();

      if (!window.pdfjsLib || !window.PDFLib) {
        throw new Error("PDF libraries not loaded. Please check your network connection.");
      }

      const pdfjsDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const totalPages = pdfjsDoc.numPages;
      const mergedPdf = await window.PDFLib.PDFDocument.create();

      // Determine quality & scale based on compressionLevel
      let quality = 0.82;
      let scale = 1.8;
      if (level === "high") {
        quality = 0.62;
        scale = 1.3;
      } else if (level === "low") {
        quality = 0.92;
        scale = 2.4;
      }

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfjsDoc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        const jpegBlob = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas export failed"));
          }, "image/jpeg", quality);
        });

        const jpegBytes = await jpegBlob.arrayBuffer();
        const embeddedImage = await mergedPdf.embedJpg(jpegBytes);

        const newPage = mergedPdf.addPage([viewport.width, viewport.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });

        setCompressionProgress(Math.min(98, Math.round((i / totalPages) * 100)));
      }

      const compressedBytes = await mergedPdf.save();
      const resBlob = new Blob([compressedBytes], { type: "application/pdf" });

      setCompressedBlob(resBlob);
      setCompressedSize(resBlob.size);

      const resName = targetFile.name.replace(/\.pdf$/i, "") + "-compressed.pdf";
      setCompressedName(resName);

      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
      const resUrl = URL.createObjectURL(resBlob);
      setCompressedUrl(resUrl);

      setCompressionProgress(100);
      await wait(350);
      setCompressView("done");
    } catch (err) {
      console.error("Compression failed:", err);
      setModal({
        isOpen: true,
        title: "Compression Error",
        body: "Failed to compress the PDF file. Please ensure it is a valid, unencrypted PDF.",
      });
      setCompressView("upload");
      setCompressFile(null);
    }
  };

  const downloadCompressed = () => {
    if (!compressedBlob) return;
    const finalName = normalizePdfName(compressedName);
    const link = document.createElement("a");
    link.href = compressedUrl || URL.createObjectURL(compressedBlob);
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Helper Utils
  const normalizePdfName = (val) => {
    const cleaned = (val || "compressed-document.pdf")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, " ");
    return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
  };

  const formatMb = (bytes) =>
    Math.max(0.1, bytes / 1024 / 1024).toFixed(bytes > 10000000 ? 0 : 1);

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

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


      <main id="compress" className="landing view active">

        <input
          id="compressInput"
          className="sr-only"
          type="file"
          accept=".pdf,application/pdf"
          ref={compressInputRef}
          onChange={(e) => {
            handleCompressFileSelect([...e.target.files]);
            e.target.value = "";
          }}
        />

        {/* Hero Section — full layout matching homepage */}
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
            <h1>Compress PDF</h1>
            <p className="hero-copy">
              Reduce PDF file size by optimizing embedded images — all processed locally in your browser.
            </p>
          </div>

          {/* Inner View: Upload */}
          {compressView === "upload" && (
            <div
              id="compressDropzone"
              className={`dropzone${isDragOverDropzone ? " dragover" : ""}`}
              tabIndex="0"
              role="button"
              aria-label="Choose a PDF file to compress"
              onClick={() => compressInputRef.current.click()}
              onDragEnter={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOverDropzone(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverDropzone(false);
                handleCompressFileSelect([...e.dataTransfer.files]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  compressInputRef.current.click();
                }
              }}
            >
              <div className="dropzone-inner">
                <div className="dropzone-cards" aria-hidden="true">
                  <div className="pdf-card-shadow card-left"></div>
                  <div className="pdf-card-shadow card-right"></div>
                  <div className="pdf-card-front">PDF</div>
                </div>
                <button id="chooseBtn" className="choose-btn-gold" type="button">
                  <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Choose PDF file
                </button>
                <p className="dropzone-text">or drag and drop PDF here</p>
                <div className="dropzone-security">
                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Files are processed locally. Your data stays private.</span>
                </div>
              </div>
            </div>
          )}

          {/* Inner View: Settings */}
          {compressView === "settings" && compressFile && (
            <div className="compress-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(248, 244, 235, 0.12)", paddingBottom: "16px", marginBottom: "24px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "18px" }} title={compressFile.name}>
                    {compressFile.name.length > 40 ? `${compressFile.name.slice(0, 37)}...` : compressFile.name}
                  </h3>
                  <p style={{ margin: 0, color: "var(--subtle)", fontSize: "14px" }}>Original Size: {formatMb(compressFile.size)} MB</p>
                </div>
                <button className="ghost-btn" style={{ minHeight: "36px", padding: "0 12px" }} onClick={() => setCompressView("upload")}>
                  Change File
                </button>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <h4 style={{ margin: "0 0 16px", fontSize: "16px" }}>Select Compression Level</h4>
                <div className="compression-levels">
                  <div
                    className={`level-card${compressionLevel === "low" ? " active" : ""}`}
                    onClick={() => setCompressionLevel("low")}
                  >
                    <h5>Less Compression</h5>
                    <p>High image quality, larger file size</p>
                    <div className="est-size">Est. Size: ~{formatMb(compressFile.size * 0.7)} MB</div>
                  </div>

                  <div
                    className={`level-card${compressionLevel === "medium" ? " active" : ""}`}
                    onClick={() => setCompressionLevel("medium")}
                  >
                    <h5>Recommended</h5>
                    <p>Balanced quality and resolution</p>
                    <div className="est-size">Est. Size: ~{formatMb(compressFile.size * 0.45)} MB</div>
                  </div>

                  <div
                    className={`level-card${compressionLevel === "high" ? " active" : ""}`}
                    onClick={() => setCompressionLevel("high")}
                  >
                    <h5>Extreme Compression</h5>
                    <p>Low image quality, smallest file size</p>
                    <div className="est-size">Est. Size: ~{formatMb(compressFile.size * 0.2)} MB</div>
                  </div>
                </div>
              </div>

              <button className="wide-btn" style={{ width: "100%", minHeight: "52px" }} onClick={() => compressPdf()}>
                Compress PDF
              </button>
            </div>
          )}

          {/* Inner View: Processing */}
          {compressView === "processing" && (
            <div className="compress-card" style={{ textAlign: "center" }}>
              <div className="process-icon" aria-hidden="true" style={{ margin: "0 auto 24px" }}>
                <span></span>
                <span></span>
              </div>
              <h2 style={{ margin: "0 0 8px" }}>Optimizing your PDF</h2>
              <div className="progress" style={{ margin: "24px 0 16px" }}>
                <i style={{ width: `${compressionProgress}%`, transition: "width 0.3s ease" }}></i>
              </div>
              <p style={{ margin: 0, color: "var(--subtle)" }}>Processing images locally in your browser. {compressionProgress}%</p>
            </div>
          )}

          {/* Inner View: Done */}
          {compressView === "done" && (
            <div className="compress-card" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "32px",
              alignItems: "center"
            }}>
              {/* Left Column: Preview */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                background: theme === "light" ? "rgba(16, 22, 36, 0.03)" : "rgba(13, 18, 27, 0.4)",
                border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.08)" : "1px solid rgba(248, 244, 235, 0.08)",
                borderRadius: "12px",
                padding: "24px 16px",
                height: "440px",
                overflowY: "auto",
                width: "100%",
                scrollbarWidth: "thin"
              }}>
                <PreviewPanel url={compressedUrl} target="simple" />
              </div>

              {/* Right Column: Actions */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ marginBottom: "24px" }}>
                  <p className="eyebrow" style={{ margin: "0 0 8px" }}>Success</p>
                  <h2 style={{ margin: "0 0 16px" }}>Optimized Ready</h2>

                  <div className="size-compare">
                    <div className="size-box">
                      <p>Original</p>
                      <strong>{formatMb(originalSize)} MB</strong>
                    </div>
                    <span className="arrow-sep">➔</span>
                    <div className={`size-box optimized${compressedSize > originalSize ? " increased" : ""}`}>
                      <p>{compressedSize > originalSize ? "Result" : "Optimized"}</p>
                      <strong>{formatMb(compressedSize)} MB</strong>
                      {originalSize > compressedSize ? (
                        <span className="saving-badge">
                          -{Math.round(((originalSize - compressedSize) / originalSize) * 100)}%
                        </span>
                      ) : (
                        <span className="saving-badge warning" style={{ background: "var(--danger, #d92d20)" }}>
                          +{Math.round(((compressedSize - originalSize) / originalSize) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {compressedSize > originalSize && (
                    <div style={{
                      marginTop: "16px",
                      padding: "14px 18px",
                      background: theme === "light" ? "rgba(217, 45, 32, 0.06)" : "rgba(217, 45, 32, 0.08)",
                      border: "1px solid rgba(217, 45, 32, 0.25)",
                      borderRadius: "10px",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: theme === "light" ? "#101624" : "rgba(248, 244, 235, 0.85)",
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                      textAlign: "left",
                      marginBottom: "16px"
                    }}>
                      <span style={{ fontSize: "18px", lineHeight: "1" }}>💡</span>
                      <div>
                        <strong style={{ color: theme === "light" ? "var(--danger)" : "#fff", display: "block", marginBottom: "4px" }}>File size increased!</strong>
                        This occurs when the original PDF is already highly compressed or contains mostly text and vector layouts. Converting vector pages into image canvas layers page-by-page can make the file size larger. We recommend keeping the original PDF.
                      </div>
                    </div>
                  )}
                </div>

                <label className="rename-field" style={{ marginBottom: "20px" }}>
                  <span>Rename optimized file</span>
                  <input
                    id="renameCompressInput"
                    type="text"
                    value={compressedName}
                    onChange={(e) => setCompressedName(e.target.value)}
                  />
                </label>

                <button className="wide-btn" style={{ width: "100%", marginBottom: "16px" }} onClick={downloadCompressed}>
                  Download Compressed PDF
                </button>

                <div style={{ display: "flex", gap: "16px" }}>
                  <button className="ghost-btn" style={{ flex: 1 }} onClick={() => setCompressView("settings")}>
                    Configure Level
                  </button>
                  <button className="ghost-btn" style={{ flex: 1 }} onClick={resetCompressState}>
                    Compress Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {compressView === "upload" && (
          <>
            <section className="features-section">
              <div className="section-header">
                <p className="eyebrow-small">Built for</p>
                <h2>Clean document delivery</h2>
              </div>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <h3>Optimize image sizes</h3>
                  <p>Compresses embedded images using canvas scaling and quality rules.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <h3>Select quality level</h3>
                  <p>Choose between Recommended, Less Compression, or Extreme settings.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3>100% Offline</h3>
                  <p>Files are compressed locally in your browser. Safe and secure.</p>
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
                    <p>Choose a PDF file from your device.</p>
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
                    <h4>Select level</h4>
                    <p>Pick a level of compression that fits your needs.</p>
                  </div>

                  <div className="step-card">
                    <div className="step-icon-container">
                      <div className="step-icon-wrapper">
                        <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                        <span className="step-number">3</span>
                      </div>
                      <div className="step-connector"></div>
                    </div>
                    <h4>Optimize</h4>
                    <p>Optimizes all images inside the PDF locally.</p>
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
                    <p>Save your optimized PDF instantly.</p>
                  </div>

                </div>
              </div>
            </section>
          </>
        )}
      </main>


      <Footer />

      <InfoModal
        isOpen={modal.isOpen}
        title={modal.title}
        body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })}
      />
    </>
  );
}

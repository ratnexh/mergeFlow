"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import InfoModal from "../../components/InfoModal";
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

export default function ImageToPdfClient() {
  // Application State
  const [files, setFiles] = useState([]);
  const [view, setView] = useState("landing"); // "landing" | "workspace" | "processing" | "done"
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  
  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Hook workers setup on load (dynamic script loading)
  useEffect(() => {
    loadScript("https://unpkg.com/pdf-lib/dist/pdf-lib.min.js")
      .then(() => {
        setLibsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load PDF-Lib dynamically:", err);
        setLoadingError(true);
      });
  }, []);

  // PDF Settings State
  const [pageSize, setPageSize] = useState("Fit"); // "Fit" | "A4" | "Letter"
  const [orientation, setOrientation] = useState("Auto"); // "Auto" | "Portrait" | "Landscape"
  const [margin, setMargin] = useState(0); // 0 | 10 | 24 (points)
  const [quality, setQuality] = useState(0.85); // 0.6 | 0.85 | 1.0 (JPEG Quality)
  const [bgColor, setBgColor] = useState("#ffffff"); // PDF page background color

  // Done Result State
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultName, setResultName] = useState("converted-images.pdf");
  const [progress, setProgress] = useState(0);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });

  const fileInputRef = useRef(null);

  // Mobile check
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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

  // Cleanup Object URLs on unmount/reloading
  const activeUrlsRef = useRef([]);
  useEffect(() => {
    activeUrlsRef.current = [
      ...files.map((f) => f.url),
      resultUrl
    ].filter(Boolean);
  }, [files, resultUrl]);

  useEffect(() => {
    return () => {
      activeUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("mergeStudioTheme", nextTheme);
    document.body.classList.toggle("theme-light", nextTheme === "light");
  };

  const handleDropdownItemClick = (name) => {
    setIsToolsOpen(false);
    setModal({
      isOpen: true,
      title: name,
      body: "This tool is coming soon in a future update! All document processing stays completely local and secure.",
    });
  };

  const getImgDimensions = (file) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 800, height: 600 });
      };
      img.src = url;
    });
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
        file.size > 0 &&
        (file.type.startsWith("image/") ||
          name.endsWith(".jpg") ||
          name.endsWith(".jpeg") ||
          name.endsWith(".png") ||
          name.endsWith(".webp") ||
          name.endsWith(".gif"))
      );
    });
    if (!usable.length) return;

    const items = await Promise.all(
      usable.map(async (file, idx) => {
        const dims = await getImgDimensions(file);
        return {
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          width: dims.width,
          height: dims.height,
          rotation: 0,
          url: URL.createObjectURL(file),
          accent: palette[(files.length + idx) % palette.length],
        };
      })
    );

    setFiles((prev) => [...prev, ...items]);
    setView("workspace");
  };

  const deleteImage = (id) => {
    const item = files.find((f) => f.id === id);
    if (item) {
      URL.revokeObjectURL(item.url);
    }
    const nextFiles = files.filter((f) => f.id !== id);
    setFiles(nextFiles);
    if (nextFiles.length === 0) {
      setView("landing");
    }
  };

  const rotateImage = (id) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          return {
            ...f,
            rotation: (f.rotation + 90) % 360,
          };
        }
        return f;
      })
    );
  };

  const moveImage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= files.length) return;
    const nextFiles = [...files];
    const [moved] = nextFiles.splice(fromIdx, 1);
    nextFiles.splice(toIdx, 0, moved);
    setFiles(nextFiles);
  };

  const sortImages = () => {
    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    setFiles(sorted);
  };

  const resetApp = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFiles([]);
    setBgColor("#ffffff");
    setResultBlob(null);
    setResultUrl(null);
    setView("landing");
  };

  const convertImagesToPdf = async () => {
    if (files.length === 0) return;
    setView("processing");
    setProgress(0);

    try {
      const { PDFDocument, rgb } = window.PDFLib;
      if (!PDFDocument) {
        throw new Error("PDF-Lib is not pre-loaded. Please refresh the page and try again.");
      }

      const pdfDoc = await PDFDocument.create();

      // Helper to convert hex string to rgb
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
      };

      for (let i = 0; i < files.length; i++) {
        const item = files[i];

        // 1. Load image and draw to canvas with rotation applied
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Failed to load image: ${item.name}`));
          img.src = item.url;
        });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const rotationAngle = item.rotation % 360;
        const isRotated = rotationAngle === 90 || rotationAngle === 270;

        canvas.width = isRotated ? img.height : img.width;
        canvas.height = isRotated ? img.width : img.height;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationAngle * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // 2. Export canvas to jpeg data URL
        const dataUrl = canvas.toDataURL("image/jpeg", Number(quality));
        const b64 = dataUrl.split(",")[1];
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

        // 3. Embed image in PDF Document
        const embeddedImage = await pdfDoc.embedJpg(bytes);

        // 4. Calculate page dimensions
        let targetPageW = 0;
        let targetPageH = 0;

        const flatW = canvas.width;
        const flatH = canvas.height;

        const marginPoints = Number(margin);

        if (pageSize === "Fit") {
          targetPageW = flatW + 2 * marginPoints;
          targetPageH = flatH + 2 * marginPoints;
        } else {
          // A4 = 595.27 x 841.89
          // Letter = 612 x 792
          let baseW = 595.27;
          let baseH = 841.89;
          if (pageSize === "Letter") {
            baseW = 612;
            baseH = 792;
          }

          let isLandscape = orientation === "Landscape";
          if (orientation === "Auto") {
            isLandscape = flatW > flatH;
          }

          targetPageW = isLandscape ? baseH : baseW;
          targetPageH = isLandscape ? baseW : baseH;
        }

        const printW = targetPageW - 2 * marginPoints;
        const printH = targetPageH - 2 * marginPoints;

        // Scale aspect ratio
        const scaleFactor = Math.min(printW / flatW, printH / flatH);
        const drawW = flatW * scaleFactor;
        const drawH = flatH * scaleFactor;

        const drawX = marginPoints + (printW - drawW) / 2;
        const drawY = marginPoints + (printH - drawH) / 2;

        // 5. Add page, draw background and draw image
        const page = pdfDoc.addPage([targetPageW, targetPageH]);
        page.drawRectangle({
          x: 0,
          y: 0,
          width: targetPageW,
          height: targetPageH,
          color: hexToRgb(bgColor),
        });
        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      setResultBlob(pdfBlob);

      const resolvedName = files[0].name.replace(/\.[^.]+$/, "") + "-images.pdf";
      setResultName(resolvedName);

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const resUrl = URL.createObjectURL(pdfBlob);
      setResultUrl(resUrl);

      setView("done");
    } catch (err) {
      console.error("Failed to convert images:", err);
      setModal({
        isOpen: true,
        title: "Conversion Failed",
        body: `Could not build PDF from images: ${err.message}`,
      });
      setView("workspace");
    }
  };

  const downloadResult = () => {
    if (!resultBlob) return;
    const link = document.createElement("a");
    link.href = resultUrl || URL.createObjectURL(resultBlob);
    link.download = resultName.toLowerCase().endsWith(".pdf") ? resultName : `${resultName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const relatedTools = [
    {
      title: "PDF to Image",
      desc: "Convert PDF pages to JPEG/PNG.",
      href: "/pdf-to-image",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
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
      <input
        id="imageInput"
        className="sr-only"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
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

      {/* 1. Landing View */}
      {view === "landing" && (
        <main id="landing" className="landing view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <section className="hero" style={{ flex: 1 }}>
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
                100% Local Conversion
              </p>
              <h1>Image to PDF</h1>
              <p className="hero-copy">
                Convert your JPG, PNG, and WebP image collections into a clean, compiled PDF document directly in your browser.
              </p>
            </div>

            <div
              id="dropzone"
              className={`dropzone${isDragOverDropzone ? " dragover" : ""}`}
              tabIndex="0"
              role="button"
              aria-label="Choose image files or drop them here"
              onClick={() => {
                if (libsLoaded) fileInputRef.current.click();
              }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOverDropzone(false); }}
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
                  <div className="pdf-card-front" style={{ background: "linear-gradient(135deg, #0f8176, #095952)" }}>PDF</div>
                </div>
                {!libsLoaded ? (
                  <p className="dropzone-text" style={{ padding: "20px 0" }}>Loading secure PDF engine...</p>
                ) : (
                  <>
                    <button id="chooseBtn" className="choose-btn-gold" type="button" aria-label="Open file picker">
                      <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Choose Images
                    </button>
                    <p className="dropzone-text">or drag and drop images here</p>
                    <div style={{ fontSize: "13px", color: "var(--subtle)", marginTop: "8px" }}>
                      Supported Formats: <strong>PNG, JPG, JPEG, WebP, GIF</strong> • Max Size: <strong>100MB per file</strong>
                    </div>
                  </>
                )}
                <div className="dropzone-security">
                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Files are processed locally. Your images stay private.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="features-section">
            <div className="section-header">
              <p className="eyebrow-small">Built for</p>
              <h2>High-fidelity compilation</h2>
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
                <h3>PNG, JPG, WebP & GIF</h3>
                <p>Supports all major browser image formats and compiles them cleanly.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                </div>
                <h3>Custom Page Formats</h3>
                <p>Fit to image aspect ratio automatically, or force standard A4 and Letter pages.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3>100% Client-Side</h3>
                <p>No remote uploads. Files are generated instantly and securely in your browser.</p>
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
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span className="step-number">1</span>
                    </div>
                    <div className="step-connector"></div>
                  </div>
                  <h4>Choose Images</h4>
                  <p>Select images from your device.</p>
                </div>

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      <span className="step-number">2</span>
                    </div>
                    <div className="step-connector"></div>
                  </div>
                  <h4>Arrange / Rotate</h4>
                  <p>Order slides left-to-right, rotate specific pages 90° as needed.</p>
                </div>

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span className="step-number">3</span>
                    </div>
                    <div className="step-connector"></div>
                  </div>
                  <h4>Configure Layout</h4>
                  <p>Choose page margins, custom sizes, orientation, and image quality.</p>
                </div>

                <div className="step-card">
                  <div className="step-icon-container">
                    <div className="step-icon-wrapper">
                      <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span className="step-number">4</span>
                    </div>
                  </div>
                  <h4>Export PDF</h4>
                  <p>Compile and download your clean PDF locally.</p>
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
                Convert Images to PDF Online Locally & Securely
              </h2>
              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--subtle)", marginBottom: "24px" }}>
                RawPDF provides a clean, private interface to convert images (PNG, JPEG, WebP, GIF) into standard PDF documents. Running 100% locally in your browser sandbox using Javascript libraries, your images never leave your computer. This makes RawPDF ideal for assembling photos of IDs, receipts, drawings, or documents into secure PDFs.
              </p>

              <h3 style={{ fontSize: "18px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "12px", fontWeight: 700 }}>
                How to Convert JPG & PNG Images to PDF Offline
              </h3>
              <ol style={{ fontSize: "14.5px", lineHeight: "1.8", color: "var(--subtle)", paddingLeft: "20px", marginBottom: "24px" }}>
                <li>Drag and drop your images into the dropzone box above, or choose files from your file manager.</li>
                <li>In the workspace, drag to arrange your images into the desired sequence. Use the rotation buttons to adjust orient.</li>
                <li>Set page sizes to <strong>Fit to Image</strong>, <strong>A4</strong>, or <strong>US Letter</strong> page templates.</li>
                <li>Configure custom margins, background color, and output compression quality to optimize file size.</li>
                <li>Click <strong>Convert Images</strong> to generate and download your compiled PDF file instantly.</li>
              </ol>

              <h3 style={{ fontSize: "18px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "12px", fontWeight: 700 }}>
                Key Benefits of Browser-Based Conversion
              </h3>
              <ul style={{ fontSize: "14.5px", lineHeight: "1.8", color: "var(--subtle)", paddingLeft: "20px", marginBottom: "32px" }}>
                <li><strong>Private & Safe:</strong> All processing is done locally. Your photos and sensitive scans are never uploaded to any remote server.</li>
                <li><strong>Fast Performance:</strong> With no network upload or download bottlenecks, files compile instantly in your browser memory.</li>
                <li><strong>Custom Design Options:</strong> Control orientation, page colors, compression density, and spacing borders for professional looking PDF decks.</li>
              </ul>

              <h3 style={{ fontSize: "22px", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "20px", fontWeight: 700, borderBottom: "1px solid rgba(248, 244, 235, 0.08)", paddingBottom: "8px" }}>
                Frequently Asked Questions
              </h3>
              <div className="seo-faq-grid">
                <div className="seo-faq-item">
                  <h4>Is Image to PDF conversion free?</h4>
                  <p>Yes. RawPDF is completely free to use. There are no registration forms, watermarks, or daily conversion quotas.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>Which image formats are supported?</h4>
                  <p>We support all common image file types, including PNG, JPG, JPEG, WebP, and non-animated GIFs.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>Can I adjust page layouts and margins?</h4>
                  <p>Yes. You can select custom margins (0pt, 10pt, 24pt), choose custom background colors, and set page sizes (Fit to image, A4, or Letter) in the editor sidebar.</p>
                </div>
                <div className="seo-faq-item">
                  <h4>Is there a file size limit?</h4>
                  <p>Each uploaded image can be up to 100MB, letting you compile extremely high-resolution image sets and scanned photo sheets easily.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SoftwareApplication Schema Markup */}
          <Script id="schema-image-to-pdf" type="application/ld+json" strategy="afterInteractive">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "RawPDF Image to PDF Converter",
              "description": "Convert image collections (PNG, JPG, WebP) into structured PDF documents locally in your browser. 100% private, client-side, and free.",
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

      {/* 2. Workspace View */}
      {view === "workspace" && (
        <main id="workspace" className="studio view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Workspace top navigation bar */}
          <div className="workspace-header">
            <button className="ghost-btn workspace-back" onClick={resetApp}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div className="workspace-title-area">
              <h3 className="workspace-title">Image to PDF</h3>
              <p className="workspace-subtitle">{files.length} {files.length === 1 ? "image" : "images"} loaded</p>
            </div>
            <div className="workspace-actions" />
          </div>

          <section className="studio-layout two-col-studio" style={{ flex: 1 }}>
            {/* Left Sidebar */}
            <aside className={`controls-panel${isControlsOpen ? " open" : ""}`}>
              <div className="controls-header">
                <div className="tabs single-tab" role="tablist">
                  <button className="tab active" type="button">
                    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    PDF settings
                  </button>
                </div>
                <button
                  className="toggle-controls-btn"
                  type="button"
                  aria-expanded={isControlsOpen}
                  onClick={() => setIsControlsOpen(!isControlsOpen)}
                >
                  Tools
                </button>
              </div>

              <div className="controls-content">
                <button
                  className="wide-btn-gold"
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  style={{ marginBottom: 16 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="plus-icon" style={{ width: 16, height: 16, marginRight: 8, display: "inline" }}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add more images
                </button>

                <p className="sidebar-subheading">PAGE SIZE</p>
                <div style={{ marginBottom: 20 }}>
                  <select
                    className="sidebar-select"
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    style={{ width: "100%", maxWidth: "none", padding: "10px", borderRadius: "8px", background: theme === "light" ? "rgba(16, 22, 36, 0.05)" : "rgba(13,18,27,0.5)", border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.12)" : "1px solid rgba(248,244,235,0.15)", color: theme === "light" ? "#101624" : "#f8f4eb" }}
                  >
                    <option value="Fit">Fit to Image Size</option>
                    <option value="A4">A4 (595 x 842 pt)</option>
                    <option value="Letter">US Letter (612 x 792 pt)</option>
                  </select>
                </div>

                {pageSize !== "Fit" && (
                  <>
                    <p className="sidebar-subheading">ORIENTATION</p>
                    <div style={{ marginBottom: 20 }}>
                      <select
                        className="sidebar-select"
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value)}
                        style={{ width: "100%", maxWidth: "none", padding: "10px", borderRadius: "8px", background: theme === "light" ? "rgba(16, 22, 36, 0.05)" : "rgba(13,18,27,0.5)", border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.12)" : "1px solid rgba(248,244,235,0.15)", color: theme === "light" ? "#101624" : "#f8f4eb" }}
                      >
                        <option value="Auto">Auto (Match Image Ratio)</option>
                        <option value="Portrait">Portrait</option>
                        <option value="Landscape">Landscape</option>
                      </select>
                    </div>
                  </>
                )}

                <p className="sidebar-subheading">MARGIN SIZE</p>
                <div style={{ marginBottom: 20 }}>
                  <select
                    className="sidebar-select"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    style={{ width: "100%", maxWidth: "none", padding: "10px", borderRadius: "8px", background: theme === "light" ? "rgba(16, 22, 36, 0.05)" : "rgba(13,18,27,0.5)", border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.12)" : "1px solid rgba(248,244,235,0.15)", color: theme === "light" ? "#101624" : "#f8f4eb" }}
                  >
                    <option value={0}>No Margin (0 pt)</option>
                    <option value={10}>Small Margin (10 pt)</option>
                    <option value={24}>Large Margin (24 pt)</option>
                  </select>
                </div>

                <p className="sidebar-subheading">BACKGROUND COLOR</p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "20px" }}>
                  {[
                    { hex: "#ffffff", label: "White" },
                    { hex: "#f3f4f6", label: "Gray" },
                    { hex: "#0d121b", label: "Dark" }
                  ].map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: color.hex,
                        border: bgColor === color.hex ? "2.5px solid var(--gold)" : (theme === "light" ? "1px solid rgba(16, 22, 36, 0.15)" : "1px solid rgba(248, 244, 235, 0.25)"),
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => setBgColor(color.hex)}
                      title={color.label}
                    />
                  ))}
                  
                  {/* Custom Color Input */}
                  <div style={{ position: "relative", width: "32px", height: "32px" }}>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                      }}
                      title="Choose Custom Color"
                    />
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #ff0055, #00ff55, #0055ff)",
                        border: !["#ffffff", "#f3f4f6", "#0d121b"].includes(bgColor) ? "2.5px solid var(--gold)" : (theme === "light" ? "1px solid rgba(16, 22, 36, 0.15)" : "1px solid rgba(248, 244, 235, 0.25)"),
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        color: "#fff",
                        fontWeight: "bold",
                      }}
                    >
                      🌈
                    </div>
                  </div>
                  
                  <span style={{ fontSize: "11px", color: "var(--subtle)", marginLeft: "4px" }}>
                    {bgColor.toUpperCase()}
                  </span>
                </div>

                <p className="sidebar-subheading">COMPRESSION QUALITY</p>
                <div style={{ marginBottom: 20 }}>
                  <select
                    className="sidebar-select"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    style={{ width: "100%", maxWidth: "none", padding: "10px", borderRadius: "8px", background: theme === "light" ? "rgba(16, 22, 36, 0.05)" : "rgba(13,18,27,0.5)", border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.12)" : "1px solid rgba(248,244,235,0.15)", color: theme === "light" ? "#101624" : "#f8f4eb" }}
                  >
                    <option value={0.95}>High (Best quality)</option>
                    <option value={0.80}>Medium (Balanced)</option>
                    <option value={0.60}>Low (Compact size)</option>
                  </select>
                </div>

                <p className="sidebar-subheading">ACTIONS</p>
                <div className="sidebar-actions-list" style={{ gap: 8 }}>
                  <button className="action-item" type="button" onClick={sortImages}>
                    Sort A-Z by name
                  </button>
                  <button className="action-item danger" type="button" onClick={resetApp}>
                    Start over
                  </button>
                </div>

                {files.length > 0 && (
                  <div className="sidebar-selection-badge" style={{ marginTop: 20 }}>
                    <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <div className="badge-details">
                      <p className="badge-title">{files.length} {files.length === 1 ? "image" : "images"} total</p>
                      <p className="badge-subtitle">Size: {formatMb(files.reduce((sum, f) => sum + f.size, 0))} MB</p>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Right main area */}
            <section className="file-area">
              <div className="file-area-header-new">
                <p className="file-area-title" style={{ margin: 0 }}>Arrange the sequence of pages and apply rotations.</p>
                <div className="file-area-merge-block">
                  <button id="convertBtn" className="merge-btn-gold" type="button" onClick={convertImagesToPdf}>
                    <svg className="sparkle-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707" />
                    </svg>
                    <span>Convert to PDF</span>
                    <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Grid Layout for images */}
              <div className="file-grid" style={{ marginTop: 16 }}>
                {files.map((item, idx) => (
                  <article
                    key={item.id}
                    className="file-card"
                    style={{ cursor: "default", height: "auto", display: "flex", flexDirection: "column" }}
                  >
                    <div className="card-index-badge">{idx + 1}</div>

                    <div className="page-thumb" style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)", overflow: "hidden", position: "relative" }}>
                      <img
                        src={item.url}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          transform: `rotate(${item.rotation}deg)`,
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </div>

                    <div className="card-meta" style={{ textAlign: "center", padding: "10px", display: "flex", flexDirection: "column", gap: 4, flex: 1, justifyContent: "space-between" }}>
                      <div>
                        <span className="file-name" title={item.name} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-all", fontSize: 12, lineHeight: "1.3", height: "31px", marginBottom: "4px" }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--subtle)" }}>{formatMb(item.size)} MB</span>
                      </div>
                      
                      {/* Action buttons row */}
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
                        <button
                          type="button"
                          className="ghost-btn"
                          disabled={idx === 0}
                          onClick={() => moveImage(idx, idx - 1)}
                          style={{ padding: "4px 8px", fontSize: 11, minHeight: "auto", minWidth: "auto" }}
                          title="Move left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => rotateImage(item.id)}
                          style={{ padding: "4px 8px", fontSize: 11, minHeight: "auto", minWidth: "auto" }}
                          title="Rotate 90°"
                        >
                          ↻
                        </button>
                        <button
                          type="button"
                          className="ghost-btn danger"
                          onClick={() => deleteImage(item.id)}
                          style={{ padding: "4px 8px", fontSize: 11, minHeight: "auto", minWidth: "auto" }}
                          title="Remove image"
                        >
                          ✕
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          disabled={idx === files.length - 1}
                          onClick={() => moveImage(idx, idx + 1)}
                          style={{ padding: "4px 8px", fontSize: 11, minHeight: "auto", minWidth: "auto" }}
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </main>
      )}

      {/* 3. Processing View */}
      {view === "processing" && (
        <main className="landing view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="compress-card" style={{ textAlign: "center", maxWidth: 420, width: "100%", margin: "0 auto" }}>
            <div className="process-icon" style={{ margin: "0 auto 24px" }}>
              <span></span>
              <span></span>
            </div>
            <h2 style={{ margin: "0 0 8px" }}>Building PDF</h2>
            <div className="progress" style={{ margin: "24px 0 16px" }}>
              <i style={{ width: `${progress}%`, transition: "width 0.3s ease" }}></i>
            </div>
            <p style={{ margin: 0, color: "var(--subtle)" }}>Processing images and wrapping layout... {progress}%</p>
          </div>
        </main>
      )}

      {/* 4. Done View */}
      {view === "done" && (
        <main className="landing view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="hero-content" style={{ textAlign: "center" }}>
            <Link className="ghost-btn-back" href="/" style={{ display: "inline-flex", margin: "0 auto 24px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, marginRight: 8, alignSelf: "center" }}>
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Tools
            </Link>
            <h1>PDF Generated Successfully</h1>
          </div>
          <div className="compress-card" style={{ maxWidth: 520, width: "100%", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div style={{ background: "rgba(15,129,118,0.12)", color: "#0f8176", width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 34, height: 34 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h3 style={{ textAlign: "center", margin: "0 0 8px", wordBreak: "break-all" }}>
              {resultName.length > 36 ? `${resultName.slice(0, 33)}...` : resultName}
            </h3>
            <p style={{ textAlign: "center", color: "var(--subtle)", margin: "0 0 24px" }}>
              {resultBlob ? `${formatMb(resultBlob.size)} MB — ready to download` : ""}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="wide-btn" onClick={downloadResult} style={{ minHeight: 50, marginTop: 0, background: "#0f8176" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, display: "inline", marginRight: 8 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </button>
              <button className="ghost-btn" onClick={resetApp} style={{ width: "100%", minHeight: 50 }}>Convert Another</button>
            </div>
          </div>
        </main>
      )}

      {view !== "workspace" && <Footer />}

      <InfoModal
        isOpen={modal.isOpen}
        title={modal.title}
        body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })}
      />
    </>
  );
}

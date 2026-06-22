"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import InfoModal from "../../components/InfoModal";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ImageEditorModal from "../../components/ImageEditorModal";

// Lazy rendering of PDF Page inside grid thumbnail
function PageCardThumbnail({ pdfDoc, pageNum }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!pdfDoc) return;

    const renderThumb = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");

        // Scale to fit card preview height
        const viewport = page.getViewport({ scale: 0.35 });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        };

        await page.render(renderContext).promise;
        if (active) setLoading(false);
      } catch (err) {
        console.error("Failed to render card thumbnail:", err);
        if (active) setLoading(false);
      }
    };

    renderThumb();

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNum]);

  return (
    <div className="card-thumb-container">
      {loading && (
        <div className="card-thumb-loading">
          Loading preview...
        </div>
      )}
      <canvas ref={canvasRef} className="card-thumb-canvas" />
    </div>
  );
}

export default function PdfToImageClient() {
  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });

  // PDF to Image States
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [imageFormat, setImageFormat] = useState("png"); // "png" | "jpeg"
  const [resolutionScale, setResolutionScale] = useState(2); // 1 = 1x, 2 = 2x, 3 = 3x
  const [toImageView, setToImageView] = useState("upload"); // "upload" | "workspace" | "processing" | "done"
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultName, setResultName] = useState("");
  const [conversionProgress, setConversionProgress] = useState(0);
  const [convertedImages, setConvertedImages] = useState([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [isControlsOpen, setIsControlsOpen] = useState(false);
  // Track viewport size for mobile layout variations
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fileInputRef = useRef(null);

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

  // Clean up PDF.js document on change or unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [pdfDoc]);

  // Cleanup Object URLs on unmount
  const activeUrlsRef = useRef([]);
  useEffect(() => {
    const urls = [];
    convertedImages.forEach((img) => {
      if (img.url) urls.push(img.url);
      if (img.history) {
        img.history.forEach((u) => {
          if (u.startsWith("blob:")) urls.push(u);
        });
      }
    });
    if (resultUrl) urls.push(resultUrl);
    activeUrlsRef.current = urls;
  }, [convertedImages, resultUrl]);

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
    if (name === "PDF to Image") {
      resetToImageState();
    } else {
      setModal({
        isOpen: true,
        title: name,
        body: "This tool is coming soon in a future update! All document processing stays completely local and secure.",
      });
    }
  };

  const resetToImageState = () => {
    setPdfFile(null);
    setPdfDoc((prev) => {
      if (prev) prev.destroy();
      return null;
    });
    setTotalPages(0);
    setSelectedPages(new Set());
    setImageFormat("png");
    setResolutionScale(2);
    setToImageView("upload");
    setResultBlob(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultName("");
    setConversionProgress(0);
    setIsControlsOpen(false);

    // Revoke and clear converted images memory
    convertedImages.forEach((img) => {
      if (img.url) URL.revokeObjectURL(img.url);
      if (img.history) {
        img.history.forEach((u) => {
          if (u.startsWith("blob:")) URL.revokeObjectURL(u);
        });
      }
    });
    setConvertedImages([]);
    setIsEditorOpen(false);
  };

  const handleFileSelect = async (filesList) => {
    const tooLarge = filesList.find((file) => file.size > 104857600);
    if (tooLarge) {
      setModal({
        isOpen: true,
        title: "File Too Large",
        body: `The file "${tooLarge.name}" exceeds the maximum size limit of 100MB. Please select a smaller file.`,
      });
      return;
    }
    const usable = filesList.filter((file) => {
      const name = file.name.toLowerCase();
      return file.size > 0 && (file.type === "application/pdf" || name.endsWith(".pdf"));
    });
    if (!usable.length) return;
    const file = usable[0];

    if (!window.pdfjsLib) {
      setModal({
        isOpen: true,
        title: "Library Not Ready",
        body: "PDF.js is not yet loaded. Please wait a moment and try again.",
      });
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

      setPdfDoc((prev) => {
        if (prev) prev.destroy();
        return doc;
      });
      setTotalPages(doc.numPages);
      setPdfFile(file);

      // Select all pages by default
      const defaultSelection = new Set();
      for (let i = 1; i <= doc.numPages; i++) {
        defaultSelection.add(i);
      }
      setSelectedPages(defaultSelection);
      setToImageView("workspace");
    } catch (err) {
      console.error("Failed to load PDF:", err);
      setModal({
        isOpen: true,
        title: "Could Not Load PDF",
        body: "The file could not be loaded. Please make sure it is a valid, unencrypted PDF document.",
      });
    }
  };

  const togglePageSelection = (pageNum) => {
    const next = new Set(selectedPages);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setSelectedPages(next);
  };

  const handleSelectAll = () => {
    const next = new Set();
    for (let i = 1; i <= totalPages; i++) {
      next.add(i);
    }
    setSelectedPages(next);
  };

  const handleClearSelection = () => {
    setSelectedPages(new Set());
  };

  const handleSelectOdd = () => {
    const next = new Set();
    for (let i = 1; i <= totalPages; i += 2) {
      next.add(i);
    }
    setSelectedPages(next);
  };

  const handleSelectEven = () => {
    const next = new Set();
    for (let i = 2; i <= totalPages; i += 2) {
      next.add(i);
    }
    setSelectedPages(next);
  };

  const handleConvert = async () => {
    if (selectedPages.size === 0) {
      setModal({
        isOpen: true,
        title: "No Pages Selected",
        body: "Please select at least one page to convert to an image.",
      });
      return;
    }

    setToImageView("processing");
    setConversionProgress(0);

    try {
      const JSZip = window.JSZip;
      if (!JSZip) {
        throw new Error("JSZip is not pre-loaded. Please refresh the page and try again.");
      }

      const selectedList = Array.from(selectedPages).sort((a, b) => a - b);
      const totalSelected = selectedList.length;
      const imagesList = [];

      for (let i = 0; i < totalSelected; i++) {
        const pageNum = selectedList[i];
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: resolutionScale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        const mimeType = imageFormat === "png" ? "image/png" : "image/jpeg";
        const quality = imageFormat === "png" ? undefined : 0.92;

        const imageBlob = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas render failed"));
          }, mimeType, quality);
        });

        const baseName = pdfFile.name.replace(/\.pdf$/i, "");
        const ext = imageFormat === "png" ? "png" : "jpg";
        const fileName = `${baseName}-page-${pageNum}.${ext}`;

        imagesList.push({
          id: `${pageNum}-${Date.now()}-${i}`,
          pageNum,
          blob: imageBlob,
          url: URL.createObjectURL(imageBlob),
          name: fileName,
        });

        setConversionProgress(Math.round(((i + 1) / totalSelected) * 100));
      }

      setConvertedImages(imagesList);

      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      if (totalSelected === 1) {
        setResultBlob(imagesList[0].blob);
        setResultName(imagesList[0].name);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(imagesList[0].url);
      } else {
        const zip = new JSZip();
        imagesList.forEach((img) => {
          zip.file(img.name, img.blob);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setResultBlob(zipBlob);
        setResultName(`${baseName}-images.zip`);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(URL.createObjectURL(zipBlob));
      }

      setToImageView("done");
    } catch (err) {
      console.error("Image conversion failed:", err);
      setModal({
        isOpen: true,
        title: "Conversion Error",
        body: `Failed to convert PDF pages: ${err.message}`,
      });
      setToImageView("workspace");
    }
  };

  const onSaveEdits = async (updatedImages) => {
    // Revoke old URL references for images that were updated
    convertedImages.forEach((oldImg) => {
      const newImg = updatedImages.find((u) => u.id === oldImg.id);
      if (newImg && newImg.url !== oldImg.url) {
        URL.revokeObjectURL(oldImg.url);
      }
    });

    setConvertedImages(updatedImages);
    setIsEditorOpen(false);

    try {
      const totalSelected = updatedImages.length;
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");

      if (totalSelected === 1) {
        setResultBlob(updatedImages[0].blob);
        setResultName(updatedImages[0].name);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(updatedImages[0].url);
      } else {
        const JSZip = window.JSZip;
        if (!JSZip) {
          throw new Error("JSZip library is missing.");
        }
        const zip = new JSZip();
        updatedImages.forEach((img) => {
          zip.file(img.name, img.blob);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setResultBlob(zipBlob);
        setResultName(`${baseName}-images.zip`);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(URL.createObjectURL(zipBlob));
      }
    } catch (err) {
      console.error("Failed to repackage edited images:", err);
      setModal({
        isOpen: true,
        title: "Repackaging Error",
        body: `Could not save edited changes: ${err.message}`,
      });
    }
  };

  const downloadResult = () => {
    if (!resultBlob) return;
    const link = document.createElement("a");
    link.href = resultUrl || URL.createObjectURL(resultBlob);
    link.download = resultName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const formatMb = (bytes) =>
    Math.max(0.1, bytes / 1024 / 1024).toFixed(bytes > 10000000 ? 0 : 1);

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  return (
    <>
      {toImageView !== "workspace" && (
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

      <input
        id="pdfToImageInput"
        className="sr-only"
        type="file"
        accept=".pdf,application/pdf"
        ref={fileInputRef}
        onChange={(e) => {
          handleFileSelect([...e.target.files]);
          e.target.value = "";
        }}
      />

      {/* 1. Upload/Landing View */}
      {toImageView === "upload" && (
        <main id="pdf-to-image" className="landing view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <section className="hero" style={{ flex: 1 }}>
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
                <h1>PDF to Image</h1>
                <p className="hero-copy">
                  Convert your PDF pages into high-quality PNG or JPEG image assets — all processed locally in your browser.
                </p>
              </div>

              <div
                id="pdfToImageDropzone"
                className={`dropzone${isDragOverDropzone ? " dragover" : ""}`}
                tabIndex="0"
                role="button"
                aria-label="Choose a PDF file to convert into images"
                onClick={() => fileInputRef.current.click()}
                onDragEnter={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragOverDropzone(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOverDropzone(false);
                  handleFileSelect([...e.dataTransfer.files]);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current.click();
                  }
                }}
              >
                <div className="dropzone-inner">
                  <div className="dropzone-cards" aria-hidden="true">
                    <div className="pdf-card-shadow card-left"></div>
                    <div className="pdf-card-shadow card-right"></div>
                    <div className="pdf-card-front" style={{ background: "linear-gradient(135deg, #f97316, #d87c3e)" }}>IMG</div>
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
            </section>

            <section className="features-section">
              <div className="section-header">
                <p className="eyebrow-small">Built for</p>
                <h2>High-fidelity assets</h2>
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
                  <h3>PNG or JPEG exports</h3>
                  <p>Convert pages to widely supported image formats with custom alpha settings.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </div>
                  <h3>Up to 3x Retina resolution</h3>
                  <p>Upscale vector text and graphics for clean, crisp viewing and readable printouts.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3>100% Offline conversion</h3>
                  <p>Your files are converted inside the browser. No uploads, no servers, absolute privacy.</p>
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
                    <p>Select a PDF document from your device.</p>
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
                    <h4>Select scale</h4>
                    <p>Choose PNG/JPEG and standard, high quality, or Ultra HD scale settings.</p>
                  </div>

                  <div className="step-card">
                    <div className="step-icon-container">
                      <div className="step-icon-wrapper">
                        <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 11 12 14 22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span className="step-number">3</span>
                      </div>
                      <div className="step-connector"></div>
                    </div>
                    <h4>Choose pages</h4>
                    <p>Select all, odd, even, or specific pages in the preview grid.</p>
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
                    <h4>Download ZIP</h4>
                    <p>Save all converted image assets locally inside a single ZIP.</p>
                  </div>
                </div>
              </div>
            </section>
          </main>
        )}

        {/* 2. Workspace View */}
        {toImageView === "workspace" && (
          <main id="workspace" className="studio view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Workspace top navigation bar */}
            <div className="workspace-header">
              <button className="ghost-btn workspace-back" onClick={resetToImageState}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <div className="workspace-title-area">
                <h3 className="workspace-title">{pdfFile?.name || "PDF to Image"}</h3>
                <p className="workspace-subtitle">{totalPages} Pages Loaded</p>
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
                    Convert Settings
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
                <p className="sidebar-subheading">IMAGE FORMAT</p>
                <div className="sidebar-view-toggle" style={{ marginBottom: 20 }}>
                  <button
                    className={`view-btn-toggle${imageFormat === "png" ? " active" : ""}`}
                    type="button"
                    onClick={() => setImageFormat("png")}
                  >
                    PNG
                  </button>
                  <button
                    className={`view-btn-toggle${imageFormat === "jpeg" ? " active" : ""}`}
                    type="button"
                    onClick={() => setImageFormat("jpeg")}
                  >
                    JPEG
                  </button>
                </div>

                <p className="sidebar-subheading">RESOLUTION / QUALITY</p>
                <div style={{ marginBottom: 20 }}>
                  <select
                    className="sidebar-select"
                    value={resolutionScale}
                    onChange={(e) => setResolutionScale(Number(e.target.value))}
                    style={{ width: "100%", maxWidth: "none", padding: "10px", borderRadius: "8px", background: theme === "light" ? "rgba(16, 22, 36, 0.05)" : "rgba(13,18,27,0.5)", border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.12)" : "1px solid rgba(248,244,235,0.15)", color: theme === "light" ? "#101624" : "#f8f4eb" }}
                  >
                    <option value={1}>1x - Standard Quality</option>
                    <option value={2}>2x - High Quality (Retina)</option>
                    <option value={3}>3x - Ultra HD Quality</option>
                  </select>
                </div>

                <p className="sidebar-subheading">PAGE SELECTIONS</p>
                <div className="sidebar-actions-list" style={{ gap: 8 }}>
                  <button className="action-item" type="button" onClick={handleSelectAll}>
                    Select all pages
                  </button>
                  <button className="action-item" type="button" onClick={handleClearSelection}>
                    Clear selection
                  </button>
                  <button className="action-item" type="button" onClick={handleSelectOdd}>
                    Select odd pages
                  </button>
                  <button className="action-item" type="button" onClick={handleSelectEven}>
                    Select even pages
                  </button>
                  <button className="action-item danger" type="button" onClick={resetToImageState}>
                    Start over
                  </button>
                </div>

                {selectedPages.size > 0 && (
                  <div className="sidebar-selection-badge" style={{ marginTop: 20 }}>
                    <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <div className="badge-details">
                      <p className="badge-title">{selectedPages.size} {selectedPages.size === 1 ? "page" : "pages"} selected</p>
                      <p className="badge-subtitle">Exporting to {imageFormat.toUpperCase()}</p>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Right main area */}
            <section className="file-area">
              <div className="file-area-header-new">
                <p className="file-area-title" style={{ margin: 0 }}>Select PDF pages to convert into image assets.</p>
                <div className="file-area-merge-block">
                  <button id="convertBtn" className="merge-btn-gold" type="button" onClick={handleConvert}>
                    <svg className="sparkle-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707" />
                    </svg>
                    <span>Convert to {imageFormat.toUpperCase()}</span>
                    <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Grid Layout for Pages */}
              <div className="file-grid" style={{ marginTop: 16 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isSelected = selectedPages.has(pageNum);
                  return (
                    <article
                      key={pageNum}
                      className={`file-card${isSelected ? " selected" : ""}`}
                      onClick={() => togglePageSelection(pageNum)}
                      style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    >
                      <div className="card-index-badge">{pageNum}</div>

                      <label className="card-check" style={{ pointerEvents: "none" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                        />
                        <span className="card-check-custom" />
                      </label>

                      <div className="page-thumb">
                        <PageCardThumbnail pdfDoc={pdfDoc} pageNum={pageNum} />
                      </div>

                      <div className="card-meta" style={{ textAlign: "center" }}>
                        <span className="file-name">Page {pageNum}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </section>
        </main>
      )}

        {/* 3. Processing View */}
        {toImageView === "processing" && (
          <main className="landing view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <section className="hero" style={{ flex: 1 }}>
              <div className="compress-card" style={{ textAlign: "center", maxWidth: 420, width: "100%", margin: "0 auto" }}>
                <div className="process-icon" style={{ margin: "0 auto 24px" }}>
                  <span></span>
                  <span></span>
                </div>
                <h2 style={{ margin: "0 0 8px" }}>Converting PDF</h2>
                <div className="progress" style={{ margin: "24px 0 16px" }}>
                  <i style={{ width: `${conversionProgress}%`, transition: "width 0.3s ease" }}></i>
                </div>
                <p style={{ margin: 0, color: "var(--subtle)" }}>Converting pages locally in your browser... {conversionProgress}%</p>
              </div>
            </section>
          </main>
        )}

        {/* 4. Done View */}
        {toImageView === "done" && (
          <main className="landing view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <section className="hero" style={{ flex: 1 }}>
              <div className="hero-content">
                <Link className="ghost-btn-back" href="/">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back to Tools
                </Link>
                <h1>Conversion Ready</h1>
              </div>
              <div className="compress-card" style={{ maxWidth: 520, width: "100%", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                  <div style={{ background: "rgba(184,138,67,0.12)", color: "var(--gold)", width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 34, height: 34 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
                <h3 style={{ textAlign: "center", margin: "0 0 8px" }}>
                  {resultName.length > 36 ? `${resultName.slice(0, 33)}...` : resultName}
                </h3>
                <p style={{ textAlign: "center", color: "var(--subtle)", margin: "0 0 24px" }}>
                  {resultBlob ? `${formatMb(resultBlob.size)} MB — ready to download` : ""}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="wide-btn" onClick={downloadResult} style={{ flex: 1, minHeight: 50, marginTop: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, display: "inline", marginRight: 8 }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </button>
                    <button className="ghost-btn" onClick={() => setIsEditorOpen(true)} style={{ flex: 1, minHeight: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                      </svg>
                      Edit Images
                    </button>
                  </div>
                  <button className="ghost-btn" onClick={resetToImageState} style={{ width: "100%", minHeight: 50 }}>Convert Another</button>
                </div>
              </div>
            </section>
          </main>
        )}

        {toImageView !== "workspace" && <Footer />}

      <ImageEditorModal
        isOpen={isEditorOpen}
        images={convertedImages}
        onSave={onSaveEdits}
        onClose={() => setIsEditorOpen(false)}
      />

      <InfoModal
        isOpen={modal.isOpen}
        title={modal.title}
        body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })}
      />
    </>
  );
}

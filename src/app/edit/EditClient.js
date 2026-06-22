"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import InfoModal from "../../components/InfoModal";

const TOOLS = { SELECT: "select", TEXT: "text", HIGHLIGHT: "highlight", RECTANGLE: "rectangle", IMAGE: "image", WHITEOUT: "whiteout" };

const DEFAULT_TEXT_STYLE = { fontSize: 18, color: "#ffffff", fontFamily: "Helvetica", bold: false, italic: false };

const COLORS = ["#ffffff", "#000000", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#b88a43"];

const genId = () => Math.random().toString(36).slice(2, 9);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function EditClient() {
  const [theme, setTheme] = useState("dark");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });
  const [view, setView] = useState("upload"); // upload | editor | processing | done
  const [pdfFile, setPdfFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageRendering, setPageRendering] = useState(false);
  const [scale, setScale] = useState(1.4);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [annotations, setAnnotations] = useState({});
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [selectedId, setSelectedId] = useState(null);
  const [textStyle, setTextStyle] = useState(DEFAULT_TEXT_STYLE);
  const [highlightColor, setHighlightColor] = useState("#fbbf24");
  const [drawing, setDrawing] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultName, setResultName] = useState("");
  const [progress, setProgress] = useState(0);
  const [pageTextItems, setPageTextItems] = useState([]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = () => setIsMobile(window.innerWidth < 768);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const renderTaskRef = useRef(null);

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

  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      const el = document.getElementById("toolsDropdown");
      if (el && !el.contains(e.target)) setIsToolsOpen(false);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        if (modal.isOpen) setModal({ isOpen: false, title: "", body: "" });
        setActiveTool(TOOLS.SELECT);
        setSelectedId(null);
        setDrawing(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal]);

  // Cleanup PDF.js document on change or unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [pdfDoc]);

  // Cleanup Object URL on unmount and changes
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  }, []);

  const handleDropdownItemClick = (name) => {
    setIsToolsOpen(false);
    setModal({ isOpen: true, title: name, body: "This tool is coming soon in a future update! All document processing stays completely local and secure." });
  };

  const loadPdf = useCallback(async (file) => {
    if (!window.pdfjsLib) {
      setModal({ isOpen: true, title: "Library Not Ready", body: "PDF.js is not yet loaded. Please wait a moment and try again." });
      return;
    }
    try {
      const ab = await file.arrayBuffer();
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setAnnotations({});
      setSelectedId(null);
      setView("editor");
    } catch (err) {
      console.error("Failed to load PDF:", err);
      setModal({ isOpen: true, title: "Could Not Load PDF", body: "The file could not be loaded. Please make sure it is a valid, unencrypted PDF." });
    }
  }, []);

  useEffect(() => {
    if (!pdfDoc || view !== "editor") return;
    (async () => {
      setPageRendering(true);
      try {
        if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null; }
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPageSize({ width: viewport.width, height: viewport.height });
        const ctx = canvas.getContext("2d");
        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;

        // Extract page text items and map coordinates
        const textContent = await page.getTextContent();
        const items = textContent.items.map((item) => {
          const tx = item.transform[4];
          const ty = item.transform[5];
          const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
          const w = item.width * scale;
          const h = item.height * scale;
          return {
            str: item.str,
            x: vx,
            y: vy - h,
            w: w + 2,
            h: h + 2,
          };
        }).filter((item) => item.str.trim().length > 0);
        setPageTextItems(items);
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") console.error("Render/Text error:", err);
      } finally {
        setPageRendering(false);
      }
    })();
  }, [pdfDoc, currentPage, scale, view]);

  const handleFileSelect = (files) => {
    const tooLarge = files.find((file) => file.size > 104857600);
    if (tooLarge) {
      setModal({
        isOpen: true,
        title: "File Too Large",
        body: `The file "${tooLarge.name}" exceeds the maximum size limit of 100MB. Please select a smaller file.`,
      });
      return;
    }
    const pdf = [...files].find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdf) return;
    setPdfFile(pdf);
    loadPdf(pdf);
  };

  const pageAnnotations = annotations[currentPage] || [];

  const addAnnotation = (ann) => {
    setAnnotations((prev) => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), { ...ann, id: genId() }] }));
  };
  const updateAnnotation = (id, patch) => {
    setAnnotations((prev) => ({ ...prev, [currentPage]: (prev[currentPage] || []).map((a) => a.id === id ? { ...a, ...patch } : a) }));
  };
  const deleteAnnotation = (id) => {
    setAnnotations((prev) => ({ ...prev, [currentPage]: (prev[currentPage] || []).filter((a) => a.id !== id) }));
    setSelectedId(null);
  };

  const getRelativePos = (e) => {
    const rect = overlayRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleOverlayClick = (e) => {
    if (e.target !== overlayRef.current) return;
    const pos = getRelativePos(e);
    if (activeTool === TOOLS.TEXT) {
      addAnnotation({ type: "text", x: pos.x, y: pos.y, text: "", ...textStyle, editing: true });
      setActiveTool(TOOLS.SELECT);
    } else if (activeTool === TOOLS.SELECT) {
      setSelectedId(null);
    }
  };

  const handleTextClick = (e, item) => {
    e.stopPropagation();
    e.preventDefault();
    const whiteoutAnn = {
      id: genId(),
      type: "whiteout",
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      color: "#ffffff",
    };
    const estFs = Math.max(8, Math.min(72, Math.round(item.h - 4)));
    const textAnn = {
      id: genId(),
      type: "text",
      x: item.x,
      y: item.y,
      fontSize: estFs,
      color: textStyle.color === "#ffffff" ? "#000000" : textStyle.color,
      fontFamily: "Helvetica",
      bold: false,
      italic: false,
      text: item.str,
      editing: true,
    };
    setAnnotations((prev) => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), whiteoutAnn, textAnn],
    }));
    setSelectedId(textAnn.id);
    setActiveTool(TOOLS.SELECT);
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target !== overlayRef.current) return;
    if (activeTool !== TOOLS.HIGHLIGHT && activeTool !== TOOLS.RECTANGLE && activeTool !== TOOLS.WHITEOUT) return;
    const pos = getRelativePos(e);
    setDrawing({ tool: activeTool, startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, w: 0, h: 0 });
    e.preventDefault();
  };
  const handleOverlayMouseMove = (e) => {
    if (!drawing) return;
    const pos = getRelativePos(e);
    const clampedX = Math.max(0, Math.min(pos.x, pageSize.width || 0));
    const clampedY = Math.max(0, Math.min(pos.y, pageSize.height || 0));
    const w = clampedX - drawing.startX;
    const h = clampedY - drawing.startY;
    setDrawing((d) => ({ ...d, x: w < 0 ? clampedX : d.startX, y: h < 0 ? clampedY : d.startY, w: Math.abs(w), h: Math.abs(h) }));
  };
  const handleOverlayMouseUp = () => {
    if (!drawing) return;
    if (drawing.w > 4 && drawing.h > 4) {
      addAnnotation({
        type: drawing.tool === TOOLS.HIGHLIGHT ? "highlight" : drawing.tool === TOOLS.RECTANGLE ? "rectangle" : "whiteout",
        x: drawing.x, y: drawing.y, w: drawing.w, h: drawing.h,
        color: drawing.tool === TOOLS.HIGHLIGHT ? highlightColor : drawing.tool === TOOLS.WHITEOUT ? textStyle.color : textStyle.color,
      });
    }
    setDrawing(null);
  };

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => addAnnotation({ type: "image", x: 60, y: 60, w: 160, h: 120, src: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAnnotationDragStart = (e, ann) => {
    e.stopPropagation();
    setSelectedId(ann.id);
    const startX = e.clientX - ann.x;
    const startY = e.clientY - ann.y;
    const onMove = (me) => updateAnnotation(ann.id, {
      x: Math.max(0, Math.min(me.clientX - startX, pageSize.width - 10)),
      y: Math.max(0, Math.min(me.clientY - startY, pageSize.height - 10)),
    });
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleResizeDragStart = (e, ann) => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX; const startY = e.clientY;
    const startW = ann.w || 100; const startH = ann.h || 40;
    const onMove = (me) => updateAnnotation(ann.id, { w: Math.max(40, startW + me.clientX - startX), h: Math.max(20, startH + me.clientY - startY) });
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleSave = async () => {
    if (!window.PDFLib || !pdfFile) return;
    setView("processing"); setProgress(10);
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const ab = await pdfFile.arrayBuffer();
      setProgress(20);
      const doc = await PDFDocument.load(ab);
      setProgress(30);
      const pages = doc.getPages();
      const fH = await doc.embedFont(StandardFonts.Helvetica);
      const fHB = await doc.embedFont(StandardFonts.HelveticaBold);
      const fHI = await doc.embedFont(StandardFonts.HelveticaOblique);
      const fHBI = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
      const fT = await doc.embedFont(StandardFonts.TimesRoman);
      const fC = await doc.embedFont(StandardFonts.Courier);
      const fontMap = {
        Helvetica: { normal: fH, bold: fHB, italic: fHI, boldItalic: fHBI },
        "Times New Roman": { normal: fT, bold: fT, italic: fT, boldItalic: fT },
        Courier: { normal: fC, bold: fC, italic: fC, boldItalic: fC },
      };
      const hexRgb = (hex) => rgb(parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255);
      const allNums = Object.keys(annotations).map(Number).filter((n) => annotations[n]?.length > 0);
      for (let pi = 0; pi < allNums.length; pi++) {
        const pageNum = allNums[pi];
        const anns = annotations[pageNum] || [];
        const page = pages[pageNum - 1];
        if (!page) continue;
        const { width: pdfW, height: pdfH } = page.getSize();
        const pdfjsPage = await pdfDoc.getPage(pageNum);
        const vp = pdfjsPage.getViewport({ scale });
        const sX = pdfW / vp.width; const sY = pdfH / vp.height;
        for (const ann of anns) {
          if (ann.type === "text" && ann.text) {
            const fKey = ann.bold && ann.italic ? "boldItalic" : ann.bold ? "bold" : ann.italic ? "italic" : "normal";
            const font = (fontMap[ann.fontFamily] || fontMap.Helvetica)[fKey];
            const fs = (ann.fontSize || 18) * sY;
            page.drawText(ann.text, {
              x: Math.max(0, ann.x * sX),
              y: Math.max(0, pdfH - ann.y * sY - fs),
              size: fs,
              font,
              color: hexRgb(ann.color || "#ffffff"),
              maxWidth: pdfW - Math.max(0, ann.x * sX),
              lineHeight: fs * 1.15,
            });
          } else if (ann.type === "highlight") {
            page.drawRectangle({ x: Math.max(0, ann.x*sX), y: Math.max(0, pdfH-ann.y*sY-ann.h*sY), width: ann.w*sX, height: ann.h*sY, color: hexRgb(ann.color || "#fbbf24"), opacity: 0.35 });
          } else if (ann.type === "rectangle") {
            page.drawRectangle({ x: Math.max(0, ann.x*sX), y: Math.max(0, pdfH-ann.y*sY-ann.h*sY), width: ann.w*sX, height: ann.h*sY, borderColor: hexRgb(ann.color || "#3b82f6"), borderWidth: 2*Math.min(sX,sY), color: rgb(0,0,0), opacity: 0, borderOpacity: 1 });
          } else if (ann.type === "whiteout") {
            page.drawRectangle({ x: Math.max(0, ann.x*sX), y: Math.max(0, pdfH-ann.y*sY-ann.h*sY), width: ann.w*sX, height: ann.h*sY, color: hexRgb(ann.color || "#ffffff") });
          } else if (ann.type === "image" && ann.src) {
            try {
              const b64 = ann.src.split(",")[1];
              const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              const img = ann.src.startsWith("data:image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
              page.drawImage(img, { x: Math.max(0, ann.x*sX), y: Math.max(0, pdfH-ann.y*sY-(ann.h||120)*sY), width: (ann.w||160)*sX, height: (ann.h||120)*sY });
            } catch {}
          }
        }
        setProgress(30 + Math.round(70 * (pi + 1) / allNums.length));
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultName(pdfFile.name.replace(/\.pdf$/i, "") + "-edited.pdf");
      setProgress(100);
      await wait(300);
      setView("done");
    } catch (err) {
      console.error("Save failed:", err);
      setModal({ isOpen: true, title: "Save Error", body: `Could not save the edited PDF: ${err.message}` });
      setView("editor");
    }
  };

  const downloadResult = () => {
    if (!resultBlob) return;
    const a = document.createElement("a");
    a.href = resultUrl || URL.createObjectURL(resultBlob);
    a.download = resultName;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const resetEditor = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setPdfFile(null);
    setPdfDoc((prev) => {
      if (prev) prev.destroy();
      return null;
    });
    setTotalPages(0); setCurrentPage(1);
    setAnnotations({}); setSelectedId(null);
    setResultBlob(null); setResultUrl(null); setResultName(""); setProgress(0);
    setView("upload");
  };

  const selectedAnn = pageAnnotations.find((a) => a.id === selectedId) || null;
  const overlayCursor = activeTool === TOOLS.TEXT ? "text" : activeTool === TOOLS.SELECT ? "default" : "crosshair";

  return (
    <>
      {/* Always: hidden file inputs */}
      <input id="editPdfInput" className="sr-only" type="file" accept=".pdf,application/pdf" ref={fileInputRef}
        onChange={(e) => { handleFileSelect([...e.target.files]); e.target.value = ""; }} />
      <input id="editImageInput" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp"
        ref={imageInputRef} onChange={handleImageFile} />

      {/* Site nav — always in DOM but hidden in editor mode via CSS class */}
      {view !== "editor" && (
        <>
          <Header isScrolled={isScrolled} isToolsOpen={isToolsOpen} setIsToolsOpen={setIsToolsOpen}
            handleDropdownItemClick={handleDropdownItemClick} theme={theme} toggleTheme={toggleTheme} />
          <button id="themeToggle" className="theme-toggle" type="button" aria-pressed={theme === "light"} onClick={toggleTheme}>
            <span className="theme-toggle-icon" aria-hidden="true" />
            <span className="theme-toggle-text">{theme === "light" ? "Dark" : "Light"}</span>
          </button>
        </>
      )}

      {/* ══ EDITOR VIEW — fixed fullscreen overlay, hides nav ══════════════ */}
      {view === "editor" && (
        <div className="edit-fullscreen">
          {/* Top bar */}
          <div className="edit-topbar">
            <div className="edit-topbar-left">
              <button className="ghost-btn workspace-back" onClick={resetEditor} title="Back to upload">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <div className="workspace-title-area" style={{ textAlign: "left", marginLeft: "12px" }}>
                <h3 className="workspace-title" title={pdfFile?.name}>
                  {(pdfFile?.name || "").length > 40 ? `${pdfFile.name.slice(0, 37)}…` : pdfFile?.name}
                </h3>
                <p className="workspace-subtitle" style={{ margin: 0 }}>{totalPages} page{totalPages !== 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="edit-topbar-center">
              <button className="ghost-btn zoom-btn" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))}>−</button>
              <span className="zoom-label">{Math.round(scale * 100)}%</span>
              <button className="ghost-btn zoom-btn" onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)))}>+</button>
            </div>

            <div className="edit-topbar-right">
              <button className="ghost-btn" onClick={toggleTheme} title="Toggle theme" style={{ minHeight: "36px", width: "36px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }}>
                {theme === "dark"
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /></svg>}
              </button>
              <button className="workspace-action-btn download-txt" onClick={handleSave} style={{ minHeight: "36px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>

          {/* Body: sidebar + canvas + page list */}
          <div className="edit-body">
            {/* Left sidebar */}
            <div className="edit-sidebar">
              <p className="sidebar-section-label">Tools</p>
              {isMobile && (
                <div style={{
                  background: "rgba(184, 138, 67, 0.08)",
                  border: "1px solid rgba(184, 138, 67, 0.25)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "var(--gold)",
                  lineHeight: "1.45",
                  textAlign: "left"
                }}>
                  📱 <strong>Mobile View:</strong> Advanced precision tools are locked. Switch to an iPad/Desktop for full feature access.
                </div>
              )}
              {[
                { tool: TOOLS.SELECT, label: "Select", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-7 1-3 7z" /></svg> },
                { tool: TOOLS.TEXT, label: "Add Text", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg> },
                { tool: TOOLS.HIGHLIGHT, label: "Highlight", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg> },
                { tool: TOOLS.RECTANGLE, label: "Rectangle", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg> },
                { tool: TOOLS.WHITEOUT, label: "Eraser", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg> },
                { tool: TOOLS.IMAGE, label: "Add Image", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg> },
              ].map(({ tool, label, icon }) => {
                const isLocked = isMobile && (tool === TOOLS.HIGHLIGHT || tool === TOOLS.RECTANGLE || tool === TOOLS.IMAGE);
                return (
                  <button key={tool}
                    className={`sidebar-tool-btn${activeTool === tool ? " active" : ""}`}
                    title={isLocked ? "Requires iPad or Desktop screen" : label}
                    disabled={isLocked}
                    style={isLocked ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                    onClick={() => {
                      if (isLocked) return;
                      if (tool === TOOLS.IMAGE) {
                        imageInputRef.current.click();
                      } else {
                        setActiveTool(tool);
                      }
                    }}>
                    {icon}<span>{label} {isLocked && "🔒"}</span>
                  </button>
                );
              })}

              {activeTool === TOOLS.TEXT && (
                <div className="sidebar-options">
                  <p className="sidebar-section-label" style={{ marginTop: 12 }}>Text Style</p>
                  <label className="sidebar-option-label">Size
                    <input type="number" min="6" max="120" value={textStyle.fontSize} className="sidebar-num-input"
                      onChange={(e) => setTextStyle((s) => ({ ...s, fontSize: +e.target.value }))} />
                  </label>
                  <label className="sidebar-option-label">Color
                    <input type="color" value={textStyle.color} className="sidebar-color-input"
                      onChange={(e) => setTextStyle((s) => ({ ...s, color: e.target.value }))} />
                  </label>
                  <label className="sidebar-option-label">Font
                    <select value={textStyle.fontFamily} className="sidebar-select"
                      onChange={(e) => setTextStyle((s) => ({ ...s, fontFamily: e.target.value }))}>
                      <option>Helvetica</option>
                      <option>Times New Roman</option>
                      <option>Courier</option>
                    </select>
                  </label>
                  <div className="sidebar-toggle-row">
                    <button className={`style-toggle-btn${textStyle.bold ? " active" : ""}`} onClick={() => setTextStyle((s) => ({ ...s, bold: !s.bold }))}>B</button>
                    <button className={`style-toggle-btn italic-btn${textStyle.italic ? " active" : ""}`} onClick={() => setTextStyle((s) => ({ ...s, italic: !s.italic }))}>I</button>
                  </div>
                  <div className="color-swatches">
                    {COLORS.map((c) => (
                      <button key={c} className={`color-swatch${textStyle.color === c ? " selected" : ""}`}
                        style={{ background: c, border: "1px solid rgba(248,244,235,0.15)" }}
                        onClick={() => setTextStyle((s) => ({ ...s, color: c }))} title={c} />
                    ))}
                  </div>
                </div>
              )}

              {activeTool === TOOLS.HIGHLIGHT && (
                <div className="sidebar-options">
                  <p className="sidebar-section-label" style={{ marginTop: 12 }}>Highlight Color</p>
                  <label className="sidebar-option-label">Color
                    <input type="color" value={highlightColor} className="sidebar-color-input"
                      onChange={(e) => setHighlightColor(e.target.value)} />
                  </label>
                  <div className="color-swatches">
                    {["#fbbf24", "#86efac", "#93c5fd", "#f9a8d4", "#c4b5fd", "#fb923c"].map((c) => (
                      <button key={c} className={`color-swatch${highlightColor === c ? " selected" : ""}`}
                        style={{ background: c }} onClick={() => setHighlightColor(c)} />
                    ))}
                  </div>
                </div>
              )}

              {activeTool === TOOLS.RECTANGLE && (
                <div className="sidebar-options">
                  <p className="sidebar-section-label" style={{ marginTop: 12 }}>Border Color</p>
                  <label className="sidebar-option-label">Color
                    <input type="color" value={textStyle.color} className="sidebar-color-input"
                      onChange={(e) => setTextStyle((s) => ({ ...s, color: e.target.value }))} />
                  </label>
                </div>
              )}

              {activeTool === TOOLS.WHITEOUT && (
                <div className="sidebar-options">
                  <p className="sidebar-section-label" style={{ marginTop: 12 }}>Eraser Color</p>
                  <label className="sidebar-option-label">Color
                    <input type="color" value={textStyle.color} className="sidebar-color-input"
                      onChange={(e) => setTextStyle((s) => ({ ...s, color: e.target.value }))} />
                  </label>
                  <div className="color-swatches">
                    {COLORS.map((c) => (
                      <button key={c} className={`color-swatch${textStyle.color === c ? " selected" : ""}`}
                        style={{ background: c, border: "1px solid rgba(248,244,235,0.15)" }}
                        onClick={() => setTextStyle((s) => ({ ...s, color: c }))} title={c} />
                    ))}
                  </div>
                </div>
              )}

              {selectedAnn && (
                <div className="sidebar-options" style={{ marginTop: 16 }}>
                  <p className="sidebar-section-label">Selected</p>
                  {selectedAnn.type === "text" && (
                    <>
                      <label className="sidebar-option-label">Size
                        <input type="number" min="6" max="120" value={selectedAnn.fontSize || 18} className="sidebar-num-input"
                          onChange={(e) => updateAnnotation(selectedAnn.id, { fontSize: +e.target.value })} />
                      </label>
                      <label className="sidebar-option-label">Color
                        <input type="color" value={selectedAnn.color || "#ffffff"} className="sidebar-color-input"
                          onChange={(e) => updateAnnotation(selectedAnn.id, { color: e.target.value })} />
                      </label>
                    </>
                  )}
                  {(selectedAnn.type === "whiteout" || selectedAnn.type === "highlight" || selectedAnn.type === "rectangle") && (
                    <label className="sidebar-option-label">Color
                      <input type="color" value={selectedAnn.color || "#ffffff"} className="sidebar-color-input"
                        onChange={(e) => updateAnnotation(selectedAnn.id, { color: e.target.value })} />
                    </label>
                  )}
                  <button className="ghost-btn delete-ann-btn" onClick={() => deleteAnnotation(selectedAnn.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Canvas scroll */}
            <div className="edit-canvas-scroll">
              <div style={{ position: "relative", display: "inline-block", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", borderRadius: 4, flexShrink: 0 }}>
                {pageRendering && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(13,18,27,0.5)", zIndex: 20, borderRadius: 4 }}>
                    <div className="process-icon" style={{ transform: "scale(0.55)" }}><span /><span /></div>
                  </div>
                )}
                <canvas ref={canvasRef} style={{ display: "block", borderRadius: 4 }} />
                <div
                  ref={overlayRef}
                  style={{
                    position: "absolute", top: 0, left: 0,
                    width: pageSize.width || "100%",
                    height: pageSize.height || "100%",
                    cursor: overlayCursor,
                    zIndex: 10,
                  }}
                  onClick={handleOverlayClick}
                  onMouseDown={handleOverlayMouseDown}
                  onMouseMove={handleOverlayMouseMove}
                  onMouseUp={handleOverlayMouseUp}
                >
                  {pageAnnotations.map((ann) => (
                    <AnnotationNode key={ann.id} ann={ann} selected={selectedId === ann.id}
                      onSelect={() => setSelectedId(ann.id)}
                      onUpdate={(patch) => updateAnnotation(ann.id, patch)}
                      onDelete={() => deleteAnnotation(ann.id)}
                      onDragStart={(e) => handleAnnotationDragStart(e, ann)}
                      onResizeDragStart={(e) => handleResizeDragStart(e, ann)} />
                  ))}
                  {(activeTool === TOOLS.TEXT || activeTool === TOOLS.SELECT) && pageTextItems.map((item, idx) => (
                    <div
                      key={`text-item-${idx}`}
                      style={{
                        position: "absolute",
                        left: item.x,
                        top: item.y,
                        width: item.w,
                        height: item.h,
                        cursor: "text",
                        border: "1px dashed transparent",
                        borderRadius: "2px",
                        zIndex: 8,
                        transition: "all 0.15s ease-in-out",
                      }}
                      className="pdf-text-hover-item"
                      title="Click to edit or erase this text"
                      onClick={(e) => handleTextClick(e, item)}
                    />
                  ))}
                  {drawing && (
                    <div style={{
                      position: "absolute", left: drawing.x, top: drawing.y, width: drawing.w, height: drawing.h,
                      background: drawing.tool === TOOLS.HIGHLIGHT ? highlightColor + "55" : drawing.tool === TOOLS.WHITEOUT ? textStyle.color : "transparent",
                      border: drawing.tool === TOOLS.RECTANGLE ? `2px dashed ${textStyle.color}` : drawing.tool === TOOLS.WHITEOUT ? `1px dashed ${textStyle.color}` : "none",
                      pointerEvents: "none",
                    }} />
                  )}
                </div>
              </div>
            </div>

            {/* Right page list */}
            <div className="edit-pages-sidebar">
              <p className="sidebar-section-label">Pages</p>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p}
                  className={`page-thumb-btn${currentPage === p ? " active" : ""}${annotations[p]?.length ? " has-edits" : ""}`}
                  onClick={() => setCurrentPage(p)}>
                  <span className="page-thumb-num">{p}</span>
                  {annotations[p]?.length > 0 && <span className="page-edit-dot" />}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom page navigation */}
          <div className="edit-page-nav">
            <button className="ghost-btn" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>← Prev</button>
            <span className="page-nav-label">Page {currentPage} of {totalPages}</span>
            <button className="ghost-btn" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next →</button>
          </div>
        </div>
      )}

      {/* ══ NON-EDITOR VIEWS (upload / processing / done) ══════════════════ */}
      <main id="editPdf" className="landing view active" style={{ display: view === "editor" ? "none" : undefined }}>
        {/* Upload */}
        {view === "upload" && (
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
              <h1>Edit PDF <span className="beta-badge">Beta</span></h1>
              <p className="hero-copy">Add text, highlights, shapes, and images to any PDF page — all processed 100% locally in your browser.</p>
            </div>

            <div id="editDropzone" className={`dropzone${isDragOver ? " dragover" : ""}`}
              tabIndex="0" role="button" aria-label="Choose a PDF file to edit"
              onClick={() => fileInputRef.current.click()}
              onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect([...e.dataTransfer.files]); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current.click(); }}>
              <div className="dropzone-inner">
                <div className="dropzone-cards" aria-hidden="true">
                  <div className="pdf-card-shadow card-left" />
                  <div className="pdf-card-shadow card-right" />
                  <div className="pdf-card-front">PDF</div>
                </div>
                <button id="editChooseBtn" className="choose-btn-gold" type="button">
                  <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Choose PDF file
                </button>
                <p className="dropzone-text">or drag and drop PDF here</p>
                <div className="dropzone-security">
                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Files are processed locally. Your data stays private.</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === "upload" && (
          <section className="features-section">
            <div className="section-header">
              <p className="eyebrow-small">Built for</p>
              <h2>Polished PDF Editing</h2>
            </div>
            <div className="features-grid">
              {[
                {
                  icon: (
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7" />
                      <line x1="9" y1="20" x2="15" y2="20" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  ),
                  title: "Add Text",
                  desc: "Place text anywhere on any PDF page with full font, size, and color control."
                },
                {
                  icon: (
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                  ),
                  title: "Highlight & Shapes",
                  desc: "Draw highlight rectangles and shape overlays to annotate important sections."
                },
                {
                  icon: (
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  ),
                  title: "Insert Images",
                  desc: "Embed PNG or JPEG images directly into your PDF pages at any position."
                },
                {
                  icon: (
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ),
                  title: "100% Private",
                  desc: "Everything runs in your browser. No files are ever uploaded to any server."
                },
                {
                  icon: (
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  ),
                  title: "Lossless Export",
                  desc: "All original PDF content is fully preserved when writing your edits back."
                },
                {
                  icon: (
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  ),
                  title: "Instant Results",
                  desc: "No waiting, no queues — edits are applied and downloaded in seconds."
                },
              ].map((f) => (
                <div className="feature-card" key={f.title}>
                  <div className="feature-icon-wrapper">
                    {f.icon}
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )
      }

        {/* Processing */}
        {view === "processing" && (
          <section className="hero">
            <div className="hero-content" />
            <div className="compress-card" style={{ textAlign: "center", maxWidth: "420px", width: "100%", margin: "0 auto" }}>
              <div className="process-icon" aria-hidden="true" style={{ margin: "0 auto 24px" }}><span /><span /></div>
              <h2 style={{ margin: "0 0 8px" }}>Saving Edited PDF</h2>
              <div className="progress" style={{ margin: "24px 0 16px" }}>
                <i style={{ width: `${progress}%`, transition: "width 0.3s ease" }} />
              </div>
              <p style={{ margin: 0, color: "var(--subtle)" }}>Writing your edits into the PDF locally… {progress}%</p>
            </div>
          </section>
        )}

        {/* Done */}
        {view === "done" && (
          <section className="hero">
            <div className="hero-content">
              <Link className="ghost-btn-back" href="/">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Tools
              </Link>
              <h1>PDF Edited</h1>
            </div>
            <div className="compress-card" style={{ maxWidth: "520px", width: "100%", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                <div style={{ background: "rgba(184,138,67,0.12)", color: "var(--gold)", width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 34, height: 34 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <h3 style={{ textAlign: "center", margin: "0 0 8px" }}>
                {resultName.length > 36 ? `${resultName.slice(0, 33)}…` : resultName}
              </h3>
              <p style={{ textAlign: "center", color: "var(--subtle)", margin: "0 0 24px" }}>
                {resultBlob ? `${(resultBlob.size / 1024).toFixed(1)} KB — ready to download` : ""}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="wide-btn" onClick={downloadResult} style={{ flex: 1, minHeight: 50, marginTop: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, display: "inline", marginRight: 8 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
                <button className="ghost-btn" onClick={resetEditor} style={{ flex: 1, minHeight: 50 }}>Edit Another</button>
              </div>
            </div>
          </section>
        )}
      </main>

      {view !== "editor" && <Footer />}

      <InfoModal isOpen={modal.isOpen} title={modal.title} body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })} />
    </>
  );
}

// ─── Annotation Node ──────────────────────────────────────────────────────────
function AnnotationNode({ ann, selected, onSelect, onUpdate, onDelete, onDragStart, onResizeDragStart }) {
  const [editingText, setEditingText] = useState(ann.editing || false);
  const taRef = useRef(null);

  useEffect(() => {
    if (editingText && taRef.current) {
      taRef.current.focus();
    }
  }, [editingText]);

  const selStyle = selected ? { outline: "2px solid #b88a43", outlineOffset: "2px" } : {};

  if (ann.type === "text") {
    return (
      <div
        style={{ position: "absolute", left: ann.x, top: ann.y, minWidth: 40, cursor: "move", userSelect: "none", zIndex: 10, ...selStyle, borderRadius: 3 }}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(); onDragStart(e); }}
        onDoubleClick={(e) => { e.stopPropagation(); setEditingText(true); }}
      >
        {editingText ? (
          <textarea ref={taRef}
            value={ann.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onBlur={() => { setEditingText(false); if (!ann.text.trim()) onDelete(); }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "2px solid #b88a43",
              borderRadius: 4,
              color: ann.color || "#ffffff",
              fontSize: ann.fontSize || 18,
              fontFamily: "sans-serif",
              fontWeight: ann.bold ? "bold" : "normal",
              fontStyle: ann.italic ? "italic" : "normal",
              padding: "4px 8px",
              minWidth: 120,
              minHeight: 44,
              resize: "both",
              outline: "none",
              lineHeight: 1.4,
            }}
            rows={2}
          />
        ) : (
          <span style={{
            display: "block",
            color: ann.color || "#ffffff",
            fontSize: ann.fontSize || 18,
            fontFamily: "sans-serif",
            fontWeight: ann.bold ? "bold" : "normal",
            fontStyle: ann.italic ? "italic" : "normal",
            whiteSpace: "pre-wrap",
            padding: "4px 8px",
            lineHeight: 1.4,
            cursor: "move",
            textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)",
          }}>
            {ann.text || <span style={{ opacity: 0.5, fontStyle: "italic", fontSize: "0.75em", color: "#b88a43" }}>Double-click to type</span>}
          </span>
        )}
      </div>
    );
  }

  if (ann.type === "highlight" || ann.type === "rectangle") {
    const isH = ann.type === "highlight";
    return (
      <div
        style={{
          position: "absolute", left: ann.x, top: ann.y, width: ann.w, height: ann.h, zIndex: 10,
          background: isH ? (ann.color || "#fbbf24") + "55" : "transparent",
          border: isH ? "none" : `2px solid ${ann.color || "#3b82f6"}`,
          cursor: "move", boxSizing: "border-box", ...selStyle, borderRadius: isH ? 2 : 3,
        }}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(); onDragStart(e); }}
      >
        {selected && (
          <div
            style={{ position: "absolute", right: -6, bottom: -6, width: 12, height: 12, background: "#b88a43", borderRadius: "50%", cursor: "se-resize", zIndex: 20 }}
            onMouseDown={(e) => { e.stopPropagation(); onResizeDragStart(e); }}
          />
        )}
      </div>
    );
  }

  if (ann.type === "whiteout") {
    return (
      <div
        style={{
          position: "absolute", left: ann.x, top: ann.y, width: ann.w, height: ann.h, zIndex: 9,
          background: ann.color || "#ffffff",
          border: selected ? "1px dashed #b88a43" : "none",
          cursor: "move", boxSizing: "border-box", ...selStyle,
        }}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(); onDragStart(e); }}
      >
        {selected && (
          <div
            style={{ position: "absolute", right: -6, bottom: -6, width: 12, height: 12, background: "#b88a43", borderRadius: "50%", cursor: "se-resize", zIndex: 20 }}
            onMouseDown={(e) => { e.stopPropagation(); onResizeDragStart(e); }}
          />
        )}
      </div>
    );
  }

  if (ann.type === "image" && ann.src) {
    return (
      <div
        style={{ position: "absolute", left: ann.x, top: ann.y, width: ann.w || 160, height: ann.h || 120, cursor: "move", ...selStyle, borderRadius: 4, overflow: "hidden", zIndex: 10 }}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(); onDragStart(e); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ann.src} alt="annotation" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
        {selected && (
          <div
            style={{ position: "absolute", right: -6, bottom: -6, width: 12, height: 12, background: "#b88a43", borderRadius: "50%", cursor: "se-resize", zIndex: 20 }}
            onMouseDown={(e) => { e.stopPropagation(); onResizeDragStart(e); }}
          />
        )}
      </div>
    );
  }

  return null;
}

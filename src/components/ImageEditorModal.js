import React, { useState, useEffect, useRef } from "react";

// Convert base64 data URL to Blob client-side
const base64ToBlob = (base64, mimeType) => {
  const parts = base64.split(",");
  if (parts.length < 2) return null;
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
};

export default function ImageEditorModal({ isOpen, images, onSave, onClose }) {
  const [editorImages, setEditorImages] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeTool, setActiveTool] = useState("brush"); // "brush" | "crop" | "none"
  const [brushColor, setBrushColor] = useState("#ffffff"); // default white (eraser/whiteout)
  const [brushSize, setBrushSize] = useState(16);

  // Active Image history state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drawing states
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Cropping states
  const [cropStart, setCropStart] = useState(null);
  const [cropBox, setCropBox] = useState(null); // { x, y, width, height } in canvas coords
  const [cropVisualBox, setCropVisualBox] = useState(null); // { x, y, width, height } in display coords
  const containerRef = useRef(null);

  // Zooming and Fitting states
  const [zoom, setZoom] = useState(1.0);
  const [baseWidth, setBaseWidth] = useState(0);
  const [baseHeight, setBaseHeight] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize editor images
  useEffect(() => {
    if (isOpen && images && images.length > 0) {
      setEditorImages(
        images.map((img) => ({
          ...img,
          history: img.history || [img.url],
          historyIndex: img.historyIndex || 0,
        }))
      );
      setActiveIndex(0);
      setActiveTool("brush");
      setBrushColor("#ffffff");
      setBrushSize(16);
      setZoom(1.0);
    }
  }, [isOpen, images]);

  // Sync active history
  useEffect(() => {
    if (editorImages.length > 0 && activeIndex >= 0) {
      const activeImg = editorImages[activeIndex];
      setHistory(activeImg.history);
      setHistoryIndex(activeImg.historyIndex);
      setCropBox(null);
      setCropVisualBox(null);
      setZoom(1.0); // Reset zoom to 100% when changing pages
    }
  }, [activeIndex, editorImages]);

  const recalculateBaseSize = () => {
    const canvas = canvasRef.current;
    const workspace = containerRef.current;
    if (!canvas || !workspace) return;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    if (!imgWidth || !imgHeight) return;

    const rect = workspace.getBoundingClientRect();
    const padding = 48; // 24px padding on both sides
    const availableW = Math.max(200, rect.width - padding);
    const availableH = Math.max(200, rect.height - padding);

    const scaleX = availableW / imgWidth;
    const scaleY = availableH / imgHeight;
    const fitScale = Math.min(scaleX, scaleY);

    setBaseWidth(imgWidth * fitScale);
    setBaseHeight(imgHeight * fitScale);
  };

  // Load and draw image when history index changes
  useEffect(() => {
    if (history.length > 0 && historyIndex >= 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        recalculateBaseSize();
      };
      img.src = history[historyIndex];
    }
  }, [history, historyIndex]);

  // Recalculate size on window resize
  useEffect(() => {
    window.addEventListener("resize", recalculateBaseSize);
    return () => window.removeEventListener("resize", recalculateBaseSize);
  }, [history, historyIndex]);

  const saveActiveImageToEditorImages = (newHistory, newIndex) => {
    setEditorImages((prev) =>
      prev.map((img, idx) => {
        if (idx === activeIndex) {
          return {
            ...img,
            url: newHistory[newIndex],
            history: newHistory,
            historyIndex: newIndex,
          };
        }
        return img;
      })
    );
  };

  const pushHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const nextHistory = history.slice(0, historyIndex + 1);
    const newHistory = [...nextHistory, dataUrl];
    const newIndex = nextHistory.length;

    setHistory(newHistory);
    setHistoryIndex(newIndex);
    saveActiveImageToEditorImages(newHistory, newIndex);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      saveActiveImageToEditorImages(history, newIndex);
      setCropBox(null);
      setCropVisualBox(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      saveActiveImageToEditorImages(history, newIndex);
      setCropBox(null);
      setCropVisualBox(null);
    }
  };

  const handleReset = () => {
    if (historyIndex > 0) {
      const newIndex = 0;
      setHistoryIndex(newIndex);
      saveActiveImageToEditorImages(history, newIndex);
      setCropBox(null);
      setCropVisualBox(null);
    }
  };

  const handleRotate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Copy current state
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(canvas, 0, 0);

    // Swap bounds
    canvas.width = tempCanvas.height;
    canvas.height = tempCanvas.width;

    // Draw rotated 90 deg clockwise
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);

    pushHistoryState();
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(x, canvas.width)),
      y: Math.max(0, Math.min(y, canvas.height)),
    };
  };

  const updateCropVisualBox = (box) => {
    const canvas = canvasRef.current;
    if (!canvas || !box || !baseWidth || !baseHeight) return;
    const displayW = baseWidth * zoom;
    const displayH = baseHeight * zoom;

    setCropVisualBox({
      left: (box.x / canvas.width) * displayW,
      top: (box.y / canvas.height) * displayH,
      width: (box.width / canvas.width) * displayW,
      height: (box.height / canvas.height) * displayH,
    });
  };

  // Sync crop visual box when zoom or base sizes change
  useEffect(() => {
    if (cropBox) {
      updateCropVisualBox(cropBox);
    } else {
      setCropVisualBox(null);
    }
  }, [cropBox, zoom, baseWidth, baseHeight]);

  // Drawing mouse handlers
  const handlePointerDown = (e) => {
    const coords = getCanvasCoords(e);

    if (activeTool === "brush") {
      isDrawingRef.current = true;
      lastPosRef.current = coords;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Draw a dot right away
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (activeTool === "crop") {
      isDrawingRef.current = true;
      setCropStart(coords);
      setCropBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
      updateCropVisualBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);

    if (activeTool === "brush") {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastPosRef.current = coords;
    } else if (activeTool === "crop" && cropStart) {
      const box = {
        x: Math.min(cropStart.x, coords.x),
        y: Math.min(cropStart.y, coords.y),
        width: Math.abs(cropStart.x - coords.x),
        height: Math.abs(cropStart.y - coords.y),
      };
      setCropBox(box);
      updateCropVisualBox(box);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activeTool === "brush") {
      pushHistoryState();
    }
  };

  const handleApplyCrop = () => {
    if (!cropBox || cropBox.width < 5 || cropBox.height < 5) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropBox.width;
    tempCanvas.height = cropBox.height;
    const tempCtx = tempCanvas.getContext("2d");

    // Copy selected bounding box region
    tempCtx.drawImage(
      canvas,
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height,
      0,
      0,
      cropBox.width,
      cropBox.height
    );

    // Swap canvas dimensions
    canvas.width = cropBox.width;
    canvas.height = cropBox.height;
    ctx.drawImage(tempCanvas, 0, 0);

    setCropBox(null);
    setCropVisualBox(null);
    pushHistoryState();
  };

  const handleSaveAll = () => {
    const finalImages = editorImages.map((img) => {
      // If image has edits, generate its final Blob
      if (img.historyIndex > 0) {
        const mimeType = img.blob.type;
        const dataUrl = img.history[img.historyIndex];
        const newBlob = base64ToBlob(dataUrl, mimeType);
        return {
          ...img,
          blob: newBlob,
          url: URL.createObjectURL(newBlob),
        };
      }
      return img;
    });

    onSave(finalImages);
  };

  if (!isOpen) return null;

  return (
    <div className="image-editor-modal" role="dialog" aria-modal="true">
      <div className="editor-backdrop" onClick={onClose} />

      <div className="editor-window">
        {/* Editor Header */}
        <div className="editor-header">
          <div className="editor-title-block">
            <h3>Edit Converted Page</h3>
            <span className="editor-page-badge">
              Page {activeIndex + 1} of {editorImages.length}
            </span>
          </div>
          <div className="editor-header-ctas">
            <button className="editor-header-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="editor-header-btn primary" onClick={handleSaveAll}>
              Apply & Save
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="editor-body">
          {/* Toolbar */}
          <div className="editor-toolbar">
            {isMobile && (
              <div style={{
                background: "rgba(184, 138, 67, 0.12)",
                border: "1px solid rgba(184, 138, 67, 0.25)",
                borderRadius: "6px",
                padding: "8px",
                margin: "0 0 14px 0",
                fontSize: "11px",
                color: "var(--gold)",
                lineHeight: "1.35",
                textAlign: "left"
              }}>
                📱 <strong>Crop Limited:</strong> Cropping is disabled on mobile view. Switch to an iPad or Desktop for full image editing.
              </div>
            )}
            <div className="toolbar-section">
              <p className="toolbar-label">EDIT MODE</p>

              <button
                className={`toolbar-btn${activeTool === "brush" ? " active" : ""}`}
                onClick={() => {
                  setActiveTool("brush");
                  setCropBox(null);
                  setCropVisualBox(null);
                }}
                title="Redact / Draw brush"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 9 10 20 4 20 4 14 15 3" />
                </svg>
                Brush Draw
              </button>

              <button
                className={`toolbar-btn${activeTool === "crop" ? " active" : ""}`}
                onClick={() => {
                  if (!isMobile) setActiveTool("crop");
                }}
                disabled={isMobile}
                title={isMobile ? "Cropping requires iPad or Desktop screens" : "Crop image area"}
                style={isMobile ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                  <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
                  <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
                </svg>
                Crop Area {isMobile && "🔒"}
              </button>
            </div>

            {activeTool === "brush" && (
              <div className="toolbar-section">
                <p className="toolbar-label">BRUSH SIZE ({brushSize}px)</p>
                <input
                  type="range"
                  min="4"
                  max="60"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="brush-slider"
                />

                <p className="toolbar-label" style={{ marginTop: 14 }}>BRUSH COLOR</p>
                <div className="color-palette">
                  {[
                    { hex: "#ffffff", label: "White / Erase" },
                    { hex: "#101624", label: "Black" },
                    { hex: "#ef4444", label: "Red" },
                    { hex: "#e5c07b", label: "Gold" },
                    { hex: "#3b82f6", label: "Blue" }
                  ].map((color) => (
                    <button
                      key={color.hex}
                      className={`color-pill${brushColor === color.hex ? " active" : ""}`}
                      style={{ background: color.hex, border: color.hex === "#ffffff" ? "1px solid rgba(248, 244, 235, 0.4)" : "none" }}
                      onClick={() => setBrushColor(color.hex)}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTool === "crop" && cropBox && cropBox.width > 5 && (
              <div className="toolbar-section animate-fade-in">
                <button className="toolbar-btn apply-crop" onClick={handleApplyCrop}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Cut Crop
                </button>
              </div>
            )}

            <div className="toolbar-section" style={{ marginTop: "auto" }}>
              <p className="toolbar-label">ZOOM ({Math.round(zoom * 100)}%)</p>
              <div className="undo-redo-row">
                <button
                  className="toolbar-btn secondary small"
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
                  disabled={zoom <= 0.5}
                  title="Zoom Out"
                  style={{ display: "flex", justifyContent: "center", padding: "6px" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  className="toolbar-btn secondary small"
                  onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.25))}
                  disabled={zoom >= 3.0}
                  title="Zoom In"
                  style={{ display: "flex", justifyContent: "center", padding: "6px" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
              <button
                className="toolbar-btn secondary small"
                onClick={() => setZoom(1.0)}
                disabled={zoom === 1.0}
                style={{ justifyContent: "center", fontSize: "11px", padding: "4px" }}
              >
                Fit Screen
              </button>

              <p className="toolbar-label" style={{ marginTop: 12 }}>TRANSFORMS</p>

              <button className="toolbar-btn secondary" onClick={handleRotate} title="Rotate 90 degrees">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                Rotate 90°
              </button>

              <div className="undo-redo-row">
                <button
                  className="toolbar-btn secondary small"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo last change"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                    <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                  Undo
                </button>
                <button
                  className="toolbar-btn secondary small"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo undone change"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                    <path d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                  </svg>
                  Redo
                </button>
              </div>

              <button
                className="toolbar-btn secondary danger"
                onClick={handleReset}
                disabled={historyIndex <= 0}
                title="Reset edits to converted original"
                style={{ marginTop: 8 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Reset Page
              </button>
            </div>
          </div>

          {/* Canvas Workspace */}
          <div className="editor-workspace" ref={containerRef} style={{ overflow: "auto" }}>
            <div
              className="canvas-container"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{
                width: baseWidth ? baseWidth * zoom : "auto",
                height: baseHeight ? baseHeight * zoom : "auto",
                maxWidth: "none",
                maxHeight: "none",
                margin: "auto", // Center inside scrollable container
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "none",
                  maxHeight: "none",
                  display: "block",
                  objectFit: "contain",
                }}
              />

              {/* Crop selection overlay visual box */}
              {activeTool === "crop" && cropVisualBox && (
                <div
                  className="crop-marquee"
                  style={{
                    left: cropVisualBox.left,
                    top: cropVisualBox.top,
                    width: cropVisualBox.width,
                    height: cropVisualBox.height,
                  }}
                >
                  {cropVisualBox.width > 30 && cropVisualBox.height > 30 && (
                    <button className="crop-apply-bubble" onClick={handleApplyCrop} title="Crop image">
                      ✓ Crop
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnail Panel */}
        {editorImages.length > 1 && (
          <div className="editor-footer-strip">
            <div className="strip-container">
              {editorImages.map((img, idx) => (
                <button
                  key={img.pageNum}
                  className={`strip-item${idx === activeIndex ? " active" : ""}`}
                  onClick={() => setActiveIndex(idx)}
                >
                  <img src={img.url} alt={`Page ${idx + 1}`} />
                  <span className="strip-label">{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

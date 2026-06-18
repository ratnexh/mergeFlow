import React, { useEffect, useRef, useState } from "react";

function ThumbnailCanvas({ pdfDoc, pageNumber }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!pdfDoc) return;

    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!active) return;

        // Scale tiny for the thumbnail slider
        const viewport = page.getViewport({ scale: 0.15 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        };

        await page.render(renderContext).promise;
      } catch (e) {
        console.error("Failed to render thumbnail page " + pageNumber, e);
      }
    };

    renderThumbnail();

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNumber]);

  return <canvas ref={canvasRef} />;
}

export default function PreviewPanel({
  url,
  title,
  pages,
  pageIndex,
  target,
  onClose,
  mobileActive,
}) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("Select a PDF to view it here.");
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);

  const isSplitPage = Number.isInteger(pageIndex);

  // Load PDF when URL changes
  useEffect(() => {
    let active = true;
    setPdfDoc(null);
    setCurrentPage(isSplitPage ? pageIndex + 1 : 1);

    if (!url) {
      setStatus("Select a PDF to view it here.");
      return;
    }

    if (!window.pdfjsLib) {
      setStatus("Preview renderer could not load. Download still works.");
      return;
    }

    setStatus("Loading preview...");

    const loadDoc = async () => {
      try {
        const loadingTask = window.pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(doc);
        setStatus("");
      } catch (err) {
        console.error("Failed to load PDF:", err);
        if (active) {
          setStatus("This PDF cannot be previewed here, but download still works.");
        }
      }
    };

    loadDoc();

    return () => {
      active = false;
    };
  }, [url, pageIndex, isSplitPage]);

  // Adjust page index when pageIndex changes on card selection
  useEffect(() => {
    if (isSplitPage) {
      setCurrentPage(pageIndex + 1);
    }
  }, [pageIndex, isSplitPage]);

  // Render main page when page index or zoom changes
  useEffect(() => {
    let active = true;
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    if (!pdfDoc) return;

    const renderMainPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (!active) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(260, container.clientWidth - 32);
        
        // Apply zoom scale
        const zoomScale = zoom / 100;
        const scale = Math.min(2.0, (availableWidth / baseViewport.width) * zoomScale);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        };

        await page.render(renderContext).promise;
        if (!active) return;

        container.appendChild(canvas);
      } catch (err) {
        console.error("Failed to render main page:", err);
      }
    };

    renderMainPage();

    return () => {
      active = false;
    };
  }, [pdfDoc, currentPage, zoom]);

  const totalPages = isSplitPage ? 1 : (pdfDoc ? pdfDoc.numPages : 0);

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(200, prev + 25));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(50, prev - 25));
  };

  if (target === "simple") {
    return (
      <div className="simple-preview" style={{ width: "100%" }}>
        {status && <div className="render-note">{status}</div>}
        <div 
          ref={containerRef} 
          className="pdf-canvas-viewer active" 
          style={{ 
            height: "auto", 
            overflow: "visible", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "12px",
            background: "transparent",
            border: "none",
            padding: 0,
            minHeight: "auto",
            boxShadow: "none"
          }}
        ></div>
      </div>
    );
  }

  if (target === "result") {
    return (
      <div className="result-preview active">
        {status && <div className="render-note">{status}</div>}
        <div ref={containerRef} className="pdf-canvas-viewer active"></div>
      </div>
    );
  }

  return (
    <aside
      id="previewPanel"
      className={`preview-panel${mobileActive ? " mobile-active" : ""}`}
    >
      <div className="preview-head-new">
        <div className="preview-head-left">
          <span className="preview-label">PREVIEW</span>
          <h3 className="preview-title" title={title || "No PDF selected"}>
            {title
              ? title.length > 28
                ? `${title.slice(0, 25)}...`
                : title
              : "No PDF selected"}
          </h3>
        </div>
        <div className="preview-head-right">
          <span className="page-count-badge">
            {totalPages} {totalPages === 1 ? "page" : "pages"}
          </span>
          <button
            id="closePreviewBtn"
            className="close-preview-btn-new"
            type="button"
            aria-label="Close preview"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
      </div>

      <div className="preview-controls-bar">
        <div className="page-nav">
          <button className="nav-btn" onClick={prevPage} disabled={currentPage <= 1 || isSplitPage}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="nav-svg">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="page-indicator">
            <span className="page-num-box">{currentPage}</span>
            <span className="page-divider-slash">/ {totalPages || 1}</span>
          </div>
          <button className="nav-btn" onClick={nextPage} disabled={currentPage >= totalPages || isSplitPage}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="nav-svg">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomOut} disabled={zoom <= 50}>-</button>
          <div className="zoom-select-wrapper">
            <select
              className="zoom-select"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={50}>50%</option>
              <option value={75}>75%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
            </select>
            <span className="zoom-select-arrow" aria-hidden="true">▾</span>
          </div>
          <button className="zoom-btn" onClick={zoomIn} disabled={zoom >= 200}>+</button>
        </div>
      </div>

      <div className="preview-body">
        {status && <div className="preview-empty">{status}</div>}
        <div ref={containerRef} className="pdf-canvas-viewer active"></div>
      </div>

      {/* Page Strip */}
      {totalPages > 1 && !isSplitPage && (
        <div className="preview-thumbnail-strip">
          {Array.from({ length: totalPages }, (_, i) => {
            const pageNum = i + 1;
            return (
              <div 
                key={pageNum} 
                className={`thumbnail-card${pageNum === currentPage ? " active" : ""}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                <div className="thumbnail-wrapper">
                  <ThumbnailCanvas pdfDoc={pdfDoc} pageNumber={pageNum} />
                </div>
                <span className="thumbnail-num">{pageNum}</span>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

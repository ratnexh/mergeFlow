import React, { useEffect, useRef, useState } from "react";

function isCancelledError(err) {
  const name = err?.name || "";
  const msg = String(err?.message || err || "");
  return (
    name === "RenderingCancelledException" ||
    msg.includes("Rendering cancelled") ||
    msg.includes("Worker was destroyed") ||
    msg.includes("Transport destroyed")
  );
}

function ThumbnailCanvas({ pdfDoc, pageNumber }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!pdfDoc) return;

    const renderThumbnail = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
            await renderTaskRef.current.promise;
          } catch {
            // Expected cancellation
          }
          renderTaskRef.current = null;
        }
        if (!active) return;

        const page = await pdfDoc.getPage(pageNumber);
        if (!active) return;

        const viewport = page.getViewport({ scale: 0.15 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderContext = {
          canvasContext: context,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
        if (renderTaskRef.current === task) {
          renderTaskRef.current = null;
        }
      } catch (e) {
        if (!active || isCancelledError(e)) return;
        console.error("Failed to render thumbnail page " + pageNumber, e);
      }
    };

    renderThumbnail();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancel cleanup errors
        }
      }
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
  const mainRenderTaskRef = useRef(null);

  const isSplitPage = Number.isInteger(pageIndex);
  const pageStateKey = `${url || ""}::${isSplitPage ? pageIndex : "doc"}`;

  // Derive loading/document status cleanly per URL without cascading setState-in-effect
  const [docState, setDocState] = useState({ forUrl: null, doc: null, error: null });
  const [pageState, setPageState] = useState({ key: pageStateKey, page: isSplitPage ? pageIndex + 1 : 1 });
  const [zoom, setZoom] = useState(100);

  const pdfDoc = docState.forUrl === url ? docState.doc : null;
  const currentPage = isSplitPage
    ? pageIndex + 1
    : pageState.key === pageStateKey
      ? pageState.page
      : 1;

  const setCurrentPage = (nextOrUpdater) => {
    setPageState((prev) => {
      const basePage = prev.key === pageStateKey ? prev.page : 1;
      const nextVal = typeof nextOrUpdater === "function" ? nextOrUpdater(basePage) : nextOrUpdater;
      return { key: pageStateKey, page: nextVal };
    });
  };

  let status = "";
  if (!url) {
    status = "Select a PDF to view it here.";
  } else if (!window.pdfjsLib) {
    status = "Preview renderer could not load. Download still works.";
  } else if (docState.forUrl !== url) {
    status = "Loading preview...";
  } else if (docState.error) {
    status = docState.error;
  }

  // Load PDF document when URL changes
  useEffect(() => {
    if (!url || !window.pdfjsLib) return;

    let active = true;
    let loadingTask = null;
    let loadedDoc = null;

    const loadDoc = async () => {
      try {
        loadingTask = window.pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;
        loadedDoc = doc;
        if (!active) {
          doc.destroy();
          return;
        }
        setDocState({ forUrl: url, doc, error: null });
      } catch (err) {
        if (!active || isCancelledError(err)) return;
        console.error("Failed to load PDF:", err);
        setDocState({
          forUrl: url,
          doc: null,
          error: "This PDF cannot be previewed here, but download still works.",
        });
      }
    };

    loadDoc();

    return () => {
      active = false;
      if (loadingTask && typeof loadingTask.destroy === "function" && !loadedDoc) {
        try {
          loadingTask.destroy();
        } catch {
          // Ignore abort cleanup
        }
      }
      if (loadedDoc) {
        try {
          loadedDoc.destroy();
        } catch {
          // Ignore destroy cleanup
        }
      }
    };
  }, [url]);

  // Render main page when pdfDoc, currentPage, or zoom changes
  useEffect(() => {
    let active = true;
    let currentTask = null;
    const container = containerRef.current;
    if (!container) return;

    if (!pdfDoc) {
      container.innerHTML = "";
      return;
    }

    const renderMainPage = async () => {
      try {
        if (mainRenderTaskRef.current) {
          try {
            mainRenderTaskRef.current.cancel();
            await mainRenderTaskRef.current.promise;
          } catch {
            // Expected cancellation of previous render
          }
          mainRenderTaskRef.current = null;
        }
        if (!active) return;

        const safePage = Math.max(1, Math.min(currentPage, pdfDoc.numPages || 1));
        const page = await pdfDoc.getPage(safePage);
        if (!active) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(260, container.clientWidth - 32);

        const zoomScale = zoom / 100;
        const scale = Math.min(2.0, (availableWidth / baseViewport.width) * zoomScale);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderContext = {
          canvasContext: context,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        };

        currentTask = page.render(renderContext);
        mainRenderTaskRef.current = currentTask;
        await currentTask.promise;

        if (mainRenderTaskRef.current === currentTask) {
          mainRenderTaskRef.current = null;
        }
        if (!active) return;

        container.innerHTML = "";
        container.appendChild(canvas);
      } catch (err) {
        if (!active || isCancelledError(err)) return;
        console.error("Failed to render main page:", err);
      }
    };

    renderMainPage();

    return () => {
      active = false;
      if (currentTask) {
        try {
          currentTask.cancel();
        } catch {
          // Expected cancellation on unmount/re-render
        }
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  const totalPages = isSplitPage ? 1 : (pdfDoc ? pdfDoc.numPages : pages || 0);

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
            boxShadow: "none",
          }}
        ></div>
      </div>
    );
  }

  return (
    <aside
      id="previewPanel"
      className={`preview-panel target-${target || "default"}${mobileActive ? " mobile-active" : ""}`}
    >
      <div className="preview-head-new">
        <div className="preview-head-left">
          <span className="preview-label">{target === "result" ? "EXPORT PREVIEW" : "PREVIEW"}</span>
          <h3 className="preview-title" title={title || "No PDF selected"}>
            {title
              ? title.length > 28
                ? `${title.slice(0, 25)}...`
                : title
              : target === "result" ? "Merged Document" : "No PDF selected"}
          </h3>
        </div>
        <div className="preview-head-right">
          <span className="page-count-badge">
            {totalPages} {totalPages === 1 ? "page" : "pages"}
          </span>
          {onClose && (
            <button
              id="closePreviewBtn"
              className="close-preview-btn-new"
              type="button"
              aria-label="Close preview"
              onClick={onClose}
            >
              &times;
            </button>
          )}
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

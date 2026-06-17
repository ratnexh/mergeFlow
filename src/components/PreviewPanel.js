import React, { useEffect, useRef, useState } from "react";

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
  const [status, setStatus] = useState("Loading preview...");

  useEffect(() => {
    let active = true;
    const container = containerRef.current;
    if (!container) return;

    // Clear previous canvases
    container.innerHTML = "";

    if (!url) {
      setStatus("Select a PDF to view it here.");
      return;
    }

    if (!window.pdfjsLib) {
      setStatus("Preview renderer could not load. Download still works.");
      return;
    }

    setStatus(""); // Clear loading text

    const renderPdf = async () => {
      try {
        const loadingTask = window.pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        if (!active) return;

        const isSplitPage = Number.isInteger(pageIndex);
        const startPage = isSplitPage ? pageIndex + 1 : 1;
        const maxPages = isSplitPage
          ? startPage
          : target === "result"
          ? Math.min(pdf.numPages, 12)
          : 1;

        for (let pageNumber = startPage; pageNumber <= maxPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (!active) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const availableWidth = Math.max(280, container.clientWidth - 42);
          const scale = Math.min(1.6, availableWidth / baseViewport.width);
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
        }

        if (!isSplitPage && pdf.numPages > maxPages) {
          const note = document.createElement("div");
          note.className = "render-note";
          note.textContent = `Showing ${maxPages} of ${pdf.numPages} pages. Download includes the full PDF.`;
          container.appendChild(note);
        }
      } catch (err) {
        console.error("Failed to render PDF:", err);
        if (active) {
          setStatus("This PDF cannot be previewed here, but download still works.");
        }
      }
    };

    renderPdf();

    return () => {
      active = false;
    };
  }, [url, pageIndex, target]);

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
      <div className="preview-head">
        <div>
          <p className="eyebrow">Preview</p>
          <h3 id="previewTitle" title={title || "No PDF selected"}>
            {title
              ? title.length > 28
                ? `${title.slice(0, 25)}...`
                : title
              : "No PDF selected"}
          </h3>
        </div>
        <div className="preview-actions">
          <span id="previewMeta">
            {pages} {pages === 1 ? "page" : "pages"}
          </span>
          <button
            id="closePreviewBtn"
            className="close-preview-btn"
            type="button"
            aria-label="Close preview"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
      </div>
      {status && <div className="preview-empty">{status}</div>}
      <div ref={containerRef} className="pdf-canvas-viewer active"></div>
    </aside>
  );
}

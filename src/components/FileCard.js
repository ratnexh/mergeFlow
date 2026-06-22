import React, { useState, useEffect, useRef } from "react";

function CardThumbnail({ url, pageIndex }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!url || !window.pdfjsLib) {
      setLoading(false);
      return;
    }

    const renderThumb = async () => {
      let pdf = null;
      try {
        const loadingTask = window.pdfjsLib.getDocument(url);
        pdf = await loadingTask.promise;
        if (!active) {
          pdf.destroy();
          return;
        }

        const targetPage = Number.isInteger(pageIndex) ? pageIndex + 1 : 1;
        const page = await pdf.getPage(targetPage);
        if (!active) {
          pdf.destroy();
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          pdf.destroy();
          return;
        }

        const context = canvas.getContext("2d");
        
        // Scale to fit card preview height (around 180px)
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
      } finally {
        if (pdf) {
          pdf.destroy();
        }
      }
    };

    renderThumb();

    return () => {
      active = false;
    };
  }, [url, pageIndex]);

  return (
    <div className="card-thumb-container">
      {loading && <div className="card-thumb-loading">Loading preview...</div>}
      <canvas ref={canvasRef} className="card-thumb-canvas" />
    </div>
  );
}

export default function FileCard({
  item,
  index,
  isActive,
  isSelected,
  onSelect,
  onClick,
  onDragStart,
  onDragEnd,
  onDropItem,
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const shortName = (name) => {
    const base = name.replace(/\.[^.]+$/, "");
    return base.length > 24 ? `${base.slice(0, 21)}...` : base;
  };

  const formatMb = (bytes) =>
    Math.max(0.1, bytes / 1024 / 1024).toFixed(bytes > 10000000 ? 0 : 1);

  const handleDragEnter = (e) => {
    if (e.dataTransfer.types.includes("text/plain")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const sourceId = e.dataTransfer.getData("text/plain");
    onDropItem(sourceId, item.id);
  };

  return (
    <article
      className={`file-card${isActive ? " active" : ""}${isSelected ? " selected" : ""}${isDragOver ? " drag-over" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(e) => {
        if (e.target.closest(".card-check")) return;
        onClick();
      }}
      style={{
        "--accent-card": item.accent,
        "--rot": `${item.rotation}deg`,
      }}
    >
      <div className="card-index-badge">{index}</div>

      <label className="card-check" aria-label={`Select ${item.name}`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
        />
        <span className="card-check-custom" />
      </label>

      {item.rotation !== 0 && (
        <span className="rotation-badge" aria-label={`Rotated ${item.rotation} degrees`}>
          ↻ {item.rotation}°
        </span>
      )}

      {/* Drag handle dots */}
      <div className="drag-handle drag-left" aria-hidden="true">
        <div className="drag-column">
          <span></span><span></span><span></span>
        </div>
        <div className="drag-column">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div className="drag-handle drag-right" aria-hidden="true">
        <div className="drag-column">
          <span></span><span></span><span></span>
        </div>
        <div className="drag-column">
          <span></span><span></span><span></span>
        </div>
      </div>

      <div className="page-thumb">
        <CardThumbnail url={item.url} pageIndex={item.pageIndex} />
      </div>

      <div className="card-meta">
        <span className="file-name" title={item.name}>
          {shortName(item.name)}
        </span>
        <div className="page-count">
          {item.pages} {item.pages === 1 ? "page" : "pages"} • {formatMb(item.size)} MB
        </div>
      </div>
    </article>
  );
}

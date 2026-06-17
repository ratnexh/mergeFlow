import React, { useState } from "react";

export default function FileCard({
  item,
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
      className={`file-card${isActive ? " active" : ""}${isDragOver ? " drag-over" : ""}`}
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
      <label className="card-check" aria-label={`Select ${item.name}`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </label>
      {item.rotation !== 0 && (
        <span className="rotation-badge" aria-label={`Rotated ${item.rotation} degrees`}>
          ↻ {item.rotation}°
        </span>
      )}
      <div className="page-thumb"></div>
      <span className="file-name" title={item.name}>
        {shortName(item.name)}
      </span>
      <div className="page-count">
        {item.pages} {item.pages === 1 ? "page" : "pages"}
      </div>
    </article>
  );
}

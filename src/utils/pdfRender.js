/**
 * Shared PDF.js canvas rendering & cancellation utilities to serialize renders
 * per canvas element and suppress expected unmounting/worker cancellations.
 */

export function isPdfRenderCancelled(err) {
  if (!err) return false;
  const msg = String(err.message || err);
  return (
    err.name === "RenderingCancelledException" ||
    msg.includes("Rendering cancelled") ||
    msg.includes("Worker was destroyed") ||
    msg.includes("Transport destroyed")
  );
}

export function cancelActiveRenderTask(renderTaskRef) {
  const task = renderTaskRef?.current;
  if (!task) return;
  try {
    task.cancel();
  } catch {
    // Ignore tasks that have already completed or cancelled
  }
}

export async function renderPdfPageToCanvas({
  page,
  canvas,
  scale = 0.35,
  renderTaskRef,
  isCancelled = () => false,
}) {
  if (renderTaskRef?.current) {
    try {
      renderTaskRef.current.cancel();
      await renderTaskRef.current.promise;
    } catch {
      // Expected cancellation of prior render task on this canvas
    }
    renderTaskRef.current = null;
  }

  if (!page || !canvas || isCancelled()) return false;

  const context = canvas.getContext("2d");
  const viewport = page.getViewport({ scale });
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const renderContext = {
    canvasContext: context,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
  };

  const renderTask = page.render(renderContext);
  if (renderTaskRef) {
    renderTaskRef.current = renderTask;
  }

  try {
    await renderTask.promise;
    return !isCancelled();
  } finally {
    if (renderTaskRef && renderTaskRef.current === renderTask) {
      renderTaskRef.current = null;
    }
  }
}


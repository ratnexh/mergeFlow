"use client";

import React, { useState, useEffect, useRef } from "react";
import PreviewPanel from "../../components/PreviewPanel";
import InfoModal from "../../components/InfoModal";
import Header from "../../components/Header";
import Script from "next/script";
import { loadScript } from "../../utils/lazyLoad";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const COMPRESSION_PROFILES = {
  low: {
    label: "Less Compression",
    maxImgDim: 2200,
    imgQuality: 0.84,
    rasterScale: 1.5,
    rasterMaxDim: 2200,
    rasterQuality: 0.80,
    estRatio: 0.65,
  },
  medium: {
    label: "Recommended",
    maxImgDim: 1500,
    imgQuality: 0.68,
    rasterScale: 1.25,
    rasterMaxDim: 1650,
    rasterQuality: 0.66,
    estRatio: 0.42,
  },
  high: {
    label: "Extreme Compression",
    maxImgDim: 1050,
    imgQuality: 0.45,
    rasterScale: 1.0,
    rasterMaxDim: 1280,
    rasterQuality: 0.48,
    estRatio: 0.22,
  },
};

function readPdfNumber(pdfObj) {
  if (!pdfObj) return 0;
  if (typeof pdfObj.asNumber === "function") return pdfObj.asNumber();
  if (typeof pdfObj.value === "number") return pdfObj.value;
  return Number(pdfObj) || 0;
}

async function blobToCanvasJpeg(blob, maxDim, quality) {
  let bitmap = null;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(blob);
    } else {
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        };
        img.src = url;
      });
    }

    const srcW = bitmap.width;
    const srcH = bitmap.height;
    if (!srcW || !srcH) return null;

    const longest = Math.max(srcW, srcH);
    const ratio = longest > maxDim ? maxDim / longest : 1;
    const targetW = Math.max(1, Math.round(srcW * ratio));
    const targetH = Math.max(1, Math.round(srcH * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const outBlob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
    if (!outBlob) return null;
    return { bytes: new Uint8Array(await outBlob.arrayBuffer()), width: targetW, height: targetH };
  } finally {
    if (bitmap && typeof bitmap.close === "function") bitmap.close();
  }
}

async function rawPixelsToCanvasJpeg(rawPixels, width, height, components, maxDim, quality) {
  if (!width || !height) return null;
  if (rawPixels.length !== width * height * components) return null;

  const rgba = new Uint8ClampedArray(width * height * 4);
  if (components === 3) {
    for (let i = 0, j = 0; i < rawPixels.length; i += 3, j += 4) {
      rgba[j] = rawPixels[i];
      rgba[j + 1] = rawPixels[i + 1];
      rgba[j + 2] = rawPixels[i + 2];
      rgba[j + 3] = 255;
    }
  } else if (components === 1) {
    for (let i = 0, j = 0; i < rawPixels.length; i += 1, j += 4) {
      const v = rawPixels[i];
      rgba[j] = v;
      rgba[j + 1] = v;
      rgba[j + 2] = v;
      rgba[j + 3] = 255;
    }
  } else {
    return null;
  }

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext("2d");
  srcCtx.putImageData(new ImageData(rgba, width, height), 0, 0);

  const longest = Math.max(width, height);
  const ratio = longest > maxDim ? maxDim / longest : 1;
  const targetW = Math.max(1, Math.round(width * ratio));
  const targetH = Math.max(1, Math.round(height * ratio));

  const outCanvas = document.createElement("canvas");
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const outCtx = outCanvas.getContext("2d");
  outCtx.fillStyle = "#ffffff";
  outCtx.fillRect(0, 0, targetW, targetH);
  outCtx.drawImage(srcCanvas, 0, 0, targetW, targetH);

  const outBlob = await new Promise((resolve) =>
    outCanvas.toBlob((b) => resolve(b), "image/jpeg", quality)
  );
  if (!outBlob) return null;
  return { bytes: new Uint8Array(await outBlob.arrayBuffer()), width: targetW, height: targetH };
}

export default function CompressPage() {
  // Theme & Layout States
  const [theme, setTheme] = useState("dark");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", body: "" });

  // Compression State
  const [compressFile, setCompressFile] = useState(null);
  const [compressionLevel, setCompressionLevel] = useState("medium"); // "low" | "medium" | "high"
  const [compressView, setCompressView] = useState("upload"); // "upload" | "settings" | "processing" | "done"
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [compressedUrl, setCompressedUrl] = useState(null);
  const [compressedName, setCompressedName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("Initializing PDF optimizer...");
  const [optimizationMethod, setOptimizationMethod] = useState("");
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  const compressInputRef = useRef(null);

  // Load PDF.js & pdf-lib locally in browser
  useEffect(() => {
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"),
      loadScript("https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"),
    ])
      .then(() => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        setLibsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load PDF libraries dynamically:", err);
        setLoadingError(true);
      });
  }, []);

  // Theme Sync on load (without cascading setState warnings)
  useEffect(() => {
    const savedTheme = localStorage.getItem("mergeStudioTheme") || "dark";
    document.body.classList.toggle("theme-light", savedTheme === "light");
    const raf = requestAnimationFrame(() => setTheme(savedTheme));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Check for shared file from merge/split page
  useEffect(() => {
    if (typeof window !== "undefined" && window.sharedPdfFile) {
      const file = window.sharedPdfFile;
      window.sharedPdfFile = null;
      const raf = requestAnimationFrame(() => {
        setCompressFile(file);
        setOriginalSize(file.size);
        setCompressView("settings");
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  // Scroll Shrink Nav Hook
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

  // Cleanup Object URL on unmount and change
  useEffect(() => {
    return () => {
      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    };
  }, [compressedUrl]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("mergeStudioTheme", nextTheme);
    document.body.classList.toggle("theme-light", nextTheme === "light");
  };

  const resetCompressState = () => {
    setCompressFile(null);
    setCompressionLevel("medium");
    setCompressView("upload");
    setCompressedBlob(null);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setCompressedUrl(null);
    setCompressedName("");
    setOriginalSize(0);
    setCompressedSize(0);
    setCompressionProgress(0);
    setProgressStage("Initializing PDF optimizer...");
    setOptimizationMethod("");
  };

  const handleCompressFileSelect = (filesList) => {
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
    if (!usable.length) {
      setModal({
        isOpen: true,
        title: "Unsupported File",
        body: "Please select a valid PDF (.pdf) document.",
      });
      return;
    }
    const file = usable[0];
    setCompressFile(file);
    setOriginalSize(file.size);
    setCompressView("settings");
  };

  // Pass 1: Vector-Preserving Optimization + In-Place XObject Image Compression + Object Streams
  const runStructuralAndImagePass = async (arrayBuffer, profile) => {
    const PDFLib = window.PDFLib;
    const { PDFDocument, PDFName, PDFRawStream, PDFArray, PDFNumber } = PDFLib;

    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });

    // Strip redundant metadata & thumbnails
    try {
      srcDoc.setTitle("");
      srcDoc.setSubject("");
      srcDoc.setKeywords([]);
      srcDoc.setCreator("rawPDF Engine");
      srcDoc.setProducer("rawPDF");
      if (srcDoc.catalog && PDFName) {
        srcDoc.catalog.delete(PDFName.of("Metadata"));
      }
      srcDoc.getPages().forEach((page) => {
        page.node.delete(PDFName.of("Thumb"));
      });
    } catch {
      // Non-critical metadata cleanup
    }

    let imagesRecompressed = 0;

    // Inspect embedded XObject Images inside PDF
    if (typeof srcDoc.context?.enumerateIndirectObjects === "function" && PDFRawStream) {
      const objects = srcDoc.context.enumerateIndirectObjects();
      const imageEntries = [];

      for (const [ref, obj] of objects) {
        if (!(obj instanceof PDFRawStream) || !obj.dict) continue;
        if (obj.dict.get(PDFName.of("Subtype")) !== PDFName.of("Image")) continue;
        // Skip image masks or alpha SMask channels so transparency stays crisp
        if (obj.dict.get(PDFName.of("ImageMask")) || obj.dict.get(PDFName.of("SMask")) || obj.dict.get(PDFName.of("Mask"))) {
          continue;
        }
        imageEntries.push([ref, obj]);
      }

      for (let idx = 0; idx < imageEntries.length; idx++) {
        const [ref, obj] = imageEntries[idx];
        setCompressionProgress(12 + Math.round(((idx + 1) / Math.max(1, imageEntries.length)) * 38));

        try {
          const width = readPdfNumber(obj.dict.get(PDFName.of("Width")));
          const height = readPdfNumber(obj.dict.get(PDFName.of("Height")));
          if (width * height < 4096) continue; // Keep tiny UI icons untouched

          let filterObj = obj.dict.get(PDFName.of("Filter"));
          if (filterObj instanceof PDFArray && filterObj.size() === 1) {
            filterObj = filterObj.get(0);
          }

          // Determine safe ColorSpace (DeviceRGB / DeviceGray / 1 or 3-channel ICCBased)
          let csObj = obj.dict.get(PDFName.of("ColorSpace"));
          if (csObj) csObj = srcDoc.context.lookup(csObj);
          let components = 0;
          if (csObj === PDFName.of("DeviceRGB")) {
            components = 3;
          } else if (csObj === PDFName.of("DeviceGray")) {
            components = 1;
          } else if (csObj instanceof PDFArray && csObj.size() >= 2 && csObj.get(0) === PDFName.of("ICCBased")) {
            const iccStream = srcDoc.context.lookup(csObj.get(1));
            if (iccStream && iccStream.dict) {
              const n = readPdfNumber(iccStream.dict.get(PDFName.of("N")));
              if (n === 1 || n === 3) components = n;
            }
          }
          if (!components) continue; // Skip Indexed / CMYK / Separation to preserve exact color accuracy

          let result = null;
          if (filterObj === PDFName.of("DCTDecode")) {
            const blob = new Blob([obj.contents], { type: "image/jpeg" });
            result = await blobToCanvasJpeg(blob, profile.maxImgDim, profile.imgQuality);
          } else if (filterObj === PDFName.of("FlateDecode") && typeof PDFLib.decodePDFRawStream === "function") {
            const bpc = readPdfNumber(obj.dict.get(PDFName.of("BitsPerComponent"))) || 8;
            if (bpc !== 8) continue;

            // Check DecodeParms: only convert clean non-predictor raw pixel buffers directly
            const decodeParms = obj.dict.get(PDFName.of("DecodeParms"));
            if (decodeParms) {
              const resolvedParms = srcDoc.context.lookup(decodeParms);
              const predictor = readPdfNumber(resolvedParms?.get?.(PDFName.of("Predictor")));
              if (predictor > 1) continue;
            }

            const decoded = PDFLib.decodePDFRawStream(obj).decode();
            result = await rawPixelsToCanvasJpeg(
              decoded,
              width,
              height,
              components,
              profile.maxImgDim,
              profile.imgQuality
            );
          }

          if (result && result.bytes.byteLength < obj.contents.byteLength * 0.95) {
            const newDict = obj.dict.clone(srcDoc.context);
            newDict.set(PDFName.of("Type"), PDFName.of("XObject"));
            newDict.set(PDFName.of("Subtype"), PDFName.of("Image"));
            newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
            newDict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
            newDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
            newDict.set(PDFName.of("Width"), PDFNumber.of(result.width));
            newDict.set(PDFName.of("Height"), PDFNumber.of(result.height));
            newDict.set(PDFName.of("Length"), PDFNumber.of(result.bytes.byteLength));
            newDict.delete(PDFName.of("DecodeParms"));

            const replacementStream =
              typeof PDFRawStream.of === "function"
                ? PDFRawStream.of(newDict, result.bytes)
                : new PDFRawStream(newDict, result.bytes);
            srcDoc.context.assign(ref, replacementStream);
            imagesRecompressed++;
          }
        } catch {
          // Skip complex XObject safely without corrupting the document
        }
      }
    }

    // Rebuild clean PDF structure via copyPages to drop unreferenced orphaned objects
    const cleanDoc = await PDFDocument.create();
    const indices = srcDoc.getPageIndices();
    const copied = await cleanDoc.copyPages(srcDoc, indices);
    copied.forEach((p) => cleanDoc.addPage(p));
    cleanDoc.setCreator("rawPDF Engine");
    cleanDoc.setProducer("rawPDF");

    const rebuiltBytes = await cleanDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateInfoDict: false,
    });

    const directBytes = await srcDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateInfoDict: false,
    });

    const bestBytes = rebuiltBytes.byteLength <= directBytes.byteLength ? rebuiltBytes : directBytes;
    return { bytes: bestBytes, imagesRecompressed };
  };

  // Pass 2: Adaptive Page Optimization (White Canvas Background + Preserved Original Page Dimensions)
  const runAdaptivePagePass = async (arrayBuffer, profile, progressBase = 55) => {
    const pdfjsDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    try {
      const totalPages = pdfjsDoc.numPages;
      const outPdf = await window.PDFLib.PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfjsDoc.getPage(i);
        const baseViewport = page.getViewport({ scale: 1.0 });

        // Compute scale capped cleanly so tall capture PDFs never exceed GPU canvas limits
        const longestBase = Math.max(baseViewport.width, baseViewport.height);
        const cappedScale = Math.min(profile.rasterScale, profile.rasterMaxDim / Math.max(1, longestBase));
        const renderScale = Math.max(0.4, cappedScale);
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const context = canvas.getContext("2d");

        // Paint opaque white background so transparent PDFs never render black in JPEG
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: context, viewport }).promise;

        const jpegBlob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
            "image/jpeg",
            profile.rasterQuality
          );
        });

        const jpegBytes = await jpegBlob.arrayBuffer();
        const embeddedImage = await outPdf.embedJpg(jpegBytes);

        // Preserve original physical page points (not scaled pixels!)
        const newPage = outPdf.addPage([baseViewport.width, baseViewport.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: baseViewport.width,
          height: baseViewport.height,
        });

        setCompressionProgress(
          Math.min(96, progressBase + Math.round((i / totalPages) * (96 - progressBase)))
        );
      }

      outPdf.setCreator("rawPDF Engine");
      outPdf.setProducer("rawPDF");
      return await outPdf.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateInfoDict: false,
      });
    } finally {
      pdfjsDoc.destroy();
    }
  };

  const compressPdf = async (targetFile = compressFile, level = compressionLevel) => {
    if (!targetFile) return;
    const profile = COMPRESSION_PROFILES[level] || COMPRESSION_PROFILES.medium;
    setCompressView("processing");
    setCompressionProgress(5);
    setProgressStage("Analyzing PDF structure & embedded assets...");

    try {
      const arrayBuffer = await targetFile.arrayBuffer();

      if (!window.pdfjsLib || !window.PDFLib) {
        throw new Error("PDF engines are still loading. Please try again in a moment.");
      }

      let bestBytes = null;
      let methodUsed = "Object Stream Compression";

      // Pass 1: Structure + In-Place XObject Compression (keeps sharp searchable vector text!)
      let pass1Result = null;
      try {
        setProgressStage("Optimizing embedded images & document streams...");
        pass1Result = await runStructuralAndImagePass(arrayBuffer, profile);
        bestBytes = pass1Result.bytes;
        methodUsed =
          pass1Result.imagesRecompressed > 0
            ? `Smart Vector + Image Optimization (${pass1Result.imagesRecompressed} image${pass1Result.imagesRecompressed === 1 ? "" : "s"})`
            : "Lossless PDF Stream Compression";
      } catch (pass1Err) {
        const msg = String(pass1Err?.message || "").toLowerCase();
        if (msg.includes("encrypt") || msg.includes("password")) {
          throw new Error("Encrypted PDF: This PDF is password-protected. Please unlock it first.");
        }
        console.warn("Pass 1 structural pass skipped, falling back to raster pass:", pass1Err);
      }

      setCompressionProgress((prev) => Math.max(prev, 52));

      // Pass 2: Adaptive Page Optimization when Extreme mode selected or Pass 1 reduced < 15%
      const pass1Ratio = bestBytes ? bestBytes.byteLength / targetFile.size : 1;
      const shouldRunPass2 =
        !bestBytes ||
        (level === "high" && pass1Ratio > 0.65) ||
        (pass1Ratio > 0.85 && targetFile.size > 65000);

      if (shouldRunPass2) {
        try {
          setProgressStage("Running deep page-level compression...");
          const rasterBytes = await runAdaptivePagePass(arrayBuffer, profile, 55);
          if (!bestBytes || rasterBytes.byteLength < bestBytes.byteLength * 0.92) {
            bestBytes = rasterBytes;
            methodUsed = "High-Ratio Page Optimization";
          }
        } catch (pass2Err) {
          console.warn("Pass 2 raster pass failed:", pass2Err);
          if (!bestBytes) throw pass2Err;
        }
      }

      const resBlob = new Blob([bestBytes], { type: "application/pdf" });
      setCompressedBlob(resBlob);
      setCompressedSize(resBlob.size);
      setOptimizationMethod(methodUsed);

      const resName = targetFile.name.replace(/\.pdf$/i, "") + "-compressed.pdf";
      setCompressedName(resName);

      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
      const resUrl = URL.createObjectURL(resBlob);
      setCompressedUrl(resUrl);

      setProgressStage("Finalizing compressed PDF...");
      setCompressionProgress(100);
      await wait(300);
      setCompressView("done");
    } catch (err) {
      console.error("Compression failed:", err);
      const isEncrypted = String(err?.message || "").toLowerCase().includes("encrypt");
      setModal({
        isOpen: true,
        title: "Compression Error",
        body: isEncrypted
          ? "This PDF appears to be encrypted or password-protected. Please unlock the PDF before compressing."
          : err?.message || "Failed to compress the PDF file. Please ensure it is a valid, unencrypted PDF.",
      });
      setCompressView("settings");
    }
  };

  const downloadCompressed = () => {
    if (!compressedBlob) return;
    const finalName = normalizePdfName(compressedName);
    const link = document.createElement("a");
    link.href = compressedUrl || URL.createObjectURL(compressedBlob);
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const normalizePdfName = (val) => {
    const cleaned = (val || "compressed-document.pdf")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, " ");
    return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes <= 0) return "0 KB";
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
  };

  const savingsPct =
    originalSize > 0 ? Math.round(((originalSize - compressedSize) / originalSize) * 100) : 0;

  return (
    <>
      <Header
        isScrolled={isScrolled}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        isWorkspace={compressView !== "upload" && Boolean(compressFile)}
        onBack={() => {
          if (compressView === "done") setCompressView("settings");
          else {
            setCompressView("upload");
            setCompressFile(null);
          }
        }}
        workspaceTitle="Compress PDF"
        workspaceSubtitle={compressView === "done" ? "Optimized Ready" : compressFile?.name}
      />

      {/* Settings View */}
      {compressView === "settings" && compressFile && (
        <main id="workspace" className="studio view active" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
            <div className="compress-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(248, 244, 235, 0.12)", paddingBottom: "16px", marginBottom: "24px", gap: "12px" }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={compressFile.name}>
                    {compressFile.name}
                  </h3>
                  <p style={{ margin: 0, color: "var(--subtle)", fontSize: "14px" }}>Original Size: {formatSize(compressFile.size)}</p>
                </div>
                <button
                  className="ghost-btn"
                  style={{ minHeight: "36px", padding: "0 12px", flexShrink: 0 }}
                  onClick={() => {
                    setCompressView("upload");
                    setCompressFile(null);
                  }}
                >
                  Change File
                </button>
              </div>

              <div style={{ marginBottom: "28px" }}>
                <h4 style={{ margin: "0 0 14px", fontSize: "15px", textAlign: "left" }}>Select Compression Level</h4>
                <div className="compression-levels">
                  <div
                    className={`level-card${compressionLevel === "low" ? " active" : ""}`}
                    onClick={() => setCompressionLevel("low")}
                  >
                    <h5>Less Compression</h5>
                    <p>Preserves high image resolution and crisp text</p>
                    <div className="est-size">Target: ~{formatSize(compressFile.size * COMPRESSION_PROFILES.low.estRatio)}</div>
                  </div>

                  <div
                    className={`level-card${compressionLevel === "medium" ? " active" : ""}`}
                    onClick={() => setCompressionLevel("medium")}
                  >
                    <h5>Recommended</h5>
                    <p>Best balance between file reduction and sharp readability</p>
                    <div className="est-size">Target: ~{formatSize(compressFile.size * COMPRESSION_PROFILES.medium.estRatio)}</div>
                  </div>

                  <div
                    className={`level-card${compressionLevel === "high" ? " active" : ""}`}
                    onClick={() => setCompressionLevel("high")}
                  >
                    <h5>Extreme Compression</h5>
                    <p>Maximum size reduction for email & fast sharing</p>
                    <div className="est-size">Target: ~{formatSize(compressFile.size * COMPRESSION_PROFILES.high.estRatio)}</div>
                  </div>
                </div>
              </div>

              <button
                className="wide-btn"
                style={{ width: "100%", minHeight: "50px", opacity: libsLoaded ? 1 : 0.6 }}
                disabled={!libsLoaded}
                onClick={() => compressPdf()}
              >
                {libsLoaded ? "Compress PDF" : "Loading PDF engine..."}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Upload / Processing / Done Views */}
      {compressView !== "settings" && (
        <main id="compress" className="landing view active">
          <input
            id="compressInput"
            className="sr-only"
            type="file"
            accept=".pdf,application/pdf"
            ref={compressInputRef}
            onChange={(e) => {
              handleCompressFileSelect([...e.target.files]);
              e.target.value = "";
            }}
          />

          <section className="hero" style={{ paddingTop: "90px" }}>
            <div className="bg-golden-ribbons" aria-hidden="true">
              <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="goldRibbonTopComp" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#e5a93c" stopOpacity="0" />
                    <stop offset="15%" stopColor="#e5a93c" stopOpacity="0.75" />
                    <stop offset="40%" stopColor="#ffe494" stopOpacity="0.95" />
                    <stop offset="70%" stopColor="#f5c768" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#e5a93c" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="goldRibbonBottomComp" x1="100%" y1="50%" x2="0%" y2="50%">
                    <stop offset="0%" stopColor="#e5a93c" stopOpacity="0" />
                    <stop offset="20%" stopColor="#e5a93c" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#ffe494" stopOpacity="0.95" />
                    <stop offset="80%" stopColor="#f5c768" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#e5a93c" stopOpacity="0" />
                  </linearGradient>
                  <filter id="ribbonGlowSoftComp" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                  <filter id="ribbonGlowWideComp" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="16" />
                  </filter>
                </defs>
                <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopComp)" strokeWidth="18" filter="url(#ribbonGlowWideComp)" opacity="0.35" />
                <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopComp)" strokeWidth="5" filter="url(#ribbonGlowSoftComp)" opacity="0.85" />
                <path d="M -40,360 C 140,390 280,260 480,180 S 850,110 1200,125" stroke="url(#goldRibbonTopComp)" strokeWidth="2" opacity="1" />

                <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomComp)" strokeWidth="18" filter="url(#ribbonGlowWideComp)" opacity="0.35" />
                <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomComp)" strokeWidth="5" filter="url(#ribbonGlowSoftComp)" opacity="0.85" />
                <path d="M 1480,620 C 1300,750 1140,840 900,870 S 500,880 280,840" stroke="url(#goldRibbonBottomComp)" strokeWidth="2" opacity="1" />
              </svg>
            </div>

            {/* Inner View: Upload */}
            {compressView === "upload" && (
              <div
                id="compressDropzone"
                className={`dropzone${isDragOverDropzone ? " dragover" : ""}`}
                tabIndex="0"
                role="button"
                aria-label="Choose a PDF file to compress"
                onClick={() => {
                  if (libsLoaded) compressInputRef.current.click();
                }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragOverDropzone(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOverDropzone(false);
                  if (libsLoaded) handleCompressFileSelect([...e.dataTransfer.files]);
                }}
                onKeyDown={(e) => {
                  if (libsLoaded && (e.key === "Enter" || e.key === " ")) {
                    compressInputRef.current.click();
                  }
                }}
              >
                <div className="dropzone-bottom-glow" aria-hidden="true"></div>
                <div className="dropzone-inner">
                  <div className="dropzone-cards" aria-hidden="true">
                    <div className="pdf-card-shadow card-left"></div>
                    <div className="pdf-card-shadow card-right"></div>
                    <div className="pdf-card-front">
                      <div className="pdf-card-dogear"></div>
                      <span>PDF</span>
                    </div>
                  </div>

                  <h2 className="dropzone-title">Compress PDF</h2>
                  <p className="dropzone-subtitle">or drag and drop PDF here</p>

                  {loadingError ? (
                    <p className="dropzone-loading" style={{ color: "#f87171" }}>Failed to load PDF engine. Please refresh.</p>
                  ) : !libsLoaded ? (
                    <p className="dropzone-loading">Loading secure PDF engine...</p>
                  ) : (
                    <button id="chooseBtn" className="choose-btn-gold" type="button" aria-label="Open file picker">
                      <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Choose PDF file</span>
                    </button>
                  )}

                  <div className="dropzone-formats">
                    Supported Format: <strong>PDF (.pdf)</strong> • Max Size: 100MB <strong>per file</strong>
                  </div>

                  <div className="dropzone-security">
                    <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Files are processed locally. Your data stays private.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Inner View: Processing */}
            {compressView === "processing" && (
              <div className="compress-card" style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
                <div className="process-icon" aria-hidden="true" style={{ margin: "0 auto 24px" }}>
                  <span></span>
                  <span></span>
                </div>
                <h2 style={{ margin: "0 0 8px" }}>Optimizing your PDF</h2>
                <div className="progress" style={{ margin: "24px 0 16px" }}>
                  <i style={{ width: `${compressionProgress}%`, transition: "width 0.3s ease" }}></i>
                </div>
                <p style={{ margin: 0, color: "var(--subtle)" }}>{progressStage} {compressionProgress}%</p>
              </div>
            )}

            {/* Inner View: Done */}
            {compressView === "done" && (
              <div
                className="compress-card compress-done-card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "32px",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {/* Left Column: Preview */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    background: theme === "light" ? "rgba(16, 22, 36, 0.03)" : "rgba(13, 18, 27, 0.45)",
                    border: theme === "light" ? "1px solid rgba(16, 22, 36, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "20px 16px",
                    height: "460px",
                    overflowY: "auto",
                    width: "100%",
                    boxSizing: "border-box",
                    scrollbarWidth: "thin",
                  }}
                >
                  <PreviewPanel url={compressedUrl} target="simple" />
                </div>

                {/* Right Column: Actions */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <p className="eyebrow" style={{ margin: "0 0 6px" }}>Success</p>
                    <h2 style={{ margin: "0 0 12px" }}>Optimized Ready</h2>
                    {optimizationMethod && (
                      <div className="compress-method-badge">
                        <span>✓</span>
                        <span>{optimizationMethod}</span>
                      </div>
                    )}

                    <div className="size-compare">
                      <div className="size-box">
                        <p>Original</p>
                        <strong>{formatSize(originalSize)}</strong>
                      </div>
                      <span className="arrow-sep">➔</span>
                      <div className={`size-box optimized${compressedSize > originalSize ? " increased" : ""}`}>
                        <p>{compressedSize > originalSize ? "Result" : "Optimized"}</p>
                        <strong>{formatSize(compressedSize)}</strong>
                        {originalSize >= compressedSize ? (
                          <span className="saving-badge">-{savingsPct}%</span>
                        ) : (
                          <span className="saving-badge warning">
                            +{Math.round(((compressedSize - originalSize) / originalSize) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {compressedSize >= originalSize && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "12px 16px",
                          background: theme === "light" ? "rgba(217, 45, 32, 0.06)" : "rgba(217, 45, 32, 0.08)",
                          border: "1px solid rgba(217, 45, 32, 0.25)",
                          borderRadius: "10px",
                          fontSize: "13px",
                          lineHeight: "1.5",
                          color: theme === "light" ? "#101624" : "rgba(248, 244, 235, 0.85)",
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: "16px", lineHeight: "1.2" }}>💡</span>
                        <div>
                          <strong style={{ color: theme === "light" ? "#b91c1c" : "#fca5a5", display: "block", marginBottom: "3px" }}>
                            Already maximally compressed
                          </strong>
                          This PDF already uses tight compression or compact vector streams. Trying Extreme Compression may reduce further if images exist.
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="rename-field" style={{ marginBottom: "18px" }}>
                    <span>Rename optimized file</span>
                    <input
                      id="renameCompressInput"
                      type="text"
                      value={compressedName}
                      onChange={(e) => setCompressedName(e.target.value)}
                    />
                  </label>

                  <button className="wide-btn" style={{ width: "100%", marginBottom: "14px" }} onClick={downloadCompressed}>
                    Download Compressed PDF
                  </button>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button className="ghost-btn" style={{ flex: 1 }} onClick={() => setCompressView("settings")}>
                      Change Level
                    </button>
                    <button className="ghost-btn" style={{ flex: 1 }} onClick={resetCompressState}>
                      Compress Another
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {compressView === "upload" && (
            <Script id="schema-compress" type="application/ld+json" strategy="afterInteractive">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "RawPDF Compress Tool",
                "description": "Reduce PDF file size locally in your browser. 100% private and free.",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "All",
                "browserRequirements": "Requires HTML5 and WebAssembly support",
                "offers": {
                  "@type": "Offer",
                  "price": "0.00",
                  "priceCurrency": "USD",
                },
              })}
            </Script>
          )}
        </main>
      )}

      <InfoModal
        isOpen={modal.isOpen}
        title={modal.title}
        body={modal.body}
        onClose={() => setModal({ isOpen: false, title: "", body: "" })}
      />
    </>
  );
}

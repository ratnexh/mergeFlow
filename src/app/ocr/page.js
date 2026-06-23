import OcrClient from "./OcrClient";

export const metadata = {
  title: "OCR PDF Text Extractor | RawPDF",
  description: "Extract text from scanned PDF documents and images locally using OCR. 100% private, secure, and fast with no server uploads.",
  keywords: "ocr pdf, extract text from pdf, pdf ocr browser, local ocr tool, free pdf ocr, image ocr, client-side ocr, secure ocr pdf",
  openGraph: {
    title: "OCR PDF Text Extractor | RawPDF",
    description: "Extract text from scanned PDF documents and images locally using OCR. 100% private, secure, and fast with no server uploads.",
    url: "https://ratnexh.github.io/rawPDF/ocr",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OCR PDF Text Extractor | RawPDF",
    description: "Extract text from scanned PDF documents and images locally using OCR. 100% private, secure, and fast with no server uploads.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <OcrClient />;
}

import PdfToImageClient from "./PdfToImageClient";

export const metadata = {
  title: "Convert PDF to Image - rawPDF - Secure Client-Side PDF Converter",
  description: "Convert your PDF pages into high-quality JPEG or PNG images directly in your browser. 100% private, client-side, secure, with no server uploads.",
  keywords: "pdf to image, pdf to png, pdf to jpeg, convert pdf pages to images, secure pdf converter, client-side pdf tools, private converter",
  openGraph: {
    title: "Convert PDF to Image - rawPDF - Secure Client-Side PDF Converter",
    description: "Convert your PDF pages into high-quality JPEG or PNG images directly in your browser. 100% private, client-side, secure, with no server uploads.",
    url: "https://ratnexh.github.io/rawPDF/pdf-to-image",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Convert PDF to Image - rawPDF - Secure Client-Side PDF Converter",
    description: "Convert your PDF pages into high-quality JPEG or PNG images directly in your browser. 100% private, client-side, secure, with no server uploads.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <PdfToImageClient />;
}

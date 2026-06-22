import ImageToPdfClient from "./ImageToPdfClient";

export const metadata = {
  title: "Convert Image to PDF - rawPDF - Secure Client-Side PDF Tools",
  description: "Convert your PNG, JPEG, WebP, and GIF images into a clean, optimized PDF document. 100% private, client-side processing directly in your browser.",
  keywords: "image to pdf, png to pdf, jpeg to pdf, webp to pdf, convert image, secure pdf converter, client-side pdf tools",
  openGraph: {
    title: "Convert Image to PDF - rawPDF - Secure Client-Side PDF Tools",
    description: "Convert your PNG, JPEG, WebP, and GIF images into a clean, optimized PDF document. 100% private, client-side processing directly in your browser.",
    url: "https://ratnexh.github.io/rawPDF/image-to-pdf",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Convert Image to PDF - rawPDF - Secure Client-Side PDF Tools",
    description: "Convert your PNG, JPEG, WebP, and GIF images into a clean, optimized PDF document. 100% private, client-side processing directly in your browser.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <ImageToPdfClient />;
}

import CompressClient from "./CompressClient";

export const metadata = {
  title: "Compress PDF - mergeFlow - Local PDF Compression & Optimization",
  description: "Reduce PDF file size locally in your browser without uploading to external servers. High-quality client-side compression that preserves document content.",
  keywords: "compress pdf, reduce pdf size, optimize pdf, compress pdf locally, private pdf compression, client-side pdf compress, secure pdf tools",
  openGraph: {
    title: "Compress PDF - mergeFlow - Local PDF Compression & Optimization",
    description: "Reduce PDF file size locally in your browser without uploading to external servers. High-quality client-side compression that preserves document content.",
    url: "https://ratnexh.github.io/mergeFlow/compress",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/mergeFlow/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Compress PDF - mergeFlow - Local PDF Compression & Optimization",
    description: "Reduce PDF file size locally in your browser without uploading to external servers. High-quality client-side compression that preserves document content.",
    images: ["https://ratnexh.github.io/mergeFlow/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <CompressClient />;
}

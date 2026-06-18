import MergeClient from "./MergeClient";

export const metadata = {
  title: "Merge PDFs - mergeFlow - Secure Client-Side PDF Merger",
  description: "Combine multiple PDF files locally in your browser. 100% private, secure, and fast. Arrange, preview, and join PDF files with no server uploads.",
  keywords: "merge pdf, combine pdfs, join pdf, merge pdf locally, private pdf merger, local pdf combine, client-side pdf merge, secure pdf tools",
  openGraph: {
    title: "Merge PDFs - mergeFlow - Secure Client-Side PDF Merger",
    description: "Combine multiple PDF files locally in your browser. 100% private, secure, and fast. Arrange, preview, and join PDF files with no server uploads.",
    url: "https://ratnexh.github.io/mergeFlow/merge",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/mergeFlow/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merge PDFs - mergeFlow - Secure Client-Side PDF Merger",
    description: "Combine multiple PDF files locally in your browser. 100% private, secure, and fast. Arrange, preview, and join PDF files with no server uploads.",
    images: ["https://ratnexh.github.io/mergeFlow/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <MergeClient />;
}

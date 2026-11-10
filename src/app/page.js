import MergeClient from "./merge/MergeClient";

export const metadata = {
  title: "Merge PDF Online Free | rawPDF",
  description: "Combine multiple PDF files locally in your browser. 100% private, secure, and fast. Arrange, preview, and join PDF files with no server uploads.",
  keywords: "merge pdf, combine pdfs, join pdf, merge pdf locally, private pdf merger, local pdf combine, client-side pdf merge, secure pdf tools, rawpdf",
  openGraph: {
    title: "Merge PDF Online Free | rawPDF",
    description: "Combine multiple PDF files locally in your browser. 100% private, secure, and fast. Arrange, preview, and join PDF files with no server uploads.",
    url: "https://ratnexh.github.io/rawPDF/",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merge PDF Online Free | rawPDF",
    description: "Combine multiple PDF files locally in your browser. 100% private, secure, and fast. Arrange, preview, and join PDF files with no server uploads.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <MergeClient />;
}

import EditClient from "./EditClient";

export const metadata = {
  title: "Edit PDF Online Free | RawPDF",
  description: "Edit your PDF documents directly in your browser. Add text, highlights, annotations, and images to any PDF page — all locally with zero server uploads.",
  keywords: "edit pdf, annotate pdf, add text to pdf, pdf editor browser, local pdf editor, free pdf editor, pdf annotation tool, rawPDF edit pdf",
  openGraph: {
    title: "Edit PDF Online Free | RawPDF",
    description: "Edit your PDF documents directly in your browser. Add text, highlights, annotations, and images to any PDF page — all locally with zero server uploads.",
    url: "https://ratnexh.github.io/rawPDF/edit",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Edit PDF Online Free | RawPDF",
    description: "Edit your PDF documents directly in your browser. Add text, highlights, annotations, and images to any PDF page — all locally with zero server uploads.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <EditClient />;
}

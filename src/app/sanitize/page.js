import SanitizeClient from "./SanitizeClient";

export const metadata = {
  title: "Sanitize PDF Metadata & Privacy Inspector | RawPDF",
  description: "Inspect hidden PDF metadata (Author, Software stamps, Creation dates) and strip identifying details 100% locally in your browser before sharing.",
  keywords: "sanitize pdf, strip pdf metadata, remove pdf author, inspect pdf metadata, anonymous pdf, private pdf tools, client-side metadata stripper, rawpdf",
  openGraph: {
    title: "Sanitize PDF Metadata & Privacy Inspector | RawPDF",
    description: "Inspect hidden PDF metadata (Author, Software stamps, Creation dates) and strip identifying details 100% locally in your browser before sharing.",
    url: "https://ratnexh.github.io/rawPDF/sanitize",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sanitize PDF Metadata & Privacy Inspector | RawPDF",
    description: "Inspect hidden PDF metadata (Author, Software stamps, Creation dates) and strip identifying details 100% locally in your browser before sharing.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <SanitizeClient />;
}

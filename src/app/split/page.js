import SplitClient from "./SplitClient";

export const metadata = {
  title: "Split PDF - mergeFlow - Secure Client-Side PDF Splitter",
  description: "Extract pages or split PDF documents into individual page assets completely locally in your browser. 100% private, secure, and fast with no server uploads.",
  keywords: "split pdf, extract pdf pages, split pdf locally, private pdf splitter, cut pdf page, local pdf split, client-side pdf splitter, secure pdf tools",
  openGraph: {
    title: "Split PDF - mergeFlow - Secure Client-Side PDF Splitter",
    description: "Extract pages or split PDF documents into individual page assets completely locally in your browser. 100% private, secure, and fast with no server uploads.",
    url: "https://ratnexh.github.io/mergeFlow/split",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/mergeFlow/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Split PDF - mergeFlow - Secure Client-Side PDF Splitter",
    description: "Extract pages or split PDF documents into individual page assets completely locally in your browser. 100% private, secure, and fast with no server uploads.",
    images: ["https://ratnexh.github.io/mergeFlow/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <SplitClient />;
}

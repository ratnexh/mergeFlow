import TextEditorClient from "./TextEditorClient";

export const metadata = {
  title: "Text Editor & Case Converter | RawPDF",
  description: "Convert text case (uppercase, lowercase, title case) and perform advanced text editing locally in your browser. 100% private, secure, and offline.",
  keywords: "case converter, text editor, sentence case, title case, uppercase, lowercase, reverse case, clean spaces, merge lines, secure text editor, private text formatting",
  openGraph: {
    title: "Text Editor & Case Converter | RawPDF",
    description: "Convert text case and format content locally. 100% private, secure, and offline.",
    url: "https://ratnexh.github.io/rawPDF/text-editor",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Editor & Case Converter | RawPDF",
    description: "Convert text case and format content locally. 100% private, secure, and offline.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <TextEditorClient />;
}

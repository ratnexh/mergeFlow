import HomeClient from "./HomeClient";

export const metadata = {
  title: "rawPDF - Private Client-Side PDF Studio",
  description: "Combine, split, and compress PDF files locally in your browser. 100% secure, private, and lightning-fast with zero server uploads.",
  keywords: "pdf merger, merge pdf, split pdf, compress pdf, local pdf tool, client side pdf, secure pdf tools, local pdf merger, private pdf splitter, web pdf compression",
  openGraph: {
    title: "rawPDF - Private Client-Side PDF Studio",
    description: "Combine, split, and compress PDF files locally in your browser. 100% secure, private, and lightning-fast with zero server uploads.",
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
    title: "rawPDF - Private Client-Side PDF Studio",
    description: "Combine, split, and compress PDF files locally in your browser. 100% secure, private, and lightning-fast with zero server uploads.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <HomeClient />;
}

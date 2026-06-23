import ProtectClient from "./ProtectClient";

export const metadata = {
  title: "Protect PDF Online | RawPDF",
  description: "Encrypt your PDF document with a strong password completely locally in your browser. 100% private, secure, and fast with no server uploads.",
  keywords: "protect pdf, encrypt pdf, password protect pdf, browser pdf lock, local pdf encryption, client-side pdf password, secure pdf tools",
  openGraph: {
    title: "Protect PDF Online | RawPDF",
    description: "Encrypt your PDF document with a strong password completely locally in your browser. 100% private, secure, and fast with no server uploads.",
    url: "https://ratnexh.github.io/rawPDF/protect",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Protect PDF Online | RawPDF",
    description: "Encrypt your PDF document with a strong password completely locally in your browser. 100% private, secure, and fast with no server uploads.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <ProtectClient />;
}

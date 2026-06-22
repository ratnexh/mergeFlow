import PrivacyClient from "./PrivacyClient";

export const metadata = {
  title: "Privacy Policy - rawPDF - 100% Local and Secure",
  description: "Read the rawPDF privacy policy. Your documents never leave your computer. No file uploads, no cookies, no tracking, and no server logs.",
  keywords: "private pdf, secure document editing, offline document privacy, data protection, secure pdf tools",
  openGraph: {
    title: "Privacy Policy - rawPDF - 100% Local and Secure",
    description: "Read the rawPDF privacy policy. Your documents never leave your computer. No file uploads, no cookies, no tracking, and no server logs.",
    url: "https://ratnexh.github.io/rawPDF/privacy",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy - rawPDF - 100% Local and Secure",
    description: "Read the rawPDF privacy policy. Your documents never leave your computer. No file uploads, no cookies, no tracking, and no server logs.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <PrivacyClient />;
}

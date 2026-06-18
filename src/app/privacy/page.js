import PrivacyClient from "./PrivacyClient";

export const metadata = {
  title: "Privacy Policy - mergeFlow - 100% Local and Secure",
  description: "Read the mergeFlow privacy policy. Your documents never leave your computer. No file uploads, no cookies, no tracking, and no server logs.",
  keywords: "private pdf, secure document editing, offline document privacy, data protection, secure pdf tools",
  openGraph: {
    title: "Privacy Policy - mergeFlow - 100% Local and Secure",
    description: "Read the mergeFlow privacy policy. Your documents never leave your computer. No file uploads, no cookies, no tracking, and no server logs.",
    url: "https://ratnexh.github.io/mergeFlow/privacy",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/mergeFlow/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy - mergeFlow - 100% Local and Secure",
    description: "Read the mergeFlow privacy policy. Your documents never leave your computer. No file uploads, no cookies, no tracking, and no server logs.",
    images: ["https://ratnexh.github.io/mergeFlow/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <PrivacyClient />;
}

import HowItWorksClient from "./HowItWorksClient";

export const metadata = {
  title: "How It Works - rawPDF - Secure Local PDF Processing",
  description: "Learn how rawPDF processes your PDF files securely inside your web browser. 100% local, offline-ready, serverless execution utilizing WebAssembly and client-side memory.",
  keywords: "local pdf processing, serverless pdf tool, browser pdf merge, client-side webassembly pdf, local file security",
  openGraph: {
    title: "How It Works - rawPDF - Secure Local PDF Processing",
    description: "Learn how rawPDF processes your PDF files securely inside your web browser. 100% local, offline-ready, serverless execution utilizing WebAssembly and client-side memory.",
    url: "https://ratnexh.github.io/rawPDF/how-it-works",
    type: "website",
    images: [
      {
        url: "https://ratnexh.github.io/rawPDF/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works - rawPDF - Secure Local PDF Processing",
    description: "Learn how rawPDF processes your PDF files securely inside your web browser. 100% local, offline-ready, serverless execution utilizing WebAssembly and client-side memory.",
    images: ["https://ratnexh.github.io/rawPDF/assets/premium-documents.png"],
  },
};

export default function Page() {
  return <HowItWorksClient />;
}

import "./globals.css";

export const metadata = {
  title: "mergeFlow - Private client-side PDF Studio",
  description: "mergeFlow - A secure, private, client-side PDF studio. Arrange, rotate, preview, split, and merge PDF files directly in your browser without uploading to any external servers.",
  keywords: "pdf merger, merge pdf, split pdf, combine pdfs, rotate pdf, client-side pdf tool, private pdf tools, local pdf merger",
  authors: [{ name: "Ratnesh Kumar" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "https://ratnexh.github.io/mergeFlow/",
    title: "mergeFlow - Private client-side PDF Studio",
    description: "Combine, split, rotate, and preview PDF files completely locally in your browser. 100% private, secure, and lightning-fast.",
    images: [
      {
        url: "https://ratnexh.github.io/mergeFlow/assets/premium-documents.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    url: "https://ratnexh.github.io/mergeFlow/",
    title: "mergeFlow - Private client-side PDF Studio",
    description: "Combine, split, rotate, and preview PDF files completely locally in your browser. 100% private and secure.",
    images: ["https://ratnexh.github.io/mergeFlow/assets/premium-documents.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Space+Grotesk:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Cdefs%3E%3ClinearGradient id='logoGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23b88a43'/%3E%3Cstop offset='100%25' stop-color='%230f8176'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='4' y='6' width='16' height='20' rx='3' stroke='url(%23logoGrad)' stroke-width='2.5' stroke-linejoin='round'/%3E%3Crect x='12' y='10' width='16' height='20' rx='3' fill='%230d121b' stroke='url(%23logoGrad)' stroke-width='2.5' stroke-linejoin='round'/%3E%3Cpath d='M17 15H23' stroke='url(%23logoGrad)' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M17 19H23' stroke='url(%23logoGrad)' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

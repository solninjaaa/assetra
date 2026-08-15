import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Assetra",
  description: "Your on-chain portfolio, simplified.",
  icons: {
    icon: "/assetra-logo.png",
    shortcut: "/assetra-logo.png",
    apple: "/assetra-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoSynth",
  description: "Reverse engineer a public GitHub repository into a likely AI coding prompt."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

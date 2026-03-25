import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Excavation MVP Timer",
  description: "Fixed-field minimum session timer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { NextAuthProvider } from "@/lib/next-auth-provider";

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
      <body>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}

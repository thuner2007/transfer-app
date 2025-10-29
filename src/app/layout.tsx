import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "File Transfer",
  description: "Secure file transfer application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

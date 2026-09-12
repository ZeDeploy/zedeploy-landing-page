import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZeDeploy - Cloud Infrastructure Solutions",
  description:
    "Enterprise-grade cloud infrastructure solutions for modern businesses. From deployment to optimization, we've got you covered.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

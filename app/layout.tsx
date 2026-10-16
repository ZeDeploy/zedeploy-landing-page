import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Let content draw behind rounded notches / home-indicator areas.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ZeDeploy - Cloud Infrastructure Solutions",
  description:
    "Enterprise-grade cloud infrastructure solutions for modern businesses. From deployment to optimization, we've got you covered.",
  icons: {
    icon: "/zed-logo-preview.png",
    apple: "/zed-logo-preview.png",
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
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}

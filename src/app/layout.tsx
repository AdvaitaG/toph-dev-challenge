import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({ src: "../../public/fonts/geist-latin.woff2", variable: "--font-geist", display: "swap", weight: "100 900" });

export const metadata: Metadata = {
  title: "Toph | Farm Dashboard",
  description: "Farm activity recordings and employee logs for Bays Ranch.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      {/* Extensions such as Grammarly add body attributes before hydration.
          Limit suppression to this element; descendants retain their checks. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

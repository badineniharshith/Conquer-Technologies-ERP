import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Conquer ERP - Enterprise Management System",
  description: "Next-generation production grade enterprise planning control panel.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full font-sans antialiased bg-background text-foreground transition-colors duration-300">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { DarkModeProvider } from "@/components/DarkModeProvider";

export const metadata: Metadata = {
  title: "Học Vui ⭐ – Học thật vui!",
  description: "Ứng dụng học tập gamified cho học sinh tiểu học",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Học Vui",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#667eea" />
      </head>
      <body>
        <DarkModeProvider>
          <div className="app-frame">{children}</div>
          <Toaster position="top-center" richColors />
        </DarkModeProvider>
      </body>
    </html>
  );
}
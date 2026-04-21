import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { DarkModeProvider } from "@/components/DarkModeProvider";

export const metadata: Metadata = {
  title: "Học Vui ⭐ – Học thật vui!",
  description: "Ứng dụng học tập gamified cho học sinh tiểu học",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <DarkModeProvider>
          <div className="app-frame">{children}</div>
          <Toaster position="top-center" richColors />
        </DarkModeProvider>
      </body>
    </html>
  );
}
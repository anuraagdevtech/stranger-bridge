import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/useAuth";

export const metadata: Metadata = {
  title: "Stranger Bridge",
  description: "Meet, chat, and call new people.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

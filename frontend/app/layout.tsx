import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Content Agent",
  description: "Automated content creation and posting system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground selection:bg-primary/20`}
      >
        <div className="min-h-screen flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 h-screen sticky top-0">
            <Sidebar />
          </aside>

          <div className="flex-1 flex flex-col min-h-screen">
            <MobileNav />

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-8 pt-4 lg:pt-8 w-full max-w-7xl mx-auto overflow-x-hidden">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
              </div>
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Universitas Siliwangi — EVM Academic Verification",
  description: "Sistem Verifikasi Kredensial Akademik & Ijazah Terdesentralisasi Universitas Siliwangi Berbasis Smart Contract EVM & Privacy by Design",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#ffffff] text-[#171717] font-sans selection:bg-[#171717] selection:text-white">
        {/* Vercel-style Sub-header Status Bar */}
        <div className="border-b border-[#ebebeb] bg-[#fafafa] text-[11px] font-mono text-[#666666] px-4 sm:px-8 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00875a]"></span>
            <span className="text-[#666666]">UNSIL Blockchain Private</span>
            <span className="text-[#d4d4d4]">/</span>
            <span className="text-[#171717] font-medium">Chain 31337</span>
            <span className="text-[#d4d4d4]">/</span>
            <span className="text-[#8f8f8f] hidden sm:inline">rpc.prizftm.my.id</span>
          </div>
          <div className="text-[#8f8f8f] text-[10px] hidden sm:block">
            UU PDP No. 27/2022 Compliant &bull; 0 Gas Client View
          </div>
        </div>

        {/* Minimalist Header with Universitas Siliwangi Brand */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#ebebeb]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/unsil-logo.png"
                alt="Logo Universitas Siliwangi"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
                priority
              />
              <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
                <span className="text-[#666666]">Universitas Siliwangi</span>
                <span className="text-[#d4d4d4]">/</span>
                <span className="text-[#171717] font-semibold">VeriKredensial</span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-[#666666] hover:text-[#171717] hover:bg-[#f5f5f5] transition-colors"
              >
                Verifikasi Publik
              </Link>
              <Link
                href="/issuer"
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#171717] hover:bg-[#333333] text-white transition-colors"
              >
                Portal Penerbitan
              </Link>
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10">
          {children}
        </main>

        {/* Technical Minimal Footer */}
        <footer className="border-t border-[#ebebeb] bg-[#fafafa] py-8 text-center text-xs text-[#8f8f8f]">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
            <div>
              <span>UAS Blockchain (KP70067008)</span>
              <span className="mx-2 text-[#d4d4d4]">&bull;</span>
              <span>Dr. Ir. Nur Widiyasono, M.Kom.</span>
            </div>
            <div className="text-[#8f8f8f]">
              M. Zikri A. &bull; Gita Syafira A. &bull; Friza Tri M. &bull; M. Syahran M. T.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

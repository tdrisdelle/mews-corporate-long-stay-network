import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mews Corporate Long-Stay Network",
  description: "B2B Corporate Housing Marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#FAF9F6", color: "#1E2A2E" }} className="min-h-screen">
        <nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-50 shadow-sm">
          <span className="font-bold text-xl" style={{ color: "#1D9E75" }}>Mews</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-700 text-sm">Corporate Long-Stay Network</span>
          <div className="ml-auto flex gap-6 text-sm font-medium">
            <a href="/booker?as=booker&id=a0000000-0000-0000-0000-000000000001" className="hover:text-[#1D9E75] text-gray-600 transition-colors">Booker</a>
            <a href="/operator?as=operator&id=c0000000-0000-0000-0000-000000000001" className="hover:text-[#1D9E75] text-gray-600 transition-colors">Operator</a>
            <a href="/mews?as=mews" className="hover:text-[#1D9E75] text-gray-600 transition-colors">Mews Admin</a>
            <a href="/resident?as=resident&id=b0000000-0000-0000-0000-000000000001" className="hover:text-[#1D9E75] text-gray-600 transition-colors">Resident</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}

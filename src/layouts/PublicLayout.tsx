import type { ReactNode } from "react";
import Navbar from "../components/Navbar";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-civic-navy text-slate-300 border-t border-white/10 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="font-medium text-white">CivicConnect AI · Multilingual Municipal Grievance Portal</p>
          <p className="text-slate-400">Supports Kannada (ಕನ್ನಡ), English, and Kanglish · Citizen & Officer Services</p>
        </div>
      </footer>
    </div>
  );
}

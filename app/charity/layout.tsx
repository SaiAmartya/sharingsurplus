"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CharityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex min-h-screen bg-nb-bg font-sans">
      {/* Sidebar */}
      <div className="w-24 lg:w-72 border-r border-slate-100 flex flex-col py-8 items-center lg:items-stretch z-20 bg-white fixed h-full">
        <div className="px-6 mb-12 flex items-center justify-center lg:justify-start">
            <Link href="/" className="w-10 h-10 bg-nb-blue rounded-xl mr-0 lg:mr-3 shrink-0 shadow-glow flex items-center justify-center text-white hover:bg-indigo-600 transition-colors">
                <i className="fas fa-leaf"></i>
            </Link>
            <span className="font-display font-bold text-2xl text-nb-ink hidden lg:block tracking-tight">Shur<span className="text-nb-blue">plus</span></span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
            <Link href="/charity/dashboard" className={`w-full p-4 rounded-2xl flex items-center justify-center lg:justify-start font-bold transition-all ${isActive('/charity/dashboard') ? 'bg-nb-blue text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-nb-blue'}`}>
                <i className="fas fa-chart-pie text-xl lg:mr-4"></i>
                <span className="hidden lg:block">Overview</span>
            </Link>
            <Link href="/charity/inventory" className={`w-full p-4 rounded-2xl flex items-center justify-center lg:justify-start font-bold transition-all ${isActive('/charity/inventory') ? 'bg-nb-blue text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-nb-blue'}`}>
                <i className="fas fa-box text-xl lg:mr-4"></i>
                <span className="hidden lg:block">Inventory</span>
            </Link>
            <Link href="/charity/volunteers" className={`w-full p-4 rounded-2xl flex items-center justify-center lg:justify-start font-bold transition-all ${isActive('/charity/volunteers') ? 'bg-nb-blue text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-nb-blue'}`}>
                <i className="fas fa-users text-xl lg:mr-4"></i>
                <span className="hidden lg:block">Volunteers</span>
            </Link>
        </nav>

        <div className="px-6 mt-auto hidden lg:block">
                <div className="bg-nb-bg p-4 rounded-2xl">
                <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-nb-ink rounded-full flex items-center justify-center text-white text-xs font-bold">M</div>
                    <div className="ml-3">
                        <p className="text-xs font-bold text-nb-ink">Manager Jane</p>
                        <p className="text-[10px] text-slate-400 uppercase">Admin</p>
                    </div>
                </div>
                </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-24 lg:ml-72 relative overflow-hidden flex flex-col">
         {/* Top Bar */}
         <div className="h-24 flex items-center justify-between px-10 shrink-0 bg-white/50 backdrop-blur z-10 sticky top-0">
            <h2 className="font-display text-3xl font-bold text-nb-ink">
              {isActive('/charity/dashboard') && 'Dashboard'}
              {isActive('/charity/inventory') && 'Inventory Log'}
              {isActive('/charity/volunteers') && 'Volunteer Roster'}
            </h2>
            <div className="flex items-center space-x-4">
                <button className="w-12 h-12 rounded-full bg-white text-slate-400 hover:text-nb-blue hover:shadow-md transition-all flex items-center justify-center">
                    <i className="fas fa-bell"></i>
                </button>
                <button className="bg-nb-ink text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center">
                    <i className="fas fa-barcode mr-2"></i> Scan Intake
                </button>
            </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-10 pt-2 space-y-8">
            {children}
        </div>
      </div>
    </div>
  );
}


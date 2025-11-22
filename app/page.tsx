import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-nb-bg bg-dots flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-nb-blue-soft/40 rounded-bl-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-nb-orange-soft/30 rounded-tr-full -ml-20 -mb-20 pointer-events-none"></div>

      <div className="max-w-md w-full space-y-12 relative z-10 text-center">
        
        <div className="space-y-2">
          <h1 className="font-display text-5xl font-bold text-nb-ink leading-tight">
            Shurplus
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Connecting food distributors with communities in need.
          </p>
        </div>

        <div className="grid gap-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select your role</p>
          
          <Link href="/donor" className="group relative">
            <div className="absolute inset-0 bg-nb-ink rounded-2xl translate-y-2 group-hover:translate-y-3 transition-transform"></div>
            <div className="relative bg-white border-2 border-nb-ink rounded-2xl p-5 flex items-center justify-between group-hover:-translate-y-1 transition-transform">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-nb-blue-soft text-nb-blue rounded-xl flex items-center justify-center text-xl mr-4">
                  <i className="fas fa-store"></i>
                </div>
                <div className="text-left">
                  <h3 className="font-display font-bold text-lg text-nb-ink">Distributor</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase">Donate Food</p>
                </div>
              </div>
              <i className="fas fa-arrow-right text-slate-300 group-hover:text-nb-ink transition-colors"></i>
            </div>
          </Link>

          <Link href="/volunteer" className="group relative">
            <div className="absolute inset-0 bg-nb-teal rounded-2xl translate-y-2 group-hover:translate-y-3 transition-transform opacity-20"></div>
            <div className="relative bg-white border-2 border-slate-200 hover:border-nb-teal rounded-2xl p-5 flex items-center justify-between group-hover:-translate-y-1 transition-transform">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-nb-teal-soft text-nb-teal rounded-xl flex items-center justify-center text-xl mr-4">
                  <i className="fas fa-truck"></i>
                </div>
                <div className="text-left">
                  <h3 className="font-display font-bold text-lg text-nb-ink">Volunteer</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase">Transport</p>
                </div>
              </div>
              <i className="fas fa-arrow-right text-slate-300 group-hover:text-nb-teal transition-colors"></i>
            </div>
          </Link>

          <Link href="/charity/dashboard" className="group relative">
            <div className="absolute inset-0 bg-nb-orange rounded-2xl translate-y-2 group-hover:translate-y-3 transition-transform opacity-20"></div>
            <div className="relative bg-white border-2 border-slate-200 hover:border-nb-orange rounded-2xl p-5 flex items-center justify-between group-hover:-translate-y-1 transition-transform">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-nb-orange-soft text-nb-orange rounded-xl flex items-center justify-center text-xl mr-4">
                  <i className="fas fa-heart"></i>
                </div>
                <div className="text-left">
                  <h3 className="font-display font-bold text-lg text-nb-ink">Food Bank</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase">Manage Inventory</p>
                </div>
              </div>
              <i className="fas fa-arrow-right text-slate-300 group-hover:text-nb-orange transition-colors"></i>
            </div>
          </Link>

        </div>

        <div className="pt-8">
            <p className="text-slate-400 text-xs">Neo-Bauhaus MVP v0.1.0</p>
        </div>
      </div>
    </main>
  );
}

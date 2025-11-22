import Link from "next/link";

export default function VolunteerRoutes() {
  return (
    <div className="pt-12 px-6 pb-10 max-w-lg mx-auto">
       {/* Header */}
       <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="font-display text-3xl font-bold text-nb-teal flex items-center">
                    Online <span className="ml-2 w-3 h-3 bg-nb-teal rounded-full animate-pulse"></span>
                </h2>
            </div>
            {/* Geometric Toggle */}
            <div className="w-16 h-9 bg-nb-teal-soft rounded-full relative cursor-pointer transition-colors">
                <div className="w-7 h-7 bg-nb-teal rounded-full absolute top-1 right-1 shadow-sm"></div>
            </div>
        </div>

        <h3 className="font-display text-xl font-bold mb-5 text-nb-ink">Smart Routes <span className="text-slate-400 text-sm font-sans font-normal ml-2">(AI Optimized)</span></h3>

        {/* Route Card */}
        <div className="bg-white rounded-[2rem] shadow-soft p-6 mb-6 relative overflow-hidden border border-slate-100">
            {/* Decorative Blob */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-nb-orange-soft rounded-bl-full -mr-10 -mt-10 z-0 opacity-50"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                    <span className="bg-nb-ink text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm">45 MINS</span>
                    <div className="text-right">
                        <span className="font-display font-bold text-3xl text-slate-800 leading-none">80</span>
                        <div className="text-xs text-slate-400 font-bold uppercase">Meals Saved</div>
                    </div>
                </div>

                {/* Visual Route Line */}
                <div className="relative pl-4 border-l-2 border-slate-100 space-y-8 mb-8 ml-2">
                    {/* Stop 1 */}
                    <div className="relative">
                        <div className="absolute -left-[23px] top-1 w-5 h-5 bg-white border-4 border-nb-ink rounded-full"></div>
                        <div>
                            <h4 className="font-bold text-nb-ink text-lg">Loblaws Market</h4>
                            <p className="text-sm text-slate-500">Pickup: 3 Boxes Apples</p>
                        </div>
                    </div>
                    {/* Stop 2 */}
                    <div className="relative">
                        <div className="absolute -left-[23px] top-1 w-5 h-5 bg-nb-ink rounded-full shadow-sm"></div>
                        <div>
                            <h4 className="font-bold text-nb-ink text-lg">Central Hub</h4>
                            <p className="text-sm text-slate-500">Drop-off Zone B</p>
                        </div>
                    </div>
                </div>

                <Link href="/volunteer/active" className="block w-full text-center bg-nb-blue text-white py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-glow hover:-translate-y-1">
                    Start Route
                </Link>
            </div>
        </div>
        
        {/* Secondary Route (Dimmed) */}
        <div className="bg-white/60 rounded-[2rem] p-6 border border-slate-100 opacity-60">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-slate-200 text-slate-500 px-4 py-1.5 rounded-full text-xs font-bold">1.5 HRS</span>
                <span className="font-display font-bold text-2xl text-slate-400">120 Meals</span>
            </div>
            <p className="text-slate-400 font-bold">Farm Boy -&gt; Shelter</p>
        </div>
    </div>
  );
}


import Link from "next/link";

export default function ActiveDelivery() {
  return (
    <div className="h-screen flex flex-col bg-white relative overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 bg-nb-bg relative overflow-hidden">
            <div className="absolute inset-0 bg-dots opacity-40"></div>
            
            {/* Back Button Overlay */}
            <Link href="/volunteer" className="absolute top-6 left-6 z-50 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 text-nb-ink">
                 <i className="fas fa-arrow-left"></i>
            </Link>

            {/* Abstract Map Elements */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[32px] border-nb-blue-soft/30 rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 left-1/2 w-4 h-4 bg-nb-blue rounded-full shadow-glow transform -translate-x-1/2 -translate-y-1/2 z-10"></div>
            
            {/* Floating Info Pill */}
            <div className="absolute top-20 left-6 right-6 bg-white/90 backdrop-blur rounded-2xl shadow-float p-4 flex items-center space-x-4 border border-white mx-auto max-w-md">
                <div className="w-12 h-12 bg-nb-orange-soft text-nb-orange rounded-full flex items-center justify-center text-xl shrink-0">
                    <i className="fas fa-location-arrow"></i>
                </div>
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Navigating to</p>
                    <p className="font-display font-bold text-xl text-nb-ink">Loblaws Market</p>
                </div>
            </div>
        </div>

        {/* Action Sheet */}
        <div className="bg-white rounded-t-[2.5rem] shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.1)] p-8 pb-10 relative z-20">
            {/* Pull Indicator */}
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="font-display text-2xl font-bold text-nb-ink">Task 1/2</h3>
                    <p className="text-slate-500 font-medium mt-1">Contact: Manager John (555-0199)</p>
                </div>
                <button className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-nb-blue hover:text-white transition-colors">
                    <i className="fas fa-phone"></i>
                </button>
            </div>

            {/* Slide to Arrive */}
            <div className="relative h-20 bg-slate-50 rounded-full overflow-hidden border border-slate-100 group cursor-pointer select-none">
                <div className="absolute left-0 top-0 bottom-0 w-20 hover:w-full bg-nb-ink rounded-full flex items-center justify-center text-white transition-all duration-500 ease-out z-10 shadow-md">
                    <i className="fas fa-chevron-right group-hover:opacity-0 transition-opacity"></i>
                    <span className="absolute opacity-0 group-hover:opacity-100 font-bold font-display text-lg tracking-wide">ARRIVED</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-slate-300 font-bold text-sm uppercase tracking-widest pl-10">Slide to Confirm</span>
                </div>
            </div>
            
                <div className="grid grid-cols-2 gap-4 mt-4">
                <button className="py-4 rounded-2xl border border-slate-100 text-slate-500 font-bold hover:bg-slate-50">Skip</button>
                <button className="py-4 rounded-2xl border border-slate-100 text-nb-red font-bold hover:bg-nb-red-soft">Report Issue</button>
            </div>
        </div>
    </div>
  );
}


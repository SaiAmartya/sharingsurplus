import Link from "next/link";

export default function CreateDonation() {
  return (
    <div className="bg-white min-h-screen px-6 pt-12 pb-10 max-w-lg mx-auto relative">
        <div className="flex items-center justify-between mb-8">
            <Link href="/donor" className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100 text-nb-ink transition-colors">
                <i className="fas fa-arrow-left"></i>
            </Link>
             <div className="w-10 h-10 bg-nb-blue-soft text-nb-blue rounded-full flex items-center justify-center font-bold">
                1/2
            </div>
        </div>
        
        <h2 className="font-display text-3xl font-bold mb-8">New <span className="text-nb-blue">Donation</span></h2>

        <div className="space-y-6">
            {/* Photo Area */}
            <div className="aspect-video bg-nb-bg rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-nb-blue/30 cursor-pointer transition-all group">
                <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 text-nb-blue group-hover:scale-110 transition-transform">
                    <i className="fas fa-camera text-xl"></i>
                </div>
                <span className="font-bold text-sm group-hover:text-nb-blue">Tap to Add Photo</span>
            </div>

            {/* Fields */}
            <div className="space-y-5">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Item Title</label>
                    <input type="text" className="w-full nb-input p-4 font-medium" placeholder="e.g. 50 lbs Sourdough Bread" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Weight (kg)</label>
                        <input type="number" className="w-full nb-input p-4 font-medium" placeholder="0" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Expiry</label>
                        <input type="date" className="w-full nb-input p-4 font-medium text-slate-500" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Pickup Window</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="py-3 rounded-2xl border border-nb-blue bg-nb-blue-soft/30 text-nb-blue font-bold text-sm">Today 2-4 PM</button>
                        <button className="py-3 rounded-2xl border border-slate-200 bg-white text-slate-500 font-bold text-sm hover:bg-slate-50">Tomorrow</button>
                    </div>
                </div>

                    <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Description</label>
                    <textarea className="w-full nb-input p-4 font-medium h-24 resize-none" placeholder="Location details, condition..."></textarea>
                </div>
            </div>

            <div className="pt-4">
                <Link href="/donor" className="block w-full text-center bg-nb-ink text-white py-5 rounded-2xl font-display font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                    Post Donation
                </Link>
            </div>
        </div>
    </div>
  );
}


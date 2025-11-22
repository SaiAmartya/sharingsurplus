export default function CharityVolunteers() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Active List */}
        <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 h-max">
            <h3 className="font-display text-xl font-bold mb-6 flex items-center"><span className="w-3 h-3 bg-nb-teal rounded-full mr-3 animate-pulse"></span> Active Now</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm"></div>
                        <div className="ml-3">
                            <p className="font-bold text-nb-ink">Eric W.</p>
                            <p className="text-xs text-slate-400">Driver • Route A</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-nb-teal bg-nb-teal-soft px-2 py-1 rounded-lg">On Route</span>
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm"></div>
                        <div className="ml-3">
                            <p className="font-bold text-nb-ink">Mike R.</p>
                            <p className="text-xs text-slate-400">Driver • Route B</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-nb-teal bg-nb-teal-soft px-2 py-1 rounded-lg">On Route</span>
                </div>
            </div>
        </div>

        {/* Approvals */}
        <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 h-max">
            <h3 className="font-display text-xl font-bold mb-6 text-nb-ink">Pending Approvals</h3>
            <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-nb-bg rounded-2xl">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm"></div>
                        <div className="ml-3">
                            <p className="font-bold text-nb-ink">Sarah J.</p>
                            <p className="text-xs text-slate-400">Sorting • 4.5 Hrs</p>
                        </div>
                    </div>
                    <button className="bg-nb-ink text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-nb-blue transition-colors">Approve</button>
                </div>
            </div>
        </div>
    </div>
  );
}


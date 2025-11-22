export default function CharityInventory() {
  return (
    <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-6 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">Product</div>
            <div>Qty</div>
            <div>Expiry</div>
            <div>Score</div>
            <div className="text-right">Action</div>
        </div>

        {/* Row 1 */}
        <div className="bg-white rounded-2xl p-4 grid grid-cols-6 items-center shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer border border-transparent hover:border-nb-blue/20 group">
            <div className="col-span-2 flex items-center">
                <div className="w-12 h-12 bg-nb-red-soft text-nb-red rounded-xl flex items-center justify-center mr-4 group-hover:bg-nb-red group-hover:text-white transition-colors">
                    <i className="fas fa-wine-bottle"></i>
                </div>
                <div>
                    <p className="font-bold text-nb-ink">Coca-Cola Original</p>
                    <p className="text-xs text-slate-400 font-medium">Beverages • Coca-Cola</p>
                </div>
            </div>
            <div className="font-medium text-slate-600 bg-slate-50 inline-block px-3 py-1 rounded-lg w-max">40 cans</div>
            <div className="font-medium text-slate-600">Dec 01, 2025</div>
            <div><span className="bg-nb-red-soft text-nb-red px-3 py-1 rounded-full text-xs font-bold">E (Low)</span></div>
            <div className="text-right"><button className="text-slate-300 hover:text-nb-blue"><i className="fas fa-chevron-right"></i></button></div>
        </div>

        {/* Row 2 */}
        <div className="bg-white rounded-2xl p-4 grid grid-cols-6 items-center shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer border border-transparent hover:border-nb-blue/20 group">
            <div className="col-span-2 flex items-center">
                <div className="w-12 h-12 bg-nb-teal-soft text-nb-teal rounded-xl flex items-center justify-center mr-4 group-hover:bg-nb-teal group-hover:text-white transition-colors">
                    <i className="fas fa-wheat"></i>
                </div>
                <div>
                    <p className="font-bold text-nb-ink">Whole Wheat Pasta</p>
                    <p className="text-xs text-slate-400 font-medium">Grains • Barilla</p>
                </div>
            </div>
            <div className="font-medium text-slate-600 bg-slate-50 inline-block px-3 py-1 rounded-lg w-max">100 kg</div>
            <div className="font-medium text-slate-600">Jan 15, 2026</div>
            <div><span className="bg-nb-teal-soft text-nb-teal px-3 py-1 rounded-full text-xs font-bold">A (High)</span></div>
            <div className="text-right"><button className="text-slate-300 hover:text-nb-blue"><i className="fas fa-chevron-right"></i></button></div>
        </div>
        
            {/* Row 3 (Urgent) */}
        <div className="bg-white rounded-2xl p-4 grid grid-cols-6 items-center shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer border border-transparent border-l-4 border-l-nb-orange hover:border-nb-blue/20 group">
            <div className="col-span-2 flex items-center">
                <div className="w-12 h-12 bg-nb-orange-soft text-nb-orange rounded-xl flex items-center justify-center mr-4 group-hover:bg-nb-orange group-hover:text-white transition-colors">
                    <i className="fas fa-cookie-bite"></i>
                </div>
                <div>
                    <p className="font-bold text-nb-ink">Granola Bars</p>
                    <p className="text-xs text-slate-400 font-medium">Snacks • Nature Valley</p>
                </div>
            </div>
            <div className="font-medium text-slate-600 bg-slate-50 inline-block px-3 py-1 rounded-lg w-max">50 boxes</div>
            <div className="font-bold text-nb-red flex items-center"><i className="fas fa-exclamation-circle mr-1 text-xs"></i> Tomorrow</div>
            <div><span className="bg-nb-orange-soft text-nb-orange px-3 py-1 rounded-full text-xs font-bold">C (Med)</span></div>
            <div className="text-right"><button className="text-slate-300 hover:text-nb-blue"><i className="fas fa-chevron-right"></i></button></div>
        </div>
    </div>
  );
}


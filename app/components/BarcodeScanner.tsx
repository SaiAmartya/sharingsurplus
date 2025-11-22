"use client";

import { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [manualCode, setManualCode] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      Quagga.stop();
      onDetected(manualCode.trim());
    }
  };

  useEffect(() => {
    if (!scannerRef.current) return;

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          facingMode: "environment", // Use rear camera on mobile
          width: 640,
          height: 480,
        },
      },
      decoder: {
        readers: ["ean_reader", "upc_reader", "upc_e_reader"], // Common food barcodes
      },
      locate: true,
    }, (err) => {
      if (err) {
        console.error("Error starting Quagga:", err);
        return;
      }
      Quagga.start();
    });

    const handleDetected = (result: any) => {
      if (result?.codeResult?.code) {
        Quagga.stop();
        onDetected(result.codeResult.code);
      }
    };

    Quagga.onDetected(handleDetected);

    return () => {
      Quagga.offDetected(handleDetected);
      Quagga.stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
      <h3 className="text-white font-display text-xl mb-4">Scan Barcode</h3>
      <div 
        ref={scannerRef} 
        className="w-full max-w-md aspect-video bg-black rounded-2xl overflow-hidden relative border-2 border-white/20 mb-8"
      >
        {/* Red scanning line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-10"></div>
      </div>

      <div className="w-full max-w-md mb-8">
        <p className="text-white/60 text-center mb-3 text-sm font-medium">Or enter barcode manually</p>
        <form onSubmit={handleManualSubmit} className="flex gap-3">
            <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 5449000000996"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/50 font-mono"
            />
            <button
                type="submit"
                className="bg-white text-nb-ink px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
                Go
            </button>
        </form>
      </div>

      <button 
        onClick={onClose} 
        className="text-white/50 hover:text-white font-bold transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

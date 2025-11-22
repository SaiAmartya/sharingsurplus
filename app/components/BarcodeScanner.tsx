"use client";

import { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import { ProductData } from '@/lib/openfoodfacts';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onProductFound?: (product: ProductData) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onProductFound, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualCode, setManualCode] = useState("");
  const [mode, setMode] = useState<'barcode' | 'vision'>('barcode');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      Quagga.stop();
      onDetected(manualCode.trim());
    }
  };

  // Barcode Logic (Quagga)
  useEffect(() => {
    if (mode !== 'barcode') {
      Quagga.stop();
      return;
    }

    let isMounted = true;

    if (!scannerRef.current) return;

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          facingMode: "environment",
          width: 640,
          height: 480,
        },
      },
      decoder: {
        readers: ["ean_reader", "upc_reader", "upc_e_reader"],
      },
      locate: true,
    }, (err) => {
      if (err) {
        console.error("Error starting Quagga:", err);
        return;
      }
      if (isMounted) Quagga.start();
    });

    const handleDetected = (result: any) => {
      if (result?.codeResult?.code && isMounted) {
        Quagga.stop();
        onDetected(result.codeResult.code);
      }
    };

    Quagga.onDetected(handleDetected);

    return () => {
      isMounted = false;
      Quagga.offDetected(handleDetected);
      Quagga.stop();
    };
  }, [mode, onDetected]);

  // Vision Logic (Camera Stream)
  useEffect(() => {
    if (mode !== 'vision') return;

    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Explicitly play the video to ensure it starts
          await videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode]);

  const captureAndIdentify = async () => {
    if (!videoRef.current || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg').split(',')[1];

      const res = await fetch('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: base64 }),
      });
      
      const data = await res.json();
      if (data.output) {
        // Clean up markdown if present
        const cleanJson = data.output.replace(/```json|```/g, '').trim();
        const productInfo = JSON.parse(cleanJson);
        
        if (onProductFound) {
            onProductFound({
                product_name: productInfo.product_name,
                brands: productInfo.brands,
                quantity: productInfo.quantity,
                nutriscore_grade: productInfo.nutriscore_grade,
                categories: productInfo.category,
                image_url: canvas.toDataURL('image/jpeg') // Use the captured image
            });
        }
      }
    } catch (error) {
      console.error("Vision scan failed:", error);
      alert("Failed to identify item. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="flex gap-4 mb-6">
        <button 
            onClick={() => setMode('barcode')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${mode === 'barcode' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
        >
            <i className="fas fa-barcode mr-2"></i> Barcode
        </button>
        <button 
            onClick={() => setMode('vision')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${mode === 'vision' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
        >
            <i className="fas fa-camera mr-2"></i> Vision AI
        </button>
      </div>

      <div className="w-full max-w-md aspect-video bg-black rounded-2xl overflow-hidden relative border-2 border-white/20 mb-8">
        {mode === 'barcode' ? (
            <>
                <div ref={scannerRef} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"></div>
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-10"></div>
            </>
        ) : (
            <div className="relative w-full h-full">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    </div>
                )}
            </div>
        )}
      </div>

      {mode === 'vision' && (
        <button
            onClick={captureAndIdentify}
            disabled={isProcessing}
            className="mb-8 bg-nb-blue text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform flex items-center"
        >
            <i className="fas fa-magic mr-2"></i> 
            {isProcessing ? 'Identifying...' : 'Identify Item'}
        </button>
      )}

      {mode === 'barcode' && (
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
      )}

      <button 
        onClick={onClose} 
        className="text-white/50 hover:text-white font-bold transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from 'react';
import { UrgentRequest } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

interface RequestCardStackProps {
  requests: UrgentRequest[];
  onAccept: (request: UrgentRequest) => void;
  onDismiss: (request: UrgentRequest) => void;
}

export default function RequestCardStack({ requests, onAccept, onDismiss }: RequestCardStackProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  const visibleRequests = requests.filter(r => !hiddenIds.has(r.id!));
  const currentRequest = visibleRequests[0];
  const nextRequest = visibleRequests[1];

  if (!currentRequest) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <i className="fas fa-check text-2xl text-slate-300"></i>
        </div>
        <p className="text-slate-400 font-bold">You're all caught up!</p>
        <p className="text-xs text-slate-400 mt-1">No more urgent requests nearby.</p>
      </div>
    );
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragX(0);
    // Store initial click position if needed, but we track delta from 0
    // Actually, we need to track the start position to calculate delta
    (cardRef.current as any).startX = clientX;
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startX = (cardRef.current as any).startX;
    setDragX(clientX - startX);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    const threshold = 100; // px to trigger action

    if (dragX > threshold) {
      // Swipe Right - Accept
      setExitDirection('right');
      setTimeout(() => {
        onAccept(currentRequest);
        setHiddenIds(prev => new Set(prev).add(currentRequest.id!));
        setExitDirection(null);
        setDragX(0);
      }, 300);
    } else if (dragX < -threshold) {
      // Swipe Left - Dismiss
      setExitDirection('left');
      setTimeout(() => {
        onDismiss(currentRequest);
        setHiddenIds(prev => new Set(prev).add(currentRequest.id!));
        setExitDirection(null);
        setDragX(0);
      }, 300);
    } else {
      setDragX(0);
    }
  };

  const getCardStyle = (index: number, isTop: boolean) => {
    if (!isTop) {
      return {
        transform: `scale(${1 - index * 0.05}) translateY(${index * 10}px)`,
        zIndex: 10 - index,
        opacity: 1 - index * 0.3,
      };
    }

    if (exitDirection) {
      const xOffset = exitDirection === 'right' ? 1000 : -1000;
      const rotation = exitDirection === 'right' ? 20 : -20;
      return {
        transform: `translateX(${xOffset}px) rotate(${rotation}deg)`,
        zIndex: 20,
        opacity: 0,
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
      };
    }

    const rotation = dragX * 0.1;
    const opacity = 1 - Math.abs(dragX) / (containerWidth * 0.8);
    
    return {
      transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
      zIndex: 20,
      cursor: isDragging ? 'grabbing' : 'grab',
      transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
    };
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-nb-red-soft text-nb-red';
      case 'medium': return 'bg-nb-orange-soft text-nb-orange';
      case 'low': return 'bg-nb-teal-soft text-nb-teal';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getUrgencyBg = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-nb-red-soft';
      case 'medium': return 'bg-nb-orange-soft';
      case 'low': return 'bg-nb-teal-soft';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div ref={containerRef} className="relative h-80 w-full flex justify-center items-center perspective-1000">
      {/* Next Card (Background) */}
      {nextRequest && (
        <div
          className={`absolute w-full h-full rounded-3xl p-6 shadow-sm border border-slate-100 bg-white flex flex-col justify-between select-none`}
          style={getCardStyle(1, false)}
        >
           <div className="flex justify-between items-start">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getUrgencyColor(nextRequest.urgency)}`}>
              {nextRequest.urgency}
            </span>
          </div>
          <div>
            <h3 className="font-display text-3xl font-bold text-nb-ink mb-2">{nextRequest.item}</h3>
            <p className="text-slate-400 font-medium">{nextRequest.foodBankName || 'Food Bank'}</p>
          </div>
          <div className="flex items-center text-slate-400 text-sm font-bold">
             <i className="far fa-clock mr-2"></i> Needed ASAP
          </div>
        </div>
      )}

      {/* Current Card (Top) */}
      <div
        ref={cardRef}
        className={`absolute w-full h-full rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between select-none touch-none ${getUrgencyBg(currentRequest.urgency)}`}
        style={getCardStyle(0, true)}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Swipe Indicators */}
        {isDragging && (
          <>
            <div className={`absolute top-8 left-8 border-4 border-nb-red text-nb-red rounded-xl px-4 py-2 font-display font-bold text-2xl uppercase transform -rotate-12 opacity-${Math.min(1, Math.abs(Math.min(0, dragX)) / 100)} transition-opacity`}>
              Pass
            </div>
            <div className={`absolute top-8 right-8 border-4 border-nb-teal text-nb-teal rounded-xl px-4 py-2 font-display font-bold text-2xl uppercase transform rotate-12 opacity-${Math.min(1, Math.max(0, dragX) / 100)} transition-opacity`}>
              Accept
            </div>
          </>
        )}

        <div className="flex justify-between items-start">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/80 backdrop-blur-sm shadow-sm ${
             currentRequest.urgency === 'high' ? 'text-nb-red' : 
             currentRequest.urgency === 'medium' ? 'text-nb-orange' : 'text-nb-teal'
          }`}>
            {currentRequest.urgency} Priority
          </span>
          <div className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-slate-400">
            <i className="fas fa-hand-holding-heart"></i>
          </div>
        </div>

        <div className="mt-4">
          <h3 className={`font-display text-4xl font-bold mb-2 ${
             currentRequest.urgency === 'high' ? 'text-rose-950' : 
             currentRequest.urgency === 'medium' ? 'text-orange-950' : 'text-teal-950'
          }`}>
            {currentRequest.item}
          </h3>

          {currentRequest.quantity && (
            <p className={`font-bold text-xl mb-1 ${
               currentRequest.urgency === 'high' ? 'text-rose-900' : 
               currentRequest.urgency === 'medium' ? 'text-orange-900' : 'text-teal-900'
            }`}>
              Qty: {currentRequest.quantity}
            </p>
          )}

          <p className={`font-medium text-lg ${
             currentRequest.urgency === 'high' ? 'text-rose-900/60' : 
             currentRequest.urgency === 'medium' ? 'text-orange-900/60' : 'text-teal-900/60'
          }`}>
            {currentRequest.foodBankName || 'Food Bank'}
          </p>

          {currentRequest.details && (
            <p className={`mt-2 text-sm line-clamp-2 ${
               currentRequest.urgency === 'high' ? 'text-rose-900/80' : 
               currentRequest.urgency === 'medium' ? 'text-orange-900/80' : 'text-teal-900/80'
            }`}>
              "{currentRequest.details}"
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
           <div className={`flex items-center text-sm font-bold px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm ${
             currentRequest.urgency === 'high' ? 'text-rose-900' : 
             currentRequest.urgency === 'medium' ? 'text-orange-900' : 'text-teal-900'
           }`}>
             <i className="far fa-clock mr-2"></i> Needed ASAP
           </div>
           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
             Swipe to decide
           </div>
        </div>
      </div>
    </div>
  );
}

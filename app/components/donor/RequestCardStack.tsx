"use client";

import { useState, useEffect, useRef } from 'react';
import { UrgentRequest } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';
import NeedDetailsModal from '../NeedDetailsModal';

interface RequestCardStackProps {
  requests: UrgentRequest[];
  onAccept: (request: UrgentRequest) => void;
  onDismiss: (request: UrgentRequest) => void;
}

export default function RequestCardStack({ requests, onAccept, onDismiss }: RequestCardStackProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedRequest, setSelectedRequest] = useState<UrgentRequest | null>(null);
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

  const getTheme = (urgency: string) => {
    switch (urgency) {
      case 'high': 
        return {
          bg: 'bg-nb-red-soft',
          text: 'text-rose-950',
          subtext: 'text-rose-800',
          pillBg: 'bg-white',
          pillText: 'text-nb-red',
          iconBg: 'bg-rose-400',
          bottomPill: 'bg-rose-200/50'
        };
      case 'medium':
        return {
          bg: 'bg-nb-orange-soft',
          text: 'text-orange-950',
          subtext: 'text-orange-800',
          pillBg: 'bg-white',
          pillText: 'text-nb-orange',
          iconBg: 'bg-orange-400',
          bottomPill: 'bg-orange-200/50'
        };
      case 'low':
        return {
          bg: 'bg-nb-teal-soft',
          text: 'text-teal-950',
          subtext: 'text-teal-800',
          pillBg: 'bg-white',
          pillText: 'text-nb-teal',
          iconBg: 'bg-teal-400',
          bottomPill: 'bg-teal-200/50'
        };
      default:
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-900',
          subtext: 'text-slate-600',
          pillBg: 'bg-white',
          pillText: 'text-slate-600',
          iconBg: 'bg-slate-300',
          bottomPill: 'bg-slate-200'
        };
    }
  };

  const theme = getTheme(currentRequest.urgency);
  const nextTheme = nextRequest ? getTheme(nextRequest.urgency) : null;

  return (
    <div ref={containerRef} className="relative h-80 w-full flex justify-center items-center perspective-1000">
      {/* Next Card (Background) */}
      {nextRequest && nextTheme && (
        <div
          className={`absolute w-full h-full rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between select-none overflow-hidden ${nextTheme.bg}`}
          style={getCardStyle(1, false)}
        >
           {/* Decorative Circle */}
           <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full ${nextTheme.iconBg} opacity-20`}></div>

           <div className="relative z-10 flex justify-between items-start">
            <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${nextTheme.pillBg} ${nextTheme.pillText}`}>
              {nextRequest.urgency === 'high' ? 'URGENT' : nextRequest.urgency} • 2km
            </span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/40`}>
               <i className={`fas fa-arrow-right ${nextTheme.text} opacity-50`}></i>
            </div>
          </div>
          
          <div className="relative z-10 mt-4">
            <h3 className={`font-display text-3xl font-bold mb-1 ${nextTheme.text}`}>{nextRequest.item}</h3>
            <p className={`font-medium ${nextTheme.subtext}`}>{nextRequest.foodBankName || 'Food Bank'}</p>
          </div>

          <div className="relative z-10">
             {/* Removed time requirement */}
          </div>
        </div>
      )}

      {/* Current Card (Top) */}
      <div
        ref={cardRef}
        className={`absolute w-full h-full rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between select-none touch-none overflow-hidden ${theme.bg}`}
        style={getCardStyle(0, true)}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Decorative Circle */}
        <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full ${theme.iconBg} opacity-20`}></div>

        {/* Swipe Indicators */}
        {isDragging && (
          <>
            <div className={`absolute top-8 left-8 border-4 border-nb-red text-nb-red rounded-xl px-4 py-2 font-display font-bold text-2xl uppercase transform -rotate-12 opacity-${Math.min(1, Math.abs(Math.min(0, dragX)) / 100)} transition-opacity z-50`}>
              Pass
            </div>
            <div className={`absolute top-8 right-8 border-4 border-nb-teal text-nb-teal rounded-xl px-4 py-2 font-display font-bold text-2xl uppercase transform rotate-12 opacity-${Math.min(1, Math.max(0, dragX) / 100)} transition-opacity z-50`}>
              Accept
            </div>
          </>
        )}

        <div className="relative z-10 flex justify-between items-start">
          <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${theme.pillBg} ${theme.pillText}`}>
            {currentRequest.urgency === 'high' ? 'URGENT' : currentRequest.urgency} • 2km
          </span>
          <div 
            className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-white/60 transition-colors group"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRequest(currentRequest);
            }}
          >
            <i className={`fas fa-arrow-right ${theme.text} transform transition-transform duration-300 group-hover:-rotate-45`}></i>
          </div>
        </div>

        <div className="relative z-10 mt-2">
          <h3 className={`font-display text-4xl font-bold mb-2 ${theme.text}`}>
            {currentRequest.item}
          </h3>

          <p className={`font-medium text-lg ${theme.subtext}`}>
            {currentRequest.foodBankName || 'Food Bank'}
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between">
           {/* Removed time requirement */}
        </div>
      </div>

      {selectedRequest && (
        <NeedDetailsModal 
          need={{
            id: selectedRequest.id!,
            title: selectedRequest.item,
            organizationName: selectedRequest.foodBankName || 'Food Bank',
            description: selectedRequest.details || '',
            urgency: selectedRequest.urgency,
            location: { address: '2km away' }, // Placeholder
            createdAt: selectedRequest.createdAt,
            quantity: selectedRequest.quantity
          }}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

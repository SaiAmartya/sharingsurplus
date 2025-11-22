import React from 'react';
import { Donation } from '@/types/schema';
import Link from 'next/link';

interface DonationCardProps {
  donation: Donation;
}

export default function DonationCard({ donation }: DonationCardProps) {
  const statusColors = {
    available: 'bg-nb-teal-soft text-nb-teal',
    claimed: 'bg-nb-blue-soft text-nb-blue',
    picked_up: 'bg-nb-orange-soft text-nb-orange',
    delivered: 'bg-nb-ink text-white',
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Link href={`/donor/donation/${donation.id}`} className="block">
      <div className="nb-card p-4 flex items-stretch hover:bg-slate-50 transition-colors cursor-pointer">
        <div className="p-4 flex-1">
          <h3 className="font-display text-lg font-bold text-nb-ink">{donation.title}</h3>
          <p className="text-slate-500 text-sm">Expires: {formatDate(donation.expiryDate)}</p>
          <div className="mt-3 flex justify-between items-center">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${statusColors[donation.status]}`}>
              {donation.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {donation.weight} {donation.weightUnit}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function DonorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-nb-bg relative overflow-hidden">
      {/* Decor for Donor Section */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-nb-blue-soft/40 rounded-bl-[100px] pointer-events-none z-0"></div>
      
      <main className="relative z-10 h-full">
        {children}
      </main>
    </div>
  );
}


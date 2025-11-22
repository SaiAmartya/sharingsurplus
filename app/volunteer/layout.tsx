export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-nb-bg relative overflow-hidden font-sans">
      {/* Main Content */}
      <main className="h-full relative z-10">
        {children}
      </main>
    </div>
  );
}


export default function LoadingDashboard() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-eid-card" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-eid-card" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="h-16 animate-pulse rounded-xl bg-eid-card" />
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 animate-pulse rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card"
          />
        ))}
      </div>
    </main>
  );
}

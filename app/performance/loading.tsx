export default function LoadingPerformance() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6">
      <div className="h-10 w-44 animate-pulse rounded-xl bg-eid-card" />
      <div className="mt-4 h-16 w-full animate-pulse rounded-2xl bg-eid-card" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-24 animate-pulse rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card"
          />
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-14 animate-pulse rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card"
          />
        ))}
      </div>
    </main>
  );
}

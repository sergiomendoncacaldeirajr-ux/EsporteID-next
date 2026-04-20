export default function LoadingMatchPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-4">
      <div className="mb-3 h-14 animate-pulse rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card" />
      <div className="grid gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-20 animate-pulse rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card"
          />
        ))}
      </div>
      <section className="mt-4 grid gap-2.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <article
            key={idx}
            className="h-24 animate-pulse rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card"
          />
        ))}
      </section>
    </main>
  );
}

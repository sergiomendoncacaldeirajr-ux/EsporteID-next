type ModalidadeKind = "individual" | "dupla" | "time";

export function ModalidadeGlyphIcon({ modalidade }: { modalidade: ModalidadeKind }) {
  if (modalidade === "individual") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
        <path
          fill="currentColor"
          d="M8 2.5a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5ZM3.75 12c0-1.8 1.9-2.75 4.25-2.75S12.25 10.2 12.25 12a.75.75 0 0 1-1.5 0c0-.63-.92-1.25-2.75-1.25s-2.75.62-2.75 1.25a.75.75 0 0 1-1.5 0Z"
        />
      </svg>
    );
  }
  if (modalidade === "time") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
        <circle cx="8" cy="4.2" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="4.2" cy="5.1" r="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="11.8" cy="5.1" r="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5.8 11.7c.2-1.3 1.15-2.1 2.2-2.1 1.05 0 2 .8 2.2 2.1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M2.7 11.7c.12-.95.86-1.55 1.5-1.55.62 0 1.36.6 1.48 1.55" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M10.3 11.7c.12-.95.86-1.55 1.5-1.55.62 0 1.36.6 1.48 1.55" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
      <circle cx="5.2" cy="4.4" r="1.35" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10.8" cy="4.4" r="1.35" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.2 11.7c.18-1.2 1.1-2 2-2s1.82.8 2 2" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M8.8 11.7c.18-1.2 1.1-2 2-2s1.82.8 2 2" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function SportGlyphIcon({ sportName }: { sportName: string | null | undefined }) {
  const n = String(sportName ?? "")
    .trim()
    .toLowerCase();
  const cls = "h-3 w-3 shrink-0";

  if (n.includes("fut")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path fill="currentColor" d="M8 1.8 5.8 3l-.6 2.4L6.9 7h2.2l1.7-1.6L10.2 3 8 1.8Zm-4.8 4 1.1-.5L5.8 6.7 5 8.8l-2.1.5L2 7.1l1.2-1.3Zm9.6 0L14 7.1l-.9 2.2-2.1-.5-.8-2.1 1.5-1.4 1.1.5ZM5.4 9.2h5.2l.8 2-1.7 2H6.3l-1.7-2 .8-2Z" />
      </svg>
    );
  }
  if (n.includes("basquete")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path
          fill="currentColor"
          d="M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 1.2c.9 0 1.7.2 2.4.5-.7.9-1.3 2.3-1.5 3.9H7.1C6.9 5.8 6.3 4.4 5.6 3.5A5 5 0 0 1 8 3Zm-3.3 1.2c.8.8 1.4 2 1.6 3.2H3.1c.1-1.2.7-2.3 1.6-3.2Zm6.6 0c.9.9 1.5 2 1.6 3.2H9.7c.2-1.2.8-2.4 1.6-3.2ZM3.1 8.6h3.2c-.2 1.3-.8 2.5-1.6 3.2a5 5 0 0 1-1.6-3.2Zm3.9 0h2c-.2 1.4-.7 2.7-1 3.4-.3-.7-.8-2-1-3.4Zm2.8 0h3.1a5 5 0 0 1-1.6 3.2c-.8-.8-1.4-2-1.5-3.2ZM5.6 12.5c.6-.8 1.1-1.9 1.4-3.1h2c.3 1.2.8 2.3 1.4 3.1A5 5 0 0 1 8 13c-.9 0-1.7-.2-2.4-.5Z"
        />
      </svg>
    );
  }
  if (n.includes("vôlei") || n.includes("volei")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path
          fill="currentColor"
          d="M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm3.7 1.9A5 5 0 0 1 8.6 7H3.1a5 5 0 0 1 1.2-2.5h4.3V3.3h3.1ZM2.9 8.2h5.3a5 5 0 0 1-3.4 4A5 5 0 0 1 3 9.6h3.3V8.2H2.9Zm6.3 0h3.9a5 5 0 0 1-2.6 3.6V9.6H9.2V8.2Z"
        />
      </svg>
    );
  }
  if (n.includes("beach")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path
          fill="currentColor"
          d="M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 1.2a5 5 0 0 1 0 10c.2-2.3 1.7-4.2 4-5A5.4 5.4 0 0 0 8 3ZM4 8a5.4 5.4 0 0 0 4 5 5.4 5.4 0 0 1-4-5Z"
        />
      </svg>
    );
  }
  if (n.includes("hand")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <circle cx="8" cy="8" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 2.3v11.4M2.3 8h11.4M4.2 4.2c1.5 1 2.5 2.3 3 3.8m4.6-3.8c-1.5 1-2.5 2.3-3 3.8" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("tênis de mesa") || n.includes("tenis de mesa")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="M4.7 3.2a3.2 3.2 0 1 1 2.7 5.8L6 11.1l-.9-.5 1.4-2.2A3.2 3.2 0 0 1 4.7 3.2Z" fill="currentColor" />
        <circle cx="12.2" cy="10.8" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (n.includes("padel")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="M5.2 2.4A3.4 3.4 0 0 1 9.8 6l-1 2.2-3.2 1.5L3.7 8 2.6 5.8a3.4 3.4 0 0 1 2.6-3.4Z" fill="currentColor" />
        <circle cx="12.3" cy="11.6" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (n.includes("pickle")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="M4.9 2.4A3.4 3.4 0 0 1 9.5 6L8.6 8.1l-3.2 1.6L3.4 8 2.4 5.8a3.4 3.4 0 0 1 2.5-3.4Z" fill="currentColor" />
        <circle cx="12.2" cy="11.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12.2" cy="11.5" r=".35" fill="currentColor" />
      </svg>
    );
  }
  if (n.includes("tênis") || n.includes("tenis")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path
          fill="currentColor"
          d="M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 1.2a5 5 0 0 1 0 10c.2-2.3 1.7-4.2 4-5A5.4 5.4 0 0 0 8 3ZM4 8a5.4 5.4 0 0 0 4 5 5.4 5.4 0 0 1-4-5Z"
        />
      </svg>
    );
  }
  if (n.includes("badminton")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="M3 12.8 8.9 7l2.8.3-.4 2.7L5.5 16l-2.5-3.2Z" fill="currentColor" />
        <path d="m9.7 6.3 2-2m-1.3 2.8 2-2m-1.2 2.8 2-2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("jiu")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="M5.4 2.6h5.2l1.4 4.1-2.2 1.1L8.7 5.7H7.3L6.2 7.8 4 6.7l1.4-4.1Z" fill="currentColor" />
        <path d="M6.1 8.4h3.8l-.6 3.8H6.7l-.6-3.8Zm-1.5 4.8h6.8v1.2H4.6z" fill="currentColor" />
      </svg>
    );
  }
  if (n.includes("futevôlei") || n.includes("futevolei")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <circle cx="5.2" cy="5.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7.2 6.6h6.2M7.2 8.6h6.2M7.2 10.6h6.2M10.2 5.2v6.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("corrida")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="m2.3 11.3 4.2-3.6h2.1l1.5 1.7h2.8v1.5H9.5l-1.4-1.6-4 3.4H2.3Z" fill="currentColor" />
        <path d="M6.3 7.5 8 4.8h2.4l1.4 1.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("cicl")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <circle cx="4.1" cy="11.2" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="12" cy="11.2" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M4.1 11.2 7 6.4h2l3 4.8M6.2 6.4h3.5M8.3 3.5h1.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("nata")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <circle cx="5.2" cy="4.3" r="1.3" fill="currentColor" />
        <path d="M3.2 7.6c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1M2 10.4c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("muscula")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <rect x="1.8" y="6.4" width="2.2" height="3.2" rx=".6" fill="currentColor" />
        <rect x="12" y="6.4" width="2.2" height="3.2" rx=".6" fill="currentColor" />
        <rect x="4.4" y="6.8" width="7.2" height="2.4" rx=".8" fill="currentColor" />
      </svg>
    );
  }
  if (n.includes("cross")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="M8 2.2a3.3 3.3 0 0 0-3.3 3.3v1.1H3.6a1.8 1.8 0 0 0-1.8 1.8v1.2a3.8 3.8 0 0 0 3.8 3.8h4.8a3.8 3.8 0 0 0 3.8-3.8V8.4a1.8 1.8 0 0 0-1.8-1.8h-1.1V5.5A3.3 3.3 0 0 0 8 2.2Z" fill="currentColor" />
      </svg>
    );
  }
  if (n.includes("yoga")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <circle cx="8" cy="3.8" r="1.5" fill="currentColor" />
        <path d="M4.4 7.2c1 1 2.2 1.6 3.6 1.6s2.6-.6 3.6-1.6M3.2 12.6a4.8 2.1 0 0 1 9.6 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("surf")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="M3 12.2c1.4-2.6 3-5.1 5.8-8.2l2.2.5c-2.2 3.4-4.2 6.2-6.9 8.9L3 12.2Z" fill="currentColor" />
        <path d="M9.8 11.8c.9 0 1.6-.4 2.2-1.1.3.9 1.1 1.6 2 1.8" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("skate")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <path d="M2.4 9.8h9.8c.8 0 1.4-.5 1.6-1.2l.2-.8H4.3c-.5 0-1 .2-1.3.6l-.6.8Z" fill="currentColor" />
        <circle cx="4.6" cy="12.1" r="1.2" fill="currentColor" />
        <circle cx="11.2" cy="12.1" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (n.includes("pilates")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cls}>
        <circle cx="9.4" cy="4.2" r="1.3" fill="currentColor" />
        <path d="M4 10.6h5.8l1.8-2.2M4 10.6l2.2 2.3M7.1 10.6l.9 3.1M10.2 10.6l1.3 2.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cls}>
      <path
        fill="currentColor"
        d="M5.75 2a.75.75 0 0 0-.67.41l-1.5 3A.75.75 0 0 0 4.25 6.5h.62l.58 2.76a2.58 2.58 0 1 0 5.1 0l.58-2.76h.62a.75.75 0 0 0 .67-1.09l-1.5-3A.75.75 0 0 0 10.25 2h-4.5Zm.73 1.5h3.04l.75 1.5H5.73l.75-1.5ZM7 6.5h2l-.55 2.6a1.08 1.08 0 1 1-.9 0L7 6.5Z"
      />
    </svg>
  );
}

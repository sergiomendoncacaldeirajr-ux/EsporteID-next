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
  if (n.includes("fut")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
        <path fill="currentColor" d="M8 1.8 5.8 3l-.6 2.4L6.9 7h2.2l1.7-1.6L10.2 3 8 1.8Zm-4.8 4 1.1-.5L5.8 6.7 5 8.8l-2.1.5L2 7.1l1.2-1.3Zm9.6 0L14 7.1l-.9 2.2-2.1-.5-.8-2.1 1.5-1.4 1.1.5ZM5.4 9.2h5.2l.8 2-1.7 2H6.3l-1.7-2 .8-2Z" />
      </svg>
    );
  }
  if (n.includes("basquete")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
        <path
          fill="currentColor"
          d="M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 1.2c.9 0 1.7.2 2.4.5-.7.9-1.3 2.3-1.5 3.9H7.1C6.9 5.8 6.3 4.4 5.6 3.5A5 5 0 0 1 8 3Zm-3.3 1.2c.8.8 1.4 2 1.6 3.2H3.1c.1-1.2.7-2.3 1.6-3.2Zm6.6 0c.9.9 1.5 2 1.6 3.2H9.7c.2-1.2.8-2.4 1.6-3.2ZM3.1 8.6h3.2c-.2 1.3-.8 2.5-1.6 3.2a5 5 0 0 1-1.6-3.2Zm3.9 0h2c-.2 1.4-.7 2.7-1 3.4-.3-.7-.8-2-1-3.4Zm2.8 0h3.1a5 5 0 0 1-1.6 3.2c-.8-.8-1.4-2-1.5-3.2ZM5.6 12.5c.6-.8 1.1-1.9 1.4-3.1h2c.3 1.2.8 2.3 1.4 3.1A5 5 0 0 1 8 13c-.9 0-1.7-.2-2.4-.5Z"
        />
      </svg>
    );
  }
  if (n.includes("vôlei") || n.includes("volei")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
        <path
          fill="currentColor"
          d="M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm3.7 1.9A5 5 0 0 1 8.6 7H3.1a5 5 0 0 1 1.2-2.5h4.3V3.3h3.1ZM2.9 8.2h5.3a5 5 0 0 1-3.4 4A5 5 0 0 1 3 9.6h3.3V8.2H2.9Zm6.3 0h3.9a5 5 0 0 1-2.6 3.6V9.6H9.2V8.2Z"
        />
      </svg>
    );
  }
  if (n.includes("beach")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
        <path
          fill="currentColor"
          d="M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 1.2a5 5 0 0 1 0 10c.2-2.3 1.7-4.2 4-5A5.4 5.4 0 0 0 8 3ZM4 8a5.4 5.4 0 0 0 4 5 5.4 5.4 0 0 1-4-5Z"
        />
      </svg>
    );
  }
  if (n.includes("tênis") || n.includes("tenis") || n.includes("padel") || n.includes("pickle")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
        <path
          fill="currentColor"
          d="M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 1.2a5 5 0 0 1 0 10c.2-2.3 1.7-4.2 4-5A5.4 5.4 0 0 0 8 3ZM4 8a5.4 5.4 0 0 0 4 5 5.4 5.4 0 0 1-4-5Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
      <path
        fill="currentColor"
        d="M5.75 2a.75.75 0 0 0-.67.41l-1.5 3A.75.75 0 0 0 4.25 6.5h.62l.58 2.76a2.58 2.58 0 1 0 5.1 0l.58-2.76h.62a.75.75 0 0 0 .67-1.09l-1.5-3A.75.75 0 0 0 10.25 2h-4.5Zm.73 1.5h3.04l.75 1.5H5.73l.75-1.5ZM7 6.5h2l-.55 2.6a1.08 1.08 0 1 1-.9 0L7 6.5Z"
      />
    </svg>
  );
}

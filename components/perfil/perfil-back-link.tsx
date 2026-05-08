"use client";

import { useRouter } from "next/navigation";

type Props = {
  href: string;
  label?: string;
  className?: string;
};

export function PerfilBackLink({ href, label = "Voltar", className = "" }: Props) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    const screen = document.querySelector<HTMLElement>(".eid-profile-edit-screen");
    if (!screen) {
      router.push(href);
      return;
    }
    const anim = screen.animate(
      [
        { transform: "translateX(0) scale(1)", opacity: "1" },
        { transform: "translateX(52%) scale(0.93)", opacity: "0" },
      ],
      { duration: 240, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }
    );
    anim.finished.then(() => router.push(href));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`eid-full-top-btn ${className}`}
      aria-label={label}
    >
      {/* Chevron esquerdo */}
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span>{label}</span>
    </button>
  );
}

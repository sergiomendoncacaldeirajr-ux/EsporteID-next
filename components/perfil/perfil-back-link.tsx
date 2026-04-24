import Link from "next/link";

type Props = {
  href: string;
  label?: string;
  className?: string;
};

export function PerfilBackLink({ href, label = "Voltar", className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`relative z-[2] inline-flex items-center gap-1 text-xs font-medium text-eid-text-secondary transition hover:text-eid-primary-300 ${className}`}
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

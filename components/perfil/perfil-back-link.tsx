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
      className={`eid-full-top-btn relative z-[2] ${className}`}
    >
      <span aria-hidden className="text-[11px] leading-none">←</span>
      <span>{label}</span>
    </Link>
  );
}

import Link from "next/link";

type Props = {
  href: string;
  label?: string;
};

export function PerfilBackLink({ href, label = "Voltar" }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-eid-text-secondary transition hover:text-eid-primary-300"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

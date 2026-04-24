import Link from "next/link";
import {
  EID_LOGO_AUTH_MARK_HEIGHT,
  EID_LOGO_AUTH_MARK_SRC,
  EID_LOGO_AUTH_MARK_WIDTH,
} from "@/lib/branding";

/** Barra superior (termos, privacidade, etc.) — mesma marca transparente do fluxo pré-login. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-eid-bg/90 backdrop-blur-md supports-[backdrop-filter]:bg-eid-bg/75">
      <div className="mx-auto flex h-14 max-w-4xl items-center px-4 sm:h-[3.75rem] sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center py-2 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-eid-bg"
        >
          <img
            src={EID_LOGO_AUTH_MARK_SRC}
            alt="EsporteID"
            width={EID_LOGO_AUTH_MARK_WIDTH}
            height={EID_LOGO_AUTH_MARK_HEIGHT}
            className="h-9 w-auto max-h-10 max-w-[min(44vw,200px)] object-contain object-left sm:h-10"
            decoding="async"
          />
        </Link>
      </div>
    </header>
  );
}

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Country, Value } from "react-phone-number-input";
import { isPossiblePhoneNumber } from "react-phone-number-input";
import { LogoFull } from "@/components/brand/logo-full";
import { EID_PHONE_LABELS } from "@/lib/eid-phone-labels";
import { createClient } from "@/lib/supabase/client";
import { getSignupEmailRedirectTo } from "@/lib/auth/email-redirects";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import "react-phone-number-input/style.css";
import "./cadastro-register.css";

const PhoneInput = dynamic(() => import("react-phone-number-input"), {
  ssr: false,
});

function eiWhatsappValido(raw: string | undefined): boolean {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15;
}

function safeNext(raw: string | null): string | null {
  const n = (raw ?? "").trim();
  if (!n || !n.startsWith("/") || n.startsWith("//")) return null;
  return n;
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  );
}

function IconEnvelope({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
      />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
      />
    </svg>
  );
}

function IconGender({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M17.5 9c0 3.04-2.46 5.5-5.5 5.5S6.5 12.04 6.5 9 8.96 3.5 12 3.5 17.5 5.96 17.5 9zM2 17l4-4 1.5 1.5L3.5 19H2v-2zm20 0v2h-1.5l-4-4.5L18 15l4 4z"
      />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
      />
    </svg>
  );
}

/** Ícone WhatsApp (verde oficial) — só para identificar o campo, não é cor da marca EsporteID. */
function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={22} height={22} aria-hidden>
      <path
        fill="#25D366"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function IconEye({ slash }: { slash?: boolean }) {
  if (slash) {
    return (
      <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
        <path
          fill="currentColor"
          d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  );
}

function IconLocationArrow() {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} className="inline shrink-0" aria-hidden>
      <path fill="currentColor" d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
    </svg>
  );
}

export function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [genero, setGenero] = useState("");
  const [whatsapp, setWhatsapp] = useState<Value | undefined>(undefined);
  const [phoneCountry, setPhoneCountry] = useState<Country>("BR");
  const [localizacao, setLocalizacao] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Cores via tokens CSS (`globals.css`) — azul estrutura, laranja ação. */
  const focusWithinBg = "focus-within:bg-eid-card";

  function inputGroupClass() {
    return `eid-focus-ring flex h-[46px] items-center rounded-[14px] border-[1.5px] border-transparent px-[15px] transition`;
  }

  function inputGroupStyle(): React.CSSProperties {
    return {
      background: "var(--eid-field-bg)",
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailNorm = email.trim().toLowerCase();
    const nomeTrim = nome.trim();
    const locTrim = localizacao.trim();

    if (!nomeTrim) {
      setError("Informe seu nome completo.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!genero || !["Masculino", "Feminino", "Outro"].includes(genero)) {
      setError("Selecione uma opção de gênero válida.");
      return;
    }
    const wa = typeof whatsapp === "string" ? whatsapp : "";
    if (!wa || !eiWhatsappValido(wa) || !isPossiblePhoneNumber(wa)) {
      setError(
        "Informe um número de WhatsApp válido com código do país (obrigatório para contato na plataforma)."
      );
      return;
    }
    if (!locTrim) {
      setError("Informe cidade e estado (Cidade - Estado).");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const meta: Record<string, string> = {
      nome: nomeTrim,
      genero,
      whatsapp: wa,
      localizacao: locTrim,
    };
    if (lat != null && lng != null) {
      meta.lat = String(lat);
      meta.lng = String(lng);
    }

    // Confirmação por e-mail: fluxo PKCE em /auth/callback (URL permitida no painel do provedor de auth).
    const { data, error: err } = await supabase.auth.signUp({
      email: emailNorm,
      password,
      options: {
        data: meta,
        ...(origin
          ? {
              emailRedirectTo: getSignupEmailRedirectTo(origin),
            }
          : {}),
      },
    });
    setLoading(false);

    if (err) {
      setError(
        err.message.includes("already registered") || err.message.includes("User already registered")
          ? "Este e-mail já está cadastrado."
          : err.message
      );
      return;
    }
    if (data.session) {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      let dest = "/onboarding";
      if (u) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("termos_aceitos_em, perfil_completo")
          .eq("id", u.id)
          .maybeSingle();
        dest = getPostAuthRedirect(
          {
            termosAceitos: !!profile?.termos_aceitos_em,
            perfilCompleto: !!profile?.perfil_completo,
          },
          next
        );
      }
      router.refresh();
      router.push(dest);
      return;
    }
    router.push(
      `/verificar-codigo?email=${encodeURIComponent(emailNorm)}${
        next ? `&next=${encodeURIComponent(next)}` : ""
      }`
    );
  }

  function useCurrentLocation() {
    const locInput = document.getElementById("cad-localizacao") as HTMLInputElement | null;
    if (locInput) {
      locInput.placeholder = "Buscando...";
    }
    if (!navigator.geolocation) {
      if (locInput) locInput.placeholder = "Cidade - Estado";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const la = p.coords.latitude;
        const ln = p.coords.longitude;
        setLat(la);
        setLng(ln);
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json`,
            { headers: { Accept: "application/json" } }
          );
          const d = (await r.json()) as {
            address?: { city?: string; town?: string; village?: string; state?: string };
          };
          const cidade =
            d.address?.city || d.address?.town || d.address?.village || "";
          const estado = d.address?.state || "";
          const v =
            cidade && estado ? `${cidade} - ${estado}` : cidade || estado || "";
          setLocalizacao(v);
        } catch {
          /* ignore */
        } finally {
          if (locInput) locInput.placeholder = "Cidade - Estado";
        }
      },
      () => {
        if (locInput) locInput.placeholder = "Cidade - Estado";
      }
    );
  }

  return (
    <main className="eid-auth-bg flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-14 text-eid-fg sm:px-6 sm:pt-7">
      <div className="w-full max-w-[340px] pb-6">
        <LogoFull priority className="mb-5 mt-1" />

        <div className="eid-auth-card p-5">
          <h2 className="mb-[15px] mt-0 text-center text-[14px] font-extrabold uppercase tracking-[1px] text-eid-primary-500">
            Criar Conta
          </h2>
          <p className="-mt-2 mb-4 text-center text-[12px] leading-snug text-eid-text-muted">
            Cadastro único. Depois, no onboarding, você escolhe se é atleta, espaço, organizador
            etc.
          </p>

          <form onSubmit={handleSubmit} className="m-0">
            {error && (
              <p
                className="mb-[15px] rounded-xl border border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.1)] px-2.5 py-2.5 text-center text-[12px] text-[#ff6b6b]"
                role="alert"
              >
                {error}
              </p>
            )}

            <div
              className={`${inputGroupClass()} mb-2 text-eid-fg ${focusWithinBg}`}
              style={inputGroupStyle()}
            >
              <span className="text-eid-primary-500">
                <IconUser />
              </span>
              <input
                type="text"
                name="nome"
                placeholder="Nome completo"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent pl-2.5 text-[15px] text-eid-fg outline-none placeholder:text-eid-text-secondary/85"
              />
            </div>

            <div
              className={`${inputGroupClass()} mb-2 text-eid-fg ${focusWithinBg}`}
              style={inputGroupStyle()}
            >
              <span className="text-eid-primary-500">
                <IconEnvelope />
              </span>
              <input
                type="email"
                name="email"
                id="cad-email"
                placeholder="E-mail"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent pl-2.5 text-[15px] text-eid-fg outline-none placeholder:text-eid-text-secondary/85"
              />
            </div>

            <div
              className={`${inputGroupClass()} mb-2 text-eid-fg ${focusWithinBg}`}
              style={inputGroupStyle()}
            >
              <span className="text-eid-primary-500">
                <IconLock />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="senha"
                id="cad-password"
                placeholder="Crie uma senha"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent pl-2.5 text-[15px] text-eid-fg outline-none placeholder:text-eid-text-secondary/85"
              />
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-2.5 text-eid-text-secondary"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                <IconEye slash={showPassword} />
              </button>
            </div>

            <div
              className={`${inputGroupClass()} mb-2 text-eid-fg ${focusWithinBg}`}
              style={inputGroupStyle()}
            >
              <span className="text-eid-primary-500">
                <IconGender />
              </span>
              <select
                name="genero"
                required
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                className={`eid-select min-w-0 flex-1 cursor-pointer border-0 pl-2.5 text-[15px] outline-none ${genero ? "text-eid-fg" : "text-eid-text-secondary"}`}
              >
                <option value="" disabled>
                  Gênero
                </option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="mb-1.5">
              <label
                htmlFor="cad-whatsapp"
                className="mb-1 block text-[13px] font-bold leading-tight text-eid-fg"
              >
                WhatsApp — número do celular
              </label>
              <p className="mb-1.5 text-[12px] leading-snug text-eid-text-secondary">
                Informe o número completo do WhatsApp. Abra a lista ao lado da bandeira para escolher
                o país (nome completo na lista) e digite o número com código de área local.
              </p>
            </div>
            <div
              className={`${inputGroupClass()} mb-1 !px-3 text-eid-fg ${focusWithinBg}`}
              style={inputGroupStyle()}
            >
              <span className="shrink-0" title="WhatsApp" aria-hidden>
                <IconWhatsApp />
              </span>
              <PhoneInput
                international
                defaultCountry="BR"
                value={whatsapp}
                onChange={setWhatsapp}
                onCountryChange={(c) => setPhoneCountry((c ?? "BR") as Country)}
                labels={EID_PHONE_LABELS}
                locales="pt-BR"
                className="cadastro-phone"
                numberInputProps={{
                  id: "cad-whatsapp",
                  name: "whatsapp_input",
                  required: true,
                  autoComplete: "tel",
                  inputMode: "tel",
                  "aria-label": "Número de WhatsApp (internacional)",
                }}
                countrySelectProps={{
                  className: "cadastro-country-select",
                  "aria-label": "País e código de chamada",
                }}
                style={
                  {
                    "--PhoneInput-color--text": "var(--eid-fg)",
                    "--PhoneInputCountrySelect-marginRight": "0.35rem",
                  } as React.CSSProperties
                }
              />
            </div>
            <p className="mb-2 text-[12px] leading-snug text-eid-text-secondary" aria-live="polite">
              País:{" "}
              <span className="font-semibold text-eid-fg">
                {(EID_PHONE_LABELS as Record<string, string | undefined>)[phoneCountry] ??
                  phoneCountry}
              </span>
            </p>

            <div
              className={`${inputGroupClass()} mb-2 text-eid-fg ${focusWithinBg}`}
              style={inputGroupStyle()}
            >
              <span className="text-eid-primary-500">
                <IconMapPin />
              </span>
              <input
                type="text"
                id="cad-localizacao"
                name="localizacao"
                placeholder="Cidade - Estado"
                required
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent pl-2.5 text-[15px] text-eid-fg outline-none placeholder:text-eid-text-secondary/85"
              />
            </div>

            <button
              type="button"
              className="mb-3 w-full cursor-pointer rounded-xl border-[1.5px] border-dashed border-eid-primary-500/35 bg-eid-primary-500/10 py-2.5 text-[11px] font-bold text-eid-primary-500 transition hover:bg-eid-primary-500/15 active:scale-[0.98]"
              onClick={useCurrentLocation}
            >
              <span className="inline-flex items-center justify-center gap-1">
                <IconLocationArrow /> Usar localização atual
              </span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex h-[50px] w-full cursor-pointer items-center justify-center rounded-xl border-0 bg-eid-action-500 text-[14px] font-extrabold uppercase text-white transition hover:bg-eid-action-400 active:scale-[0.97] active:bg-eid-action-600 active:opacity-95 disabled:opacity-60"
            >
              {loading ? (
                <span
                  className="inline-block h-5 w-5 animate-spin rounded-full border-[3px] border-white border-t-transparent"
                  aria-hidden
                />
              ) : (
                <span>Cadastrar Agora</span>
              )}
            </button>
          </form>

          <p className="mt-[15px] text-center text-[13px] text-eid-text-muted">
            Já tem conta?{" "}
            <Link href="/login" className="font-bold text-eid-action-500 no-underline hover:text-eid-action-400">
              Fazer Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

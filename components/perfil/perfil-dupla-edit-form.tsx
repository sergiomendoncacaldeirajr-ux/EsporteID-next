"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { atualizarDuplaRegistro, type DuplaActionState } from "@/app/perfil-dupla/actions";
import { contaEditarFormacaoTimeHref } from "@/lib/routes/conta";
import { useUsernameCheck } from "@/lib/hooks/use-username-check";

const initial: DuplaActionState = { ok: false, message: "" };

export function PerfilDuplaEditForm({
  duplaId,
  username,
  bio,
  timeFormacaoRadarId,
  variant = "inline",
}: {
  duplaId: number;
  username: string | null;
  bio: string | null;
  /** Time tipo dupla no radar, se existir — cidade da formação é fixa na criação. */
  timeFormacaoRadarId?: number | null;
  variant?: "inline" | "page";
}) {
  const [state, formAction, pending] = useActionState(atualizarDuplaRegistro, initial);
  const [usernameVal, setUsernameVal] = useState(username ?? "");
  const usernameStatus = useUsernameCheck(usernameVal, "duplas", duplaId);

  const blocoAjuda = (
    <p className="mt-2 text-[10px] leading-relaxed text-eid-text-secondary">
      Só quem criou o registro da dupla altera <strong className="text-eid-fg">@username e bio desta dupla</strong>. Não
      existe cidade própria neste cadastro — buscas por região usam o <strong className="text-eid-fg">endereço pessoal</strong>{" "}
      de cada atleta (edite no seu perfil). Se vocês têm uma <strong className="text-eid-fg">formação no radar</strong>, a{" "}
      <strong className="text-eid-fg">cidade da formação não pode ser trocada</strong> depois de criada; para mudar de
      cidade nesse caso, é necessário{" "}
      <Link href="/times" className="font-semibold text-eid-primary-300 underline">
        criar uma nova formação
      </Link>
      .
    </p>
  );

  const linkFormacao =
    timeFormacaoRadarId != null ? (
      <p className="mt-2 text-[10px] text-eid-text-secondary">
        Perfil da formação no radar:{" "}
        <Link href={`/perfil-time/${timeFormacaoRadarId}`} className="font-semibold text-eid-primary-300 underline">
          abrir página pública
        </Link>
        {" · "}
        <Link href={contaEditarFormacaoTimeHref(timeFormacaoRadarId)} className="font-semibold text-eid-primary-300 underline">
          editar dados da formação
        </Link>{" "}
        (localização fixa lá).
      </p>
    ) : null;

  const formInner = (
    <form action={formAction} className={`grid gap-2 ${variant === "page" ? "mt-4" : "mt-3"}`}>
        <input type="hidden" name="dupla_id" value={duplaId} />
        <div>
          <input
            name="username"
            value={usernameVal}
            onChange={(e) =>
              setUsernameVal(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 24)
              )
            }
            placeholder="@username da dupla (opcional)"
            className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
          />
          {usernameVal.trim() ? (
            <div className="mt-1 flex items-center gap-1.5 px-1 text-[11px]">
              {usernameStatus === "checking" && (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-eid-text-secondary border-t-transparent" />
                  <span className="text-eid-text-secondary">Verificando...</span>
                </>
              )}
              {usernameStatus === "available" && (
                <>
                  <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
                  <span className="text-emerald-400">@{usernameVal.trim()} disponível</span>
                </>
              )}
              {usernameStatus === "taken" && (
                <>
                  <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                  <span className="text-amber-400">@{usernameVal.trim()} já está em uso — escolha outro</span>
                </>
              )}
              {(usernameStatus === "invalid" || usernameStatus === "idle") && (
                <span className="text-eid-text-secondary">3–24 chars: a-z, 0-9 e _</span>
              )}
            </div>
          ) : null}
        </div>
        <textarea
          name="bio"
          rows={3}
          defaultValue={bio ?? ""}
          placeholder="Bio da dupla"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
        <div className="flex justify-start">
          <button
            type="submit"
            disabled={pending || usernameStatus === "taken"}
            className="eid-btn-primary !min-h-[48px] rounded-xl px-6 py-3 !text-lg font-bold leading-snug sm:!min-h-[50px] sm:!text-xl"
          >
            {pending ? "Salvando..." : "Salvar dupla"}
          </button>
        </div>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
        ) : null}
    </form>
  );

  if (variant === "page") {
    return (
      <section className="overflow-hidden rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/8 text-left">
        <div className="flex items-center justify-between border-b border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-2">
          <h2 className="text-sm font-semibold text-eid-primary-200">Dupla registrada (@ e bio)</h2>
          <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/14 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-200">
            Editar
          </span>
        </div>
        <div className="p-4 sm:p-5">
          {blocoAjuda}
          {linkFormacao}
          {formInner}
        </div>
      </section>
    );
  }

  return (
    <details className="mt-3 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/8 p-3 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-eid-primary-200">Editar perfil da dupla (@ e bio)</summary>
      {blocoAjuda}
      {linkFormacao}
      {formInner}
    </details>
  );
}

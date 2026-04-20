"use client";

import Link from "next/link";
import { useActionState } from "react";
import { atualizarDuplaRegistro, type DuplaActionState } from "@/app/perfil-dupla/actions";

const initial: DuplaActionState = { ok: false, message: "" };

export function PerfilDuplaEditForm({
  duplaId,
  username,
  bio,
  timeFormacaoRadarId,
}: {
  duplaId: number;
  username: string | null;
  bio: string | null;
  /** Time tipo dupla no radar, se existir — cidade da formação é fixa na criação. */
  timeFormacaoRadarId?: number | null;
}) {
  const [state, formAction, pending] = useActionState(atualizarDuplaRegistro, initial);

  return (
    <details className="mt-3 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/8 p-3 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-eid-primary-200">Editar perfil da dupla (@ e bio)</summary>
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
      {timeFormacaoRadarId ? (
        <p className="mt-2 text-[10px] text-eid-text-secondary">
          Perfil da formação no radar:{" "}
          <Link
            href={`/perfil-time/${timeFormacaoRadarId}`}
            className="font-semibold text-eid-primary-300 underline"
          >
            abrir equipe/dupla
          </Link>{" "}
          (localização fixa lá).
        </p>
      ) : null}
      <form action={formAction} className="mt-3 grid gap-2">
        <input type="hidden" name="dupla_id" value={duplaId} />
        <input
          name="username"
          defaultValue={username ?? ""}
          placeholder="@username da dupla (opcional)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
        <textarea
          name="bio"
          rows={3}
          defaultValue={bio ?? ""}
          placeholder="Bio da dupla"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
        <button type="submit" disabled={pending} className="eid-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
          {pending ? "Salvando..." : "Salvar dupla"}
        </button>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
        ) : null}
      </form>
    </details>
  );
}

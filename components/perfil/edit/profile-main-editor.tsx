"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfileMainAction } from "@/app/editar/actions";

type Props = {
  initial: {
    nome: string;
    username: string;
    localizacao: string;
    alturaCm: number | null;
    pesoKg: number | null;
    lado: string | null;
    bio: string;
    estiloJogo: string;
  };
};

export function ProfileMainEditor({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [nome, setNome] = useState(initial.nome);
  const [username, setUsername] = useState(initial.username);
  const [localizacao, setLocalizacao] = useState(initial.localizacao);
  const [alturaCm, setAlturaCm] = useState(initial.alturaCm ? String(initial.alturaCm) : "");
  const [pesoKg, setPesoKg] = useState(initial.pesoKg ? String(initial.pesoKg) : "");
  const [lado, setLado] = useState(initial.lado ?? "");
  const [bio, setBio] = useState(initial.bio);
  const [estiloJogo, setEstiloJogo] = useState(initial.estiloJogo);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveProfileMainAction(fd);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setMessage("Perfil atualizado com sucesso.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="eid-surface-panel rounded-2xl p-3 sm:p-4">
      {message ? (
        <p className="mb-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-xs text-eid-fg">
          {message}
        </p>
      ) : null}
      <div className="grid gap-3">
        <input
          name="nome"
          required
          value={nome}
          onChange={(ev) => setNome(ev.target.value)}
          placeholder="Nome completo"
          className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <input
          name="username"
          value={username}
          onChange={(ev) =>
            setUsername(
              ev.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "")
                .slice(0, 24)
            )
          }
          placeholder="@usuario"
          className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <input
          name="localizacao"
          required
          value={localizacao}
          onChange={(ev) => setLocalizacao(ev.target.value)}
          placeholder="Cidade / Estado"
          className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            name="altura_cm"
            min={50}
            max={260}
            value={alturaCm}
            onChange={(ev) => setAlturaCm(ev.target.value)}
            placeholder="Altura (cm)"
            className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
          />
          <input
            type="number"
            name="peso_kg"
            min={20}
            max={300}
            value={pesoKg}
            onChange={(ev) => setPesoKg(ev.target.value)}
            placeholder="Peso (kg)"
            className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
          />
        </div>
        <select
          name="lado"
          value={lado}
          onChange={(ev) => setLado(ev.target.value)}
          className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
        >
          <option value="">Mão dominante</option>
          <option value="Destro">Destro</option>
          <option value="Canhoto">Canhoto</option>
          <option value="Ambos">Ambidestro</option>
        </select>
        <input
          name="estilo_jogo"
          value={estiloJogo}
          onChange={(ev) => setEstiloJogo(ev.target.value)}
          placeholder="Estilo de jogo"
          className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <textarea
          name="bio"
          value={bio}
          onChange={(ev) => setBio(ev.target.value)}
          placeholder="Bio"
          rows={3}
          className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-eid-fg disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}


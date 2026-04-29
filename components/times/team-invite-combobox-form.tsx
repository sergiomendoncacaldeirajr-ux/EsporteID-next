"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import type { TeamActionState } from "@/app/times/actions";
import { EidInviteButton } from "@/components/ui/eid-invite-button";

type FormActionProp = NonNullable<ComponentProps<"form">["action"]>;

type AtletaSuggest = {
  id: string;
  title: string;
  subtitle: string | null;
};

export function TeamInviteComboboxForm({
  timeId,
  excludeUserIds,
  inviteAction,
  invitePending,
  inviteState,
  submitLabel = "Adicionar",
  variant = "grid",
  inputClassName,
  prefillSiblingActive = false,
}: {
  timeId: number;
  excludeUserIds: string[];
  inviteAction: FormActionProp;
  invitePending: boolean;
  inviteState: TeamActionState;
  submitLabel?: string;
  variant?: "grid" | "stack";
  inputClassName?: string;
  prefillSiblingActive?: boolean;
}) {
  const router = useRouter();
  const excluded = useMemo(() => new Set(excludeUserIds.filter(Boolean)), [excludeUserIds]);

  const [inviteQuery, setInviteQuery] = useState("");
  const [pickedUserId, setPickedUserId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AtletaSuggest[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    const q = inviteQuery.trim();
    if (pickedUserId || q.length < 3) {
      if (q.length < 3) {
        setSuggestions([]);
        setSuggestOpen(false);
      }
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setSuggestLoading(true);
        try {
          const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}&scope=atletas`, {
            credentials: "same-origin",
          });
          const j = (await r.json()) as { ok?: boolean; items?: AtletaSuggest[] };
          if (cancelled) return;
          const raw = Array.isArray(j.items) ? j.items : [];
          const filtered = raw.filter((it) => it.id && !excluded.has(it.id));
          setSuggestions(filtered);
          setSuggestOpen(filtered.length > 0);
        } catch {
          if (!cancelled) {
            setSuggestions([]);
            setSuggestOpen(false);
          }
        } finally {
          if (!cancelled) setSuggestLoading(false);
        }
      })();
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setSuggestLoading(false);
    };
  }, [inviteQuery, pickedUserId, excluded]);

  useEffect(() => {
    if (!inviteState.ok) return;
    setInviteQuery("");
    setPickedUserId(null);
    setSuggestions([]);
    setSuggestOpen(false);
    router.refresh();
  }, [inviteState.ok, router]);

  const needUsernameOrPick = !pickedUserId && !prefillSiblingActive;

  const formClass =
    variant === "stack"
      ? "flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2.5"
      : "grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start";

  const inputBase =
    "eid-input-dark w-full min-h-[52px] rounded-xl px-4 py-3 text-base leading-snug text-eid-fg !text-base sm:min-h-[50px] sm:px-4 sm:py-3 sm:text-[1.05rem]";
  const inputCn = inputClassName ? `${inputBase} ${inputClassName}` : inputBase;

  const btnClass =
    variant === "stack"
      ? "w-full sm:w-auto sm:min-w-[6.75rem] sm:shrink-0 sm:self-stretch"
      : "w-auto max-w-full shrink-0 justify-self-start sm:self-stretch";

  return (
    <div>
      <form action={inviteAction} className={formClass}>
        <input type="hidden" name="time_id" value={timeId} />
        <input type="hidden" name="convidado_usuario_id" value={pickedUserId ?? ""} />
        <div
          className={`relative min-w-0 w-full ${variant === "grid" ? "sm:col-span-1" : "sm:min-w-0 sm:flex-1"}`}
        >
          <input
            type="text"
            name="username"
            value={inviteQuery}
            onChange={(e) => {
              setPickedUserId(null);
              setInviteQuery(e.target.value);
            }}
            onFocus={() => {
              if (suggestions.length > 0 && !pickedUserId) setSuggestOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setSuggestOpen(false), 180);
            }}
            required={needUsernameOrPick}
            placeholder="Nome ou @ do atleta — 3 letras para sugestões"
            autoComplete="off"
            className={inputCn}
          />
          {suggestLoading ? (
            <p className="absolute left-0 top-full z-20 mt-1.5 text-xs text-eid-text-secondary">Buscando…</p>
          ) : null}
          {suggestOpen && suggestions.length > 0 ? (
            <ul
              className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card py-1 shadow-lg"
              role="listbox"
            >
              {suggestions.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-3 text-left text-sm hover:bg-eid-surface/60"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setPickedUserId(it.id);
                      setInviteQuery(it.subtitle ? `${it.title} (${it.subtitle})` : it.title);
                      setSuggestOpen(false);
                      setSuggestions([]);
                    }}
                  >
                    <span className="font-semibold text-eid-fg">{it.title}</span>
                    {it.subtitle ? <span className="text-xs text-eid-text-secondary">{it.subtitle}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <EidInviteButton
          type="submit"
          loading={invitePending}
          label={submitLabel}
          loadingLabel="Enviando..."
          className={btnClass}
        />
      </form>
    </div>
  );
}

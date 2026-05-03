"use client";

import { useEffect, useState } from "react";
import { SearchSuggestInput } from "@/components/search/search-suggest-input";

type Props = {
  initialUserId: string;
};

export function AdminPushUsuarioPicker({ initialUserId }: Props) {
  const [q, setQ] = useState("");
  const [userId, setUserId] = useState(initialUserId.trim());
  const [pickedLabel, setPickedLabel] = useState("");

  useEffect(() => {
    const next = initialUserId.trim();
    setUserId(next);
    if (!next) setPickedLabel("");
  }, [initialUserId]);

  return (
    <div className="space-y-1.5">
      <SearchSuggestInput
        value={q}
        onChange={setQ}
        scope="admin_push_usuarios"
        minChars={3}
        placeholder="Nome ou @ do usuário (mín. 3 letras)"
        className="w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-xs text-eid-fg"
        onPickItem={(item) => {
          setUserId(item.id);
          setPickedLabel([item.title, item.subtitle].filter(Boolean).join(" · "));
          setQ("");
        }}
      />
      <input type="hidden" name="user_id" value={userId} />
      {userId ? (
        <p className="text-[11px] text-eid-text-secondary">
          Destinatário:{" "}
          <span className="font-semibold text-eid-fg">
            {pickedLabel || "ID vindo da URL ou escolha alguém na lista acima"}
          </span>{" "}
          <span className="font-mono text-[10px] opacity-80">({userId.slice(0, 8)}…)</span>
        </p>
      ) : (
        <p className="text-[11px] text-eid-text-secondary">Digite pelo menos 3 letras e escolha um perfil na lista.</p>
      )}
    </div>
  );
}

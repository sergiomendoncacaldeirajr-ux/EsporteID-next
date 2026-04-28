"use client";

import type { ComponentProps } from "react";

type FormAction = NonNullable<ComponentProps<"form">["action"]>;

export function SairDaEquipeConfirmForm({
  action,
  className,
  label = "Sair da equipe",
}: {
  action: FormAction;
  className?: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Tem certeza que deseja sair desta formação? Você deixará de constar no elenco como membro ativo."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

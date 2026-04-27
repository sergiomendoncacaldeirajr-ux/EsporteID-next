"use client";

import { useFormStatus } from "react-dom";

type Props = {
  idleLabel: string;
  pendingLabel: string;
  className: string;
};

export function StatusSubmitButton({ idleLabel, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

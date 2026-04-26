"use client";

import { useEffect, useState } from "react";

type Props = {
  children: string;
  className?: string;
};

export function DismissibleTapAwayHint({ children, className }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const onPointerDown = () => setVisible(false);
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown, { once: true });
    }, 100);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <p className={className}>
      {children}
    </p>
  );
}

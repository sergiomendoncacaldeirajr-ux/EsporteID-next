import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Formulário longo de edição de perfil. */
export default function LoadingContaPerfil() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-8 w-56 rounded-lg" />
      <div className="mt-6 space-y-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkBlock className="h-4 w-32 rounded-md" />
            <SkBlock className={`w-full rounded-xl ${i === 4 ? "h-24" : "h-11"}`} />
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <SkBlock className="h-12 w-36 rounded-xl" />
        <SkBlock className="h-12 w-36 rounded-xl" />
      </div>
    </SkMain>
  );
}

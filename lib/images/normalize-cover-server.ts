const MAX_OUT_BYTES = 6 * 1024 * 1024;

type SharpLike = (input: Buffer) => {
  rotate: () => {
    resize: (w: number, h: number, opts: { fit: "inside" | "cover"; withoutEnlargement?: boolean }) => {
      jpeg: (opts: { quality: number; mozjpeg: boolean }) => { toBuffer: () => Promise<Buffer> };
    };
    jpeg: (opts: { quality: number; mozjpeg: boolean }) => { toBuffer: () => Promise<Buffer> };
  };
};

function loadSharpSafely(): SharpLike | null {
  try {
    // Evita import estático de `sharp` para bundlers edge (ex.: Cloudflare).
    const req = (0, eval)("require") as (id: string) => unknown;
    const mod = req("sharp") as { default?: SharpLike } | SharpLike;
    return (typeof mod === "function" ? mod : mod.default) ?? null;
  } catch {
    return null;
  }
}

/** Capa de perfil: largura até 2000px, proporção tipo banner (área máx. 2000×1125). */
export async function normalizeCoverBuffer(input: Buffer): Promise<Buffer> {
  const sharp = loadSharpSafely();
  if (!sharp) return input;

  let out = await sharp(input)
    .rotate()
    .resize(2000, 1125, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  if (out.length <= MAX_OUT_BYTES) return out;

  out = await sharp(input)
    .rotate()
    .resize(1600, 900, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  if (out.length <= MAX_OUT_BYTES) return out;

  out = await sharp(input)
    .rotate()
    .resize(1280, 720, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
  if (out.length <= MAX_OUT_BYTES) return out;

  return sharp(input)
    .rotate()
    .resize(1200, 675, { fit: "cover" })
    .jpeg({ quality: 68, mozjpeg: true })
    .toBuffer();
}

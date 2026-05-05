const MAX_OUT_BYTES = 5 * 1024 * 1024;

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

/**
 * Converte qualquer imagem suportada pelo libvips em JPEG otimizado para avatar.
 * Usado no servidor como rede de segurança mesmo após preparo no cliente.
 * Em runtimes sem `sharp` (como edge workers), devolve o buffer original.
 */
export async function normalizeAvatarBuffer(input: Buffer): Promise<Buffer> {
  const sharp = loadSharpSafely();
  if (!sharp) return input;

  let out = await sharp(input)
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  if (out.length <= MAX_OUT_BYTES) return out;

  out = await sharp(input)
    .rotate()
    .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  if (out.length <= MAX_OUT_BYTES) return out;

  out = await sharp(input)
    .rotate()
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
  if (out.length <= MAX_OUT_BYTES) return out;

  return sharp(input).rotate().resize(960, 960, { fit: "cover" }).jpeg({ quality: 65, mozjpeg: true }).toBuffer();
}

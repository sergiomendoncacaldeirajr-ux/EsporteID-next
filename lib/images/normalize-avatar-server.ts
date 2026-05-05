import sharp from "sharp";

const MAX_OUT_BYTES = 5 * 1024 * 1024;

/**
 * Converte qualquer imagem suportada pelo libvips em JPEG otimizado para avatar.
 * Usado no servidor como rede de segurança mesmo após preparo no cliente.
 */
export async function normalizeAvatarBuffer(input: Buffer): Promise<Buffer> {
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

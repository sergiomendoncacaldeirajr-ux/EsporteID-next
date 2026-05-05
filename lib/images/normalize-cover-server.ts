import sharp from "sharp";

const MAX_OUT_BYTES = 6 * 1024 * 1024;

/** Capa de perfil: largura até 2000px, proporção tipo banner (área máx. 2000×1125). */
export async function normalizeCoverBuffer(input: Buffer): Promise<Buffer> {
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

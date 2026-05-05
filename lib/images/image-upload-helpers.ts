/** Limite do arquivo recebido na Server Action (compatível com bodySizeLimit do Next). */
export const MAX_RAW_IMAGE_BYTES = 14 * 1024 * 1024;

/**
 * Detecta se o arquivo parece imagem (MIME ou extensão comum).
 * MIME vazio + extensão conhecida cobre alguns celulares.
 */
export function isLikelyImageUpload(file: File): boolean {
  const t = (file.type || "").toLowerCase().trim();
  if (t.startsWith("image/")) return true;
  if (t.length > 0) return false;
  return /\.(jpe?g|pjpeg|jfif|jpe|png|apng|gif|webp|bmp|tiff?|tif|heic|heif|avif|svg)$/i.test(
    file.name
  );
}

/** Mensagem amigável quando processamento ou envio da imagem falha (servidor ou storage). */
export const MSG_FOTO_ENVIO_FALHOU =
  "Não foi possível enviar esta foto. Tente outra imagem (JPG ou PNG), ou tire uma nova pela câmera do celular.";

/**
 * Pré-processamento no navegador: HEIC → JPEG, redimensiona e comprime.
 * Usado em onboarding, foto de perfil e capa (fluxos distintos por maxEdge).
 */

export type PrepareImageResult =
  | { ok: true; file: File }
  | { ok: false; message: string };

function looksLikeHeic(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = file.name.toLowerCase();
  return t === "image/heic" || t === "image/heif" || n.endsWith(".heic") || n.endsWith(".heif");
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("A imagem não pôde ser aberta neste aparelho."));
    };
    img.src = url;
  });
}

async function heicToJpegFile(file: File): Promise<File> {
  const mod = await import("heic2any");
  const heic2any = mod.default;
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(out) ? out[0] : out;
  if (!blob || blob.size === 0) {
    throw new Error("Não foi possível converter a foto HEIC.");
  }
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

export async function prepareImageForUpload(
  file: File,
  opts: { maxEdge: number; outFileName: string; jpegQuality?: number }
): Promise<PrepareImageResult> {
  const q = opts.jpegQuality ?? 0.88;
  if (!file.size) {
    return { ok: false, message: "Arquivo vazio." };
  }

  try {
    let toDraw = file;

    if (looksLikeHeic(file)) {
      try {
        toDraw = await heicToJpegFile(file);
      } catch {
        return {
          ok: false,
          message:
            "Este formato de foto (HEIC) não abriu aqui. Tente enviar como JPG na galeria ou use outra foto.",
        };
      }
    }

    const img = await loadImageElement(toDraw);
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) {
      return { ok: false, message: "Não foi possível ler o tamanho da imagem." };
    }

    const scale = Math.min(1, opts.maxEdge / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ok: false, message: "Não foi possível processar a foto neste dispositivo." };
    }
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", q);
    });
    if (!blob || blob.size === 0) {
      return { ok: false, message: "Não foi possível gerar a versão otimizada da foto." };
    }

    const out = new File([blob], opts.outFileName, { type: "image/jpeg", lastModified: Date.now() });
    return { ok: true, file: out };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível preparar a foto.";
    return { ok: false, message: msg };
  }
}

/** Avatar / onboarding — quadrado, lado máx. 1600px. */
export async function prepareAvatarForUpload(file: File): Promise<PrepareImageResult> {
  return prepareImageForUpload(file, { maxEdge: 1600, outFileName: "avatar.jpg", jpegQuality: 0.88 });
}

/** Capa de perfil — imagens largas; lado maior até ~2400px antes do servidor refinar. */
export async function prepareCoverForUpload(file: File): Promise<PrepareImageResult> {
  return prepareImageForUpload(file, { maxEdge: 2400, outFileName: "cover.jpg", jpegQuality: 0.86 });
}

/** Escudo de time/dupla — quadrado, otimizado para upload e edição em modal. */
export async function prepareTeamShieldForUpload(file: File): Promise<PrepareImageResult> {
  return prepareImageForUpload(file, { maxEdge: 1600, outFileName: "escudo.jpg", jpegQuality: 0.88 });
}

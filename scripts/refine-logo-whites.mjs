/**
 * Remove preenchimento branco/claro no interior das letras (não alcançado pelo flood fill da borda).
 * - logo-full.png: só na faixa inferior (wordmark), para não apagar brancos do ícone E.
 * - logo-wordmark.png: em toda a imagem (só texto).
 */
import path from "path";
import sharp from "sharp";

function isWhiteFill(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = (r + g + b) / 3;
  return chroma <= 42 && lum >= 232;
}

async function processFile(relPath, { bandFromYRatio }) {
  const filePath = path.join(process.cwd(), relPath);
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const yMin = bandFromYRatio != null ? Math.floor(h * bandFromYRatio) : 0;
  let n = 0;

  for (let y = yMin; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      if (data[k + 3] === 0) continue;
      const r = data[k];
      const g = data[k + 1];
      const b = data[k + 2];
      if (isWhiteFill(r, g, b)) {
        data[k + 3] = 0;
        n++;
      }
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(filePath);

  console.log(relPath, "transparent-fill pixels:", n, "y>=", yMin);
}

await processFile("public/brand/logo-full.png", { bandFromYRatio: 0.44 });
await processFile("public/brand/logo-wordmark.png", { bandFromYRatio: null });

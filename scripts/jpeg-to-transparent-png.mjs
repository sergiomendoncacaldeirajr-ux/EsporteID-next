/**
 * Converte JPEG de logo (fundo claro/neutro) para PNG com alpha.
 * Usa flood fill a partir da borda em pixels "de fundo" (baixa croma, luminância acima do limiar).
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error("Usage: node jpeg-to-transparent-png.mjs <input.jpg> <output.png>");
  process.exit(1);
}

function isBackgroundLike(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = (r + g + b) / 3;
  if (chroma > 52) return false;
  if (lum < 112) return false;
  if (lum >= 200) return true;
  if (lum >= 155 && chroma <= 35) return true;
  return lum >= 128 && chroma <= 22;
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const len = w * h;
const out = Buffer.from(data);
const transparent = new Uint8Array(len);

const stack = [];
function push(x, y) {
  const i = y * w + x;
  if (transparent[i]) return;
  transparent[i] = 1;
  stack.push(x, y);
}

for (let x = 0; x < w; x++) {
  for (const y of [0, h - 1]) {
    const i = (y * w + x) * 4;
    if (isBackgroundLike(out[i], out[i + 1], out[i + 2])) push(x, y);
  }
}
for (let y = 0; y < h; y++) {
  for (const x of [0, w - 1]) {
    const i = (y * w + x) * 4;
    if (isBackgroundLike(out[i], out[i + 1], out[i + 2])) push(x, y);
  }
}

while (stack.length) {
  const y = stack.pop();
  const x = stack.pop();
  const nbs = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  for (const [nx, ny] of nbs) {
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
    const j = ny * w + nx;
    if (transparent[j]) continue;
    const k = j * 4;
    if (!isBackgroundLike(out[k], out[k + 1], out[k + 2])) continue;
    push(nx, ny);
  }
}

for (let i = 0; i < len; i++) {
  if (!transparent[i]) continue;
  const k = i * 4;
  out[k + 3] = 0;
}

await sharp(out, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9, effort: 10 })
  .toFile(output);

const st = fs.statSync(output);
console.log("Wrote", path.resolve(output), "bytes", st.size, "dims", w, "x", h);

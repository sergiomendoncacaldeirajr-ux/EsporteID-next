/**
 * Remove fundo conectado às bordas: escuro (preto/cinza) e/ou branco quase puro (PNG → alpha).
 * Uso: node scripts/knockout-border-black.mjs [caminho.png] [T_escuro] [T_claro]
 */
import sharp from "sharp";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const target = process.argv[2] ?? "public/brand/logo-auth-mark.png";
const T_DARK = Number(process.argv[3] ?? 34);
const T_LIGHT = Number(process.argv[4] ?? 248);

const __dirname = dirname(fileURLToPath(import.meta.url));
const inPath = join(__dirname, "..", target);

if (!fs.existsSync(inPath)) {
  console.error("Arquivo não encontrado:", inPath);
  process.exit(1);
}

const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const ch = 4;
const pixels = new Uint8ClampedArray(data);

function avg(x, y) {
  const i = (y * w + x) * ch;
  return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
}

function alpha(x, y) {
  const i = (y * w + x) * ch;
  return pixels[i + 3];
}

function floodFromBorder(isBg) {
  const visited = new Uint8Array(w * h);
  const q = [];
  function trySeed(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    if (visited[y * w + x]) return;
    if (alpha(x, y) < 8) return;
    if (!isBg(x, y)) return;
    visited[y * w + x] = 1;
    q.push([x, y]);
  }
  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }
  while (q.length) {
    const [x, y] = q.pop();
    const i = (y * w + x) * ch;
    pixels[i + 3] = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (visited[ny * w + nx]) continue;
      if (alpha(nx, ny) < 8) continue;
      if (!isBg(nx, ny)) continue;
      visited[ny * w + nx] = 1;
      q.push([nx, ny]);
    }
  }
}

floodFromBorder((x, y) => avg(x, y) < T_DARK);
floodFromBorder((x, y) => avg(x, y) > T_LIGHT);

const out = await sharp(Buffer.from(pixels), {
  raw: { width: w, height: h, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toBuffer();

const tmp = `${inPath}.tmp.png`;
fs.writeFileSync(tmp, out);
fs.renameSync(tmp, inPath);
console.log("OK:", inPath, `${w}x${h}`, "dark<", T_DARK, "light>", T_LIGHT);

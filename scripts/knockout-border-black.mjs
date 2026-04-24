/**
 * Remove fundo preto/cinza escuro conectado às bordas (PNG → alpha).
 * Uso: node scripts/knockout-border-black.mjs [caminho.png]
 */
import sharp from "sharp";
import fs from "fs";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const target = process.argv[2] ?? "public/brand/logo-auth-mark.png";
const T = Number(process.argv[3] ?? 22); // média RGB < T = “fundo”

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
const visited = new Uint8Array(w * h);

function avg(x, y) {
  const i = (y * w + x) * ch;
  return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
}

function markVisited(x, y) {
  visited[y * w + x] = 1;
}

function isVisited(x, y) {
  return visited[y * w + x] === 1;
}

/** BFS a partir das bordas: só pixels escuros conectados à borda viram transparentes. */
const q = [];
function trySeed(x, y) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  if (isVisited(x, y)) return;
  if (avg(x, y) >= T) return;
  markVisited(x, y);
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
    if (isVisited(nx, ny)) continue;
    if (avg(nx, ny) >= T) continue;
    markVisited(nx, ny);
    q.push([nx, ny]);
  }
}

const out = await sharp(Buffer.from(pixels), {
  raw: { width: w, height: h, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toBuffer();

const tmp = `${inPath}.tmp.png`;
fs.writeFileSync(tmp, out);
fs.renameSync(tmp, inPath);
console.log("OK:", inPath, `${w}x${h}`, "threshold", T);

/**
 * Gera imagens nativas de startup para iOS PWA.
 *
 * O iOS não permite splash animado em web apps; estas imagens são o frame estático
 * usado antes da aplicação hidratar.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "pwa-startup");
const markSrc = path.join(root, "public", "pwa-splash-open-mark.png");

const BG = "#0b1d2e";
const LINE_BLUE = { r: 37, g: 99, b: 235, alpha: 0.18 };
const LINE_ORANGE = { r: 249, g: 115, b: 22, alpha: 0.2 };

const STARTUP_IMAGES = [
  { w: 1290, h: 2796, media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
  { w: 1179, h: 2556, media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
  { w: 1170, h: 2532, media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
  { w: 1284, h: 2778, media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" },
  { w: 1125, h: 2436, media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" },
  { w: 1242, h: 2688, media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" },
  { w: 828, h: 1792, media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" },
  { w: 1242, h: 2208, media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" },
  { w: 750, h: 1334, media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
  { w: 640, h: 1136, media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" },
];

function courtLinesSvg(width, height) {
  const stroke = Math.max(2, Math.round(width * 0.003));
  const cx = width / 2;
  const cy = height / 2;
  const arcW = width * 0.72;
  const arcH = width * 0.72;
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="rgba(${LINE_BLUE.r},${LINE_BLUE.g},${LINE_BLUE.b},${LINE_BLUE.alpha})" stroke-width="${stroke}">
        <path d="M ${width * 0.12} ${cy} H ${width * 0.88}" />
        <circle cx="${cx}" cy="${cy}" r="${width * 0.18}" />
        <path d="M ${width * 0.14} ${height * 0.18} Q ${cx} ${height * 0.08} ${width * 0.86} ${height * 0.18}" />
        <path d="M ${width * 0.14} ${height * 0.82} Q ${cx} ${height * 0.92} ${width * 0.86} ${height * 0.82}" />
      </g>
      <g fill="none" stroke="rgba(${LINE_ORANGE.r},${LINE_ORANGE.g},${LINE_ORANGE.b},${LINE_ORANGE.alpha})" stroke-width="${stroke}">
        <path d="M ${cx - arcW / 2} ${cy + arcH * 0.22} A ${arcW / 2} ${arcH / 2} 0 0 1 ${cx + arcW / 2} ${cy + arcH * 0.22}" />
      </g>
    </svg>
  `);
}

function glowSvg(size) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgb(37,99,235)" stop-opacity="0.2" />
          <stop offset="42%" stop-color="rgb(37,99,235)" stop-opacity="0.12" />
          <stop offset="100%" stop-color="rgb(37,99,235)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#glow)" />
    </svg>
  `);
}

async function makeStartupImage({ w, h }) {
  const fileName = `apple-touch-startup-image-${w}x${h}.png`;
  const out = path.join(outDir, fileName);
  const markSize = Math.round(Math.min(w, h) * 0.38);
  const mark = await sharp(markSrc)
    .resize(markSize, markSize, { fit: "contain" })
    .png()
    .toBuffer();

  const glowSize = Math.round(markSize * 1.48);
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      { input: courtLinesSvg(w, h), left: 0, top: 0 },
      { input: glowSvg(glowSize), left: Math.round((w - glowSize) / 2), top: Math.round((h - glowSize) / 2) },
      { input: mark, left: Math.round((w - markSize) / 2), top: Math.round((h - markSize) / 2) },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toFile(out);

  return fileName;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.access(markSrc);
  for (const image of STARTUP_IMAGES) {
    const fileName = await makeStartupImage(image);
    console.log("OK:", path.join("public", "pwa-startup", fileName));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

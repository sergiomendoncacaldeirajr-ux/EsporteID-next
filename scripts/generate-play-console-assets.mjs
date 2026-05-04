/**
 * Gera arquivos para Google Play Console (listagem):
 * - play-app-icon-512.png — 512×512 (fundo sólido + marca)
 * - play-feature-graphic-1024x500.png — banner obrigatório
 *
 * Uso: node scripts/generate-play-console-assets.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "store-play-console");

const BG = "#121821";
const LOGO = path.join(root, "public", "brand", "logo-auth-mark.png");

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.access(LOGO);

  const iconSize = 512;
  const logoForIcon = await sharp(LOGO)
    .resize(Math.round(iconSize * 0.72), Math.round(iconSize * 0.72), {
      fit: "inside",
    })
    .toBuffer();

  const icon512 = await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logoForIcon, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(path.join(outDir, "play-app-icon-512.png"), icon512);

  const fw = 1024;
  const fh = 500;
  const logoForBanner = await sharp(LOGO)
    .resize(Math.round(fw * 0.42), Math.round(fh * 0.7), { fit: "inside" })
    .toBuffer();

  const banner = await sharp({
    create: {
      width: fw,
      height: fh,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: logoForBanner, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(path.join(outDir, "play-feature-graphic-1024x500.png"), banner);

  console.log("OK → public/store-play-console/play-app-icon-512.png");
  console.log("OK → public/store-play-console/play-feature-graphic-1024x500.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

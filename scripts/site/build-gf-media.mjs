import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = new URL('../../data/animations/gf/', import.meta.url);
const output = new URL('../../public/images/animations/gf/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('generation.json', source), 'utf8'));
await mkdir(output, { recursive: true });
for (const asset of manifest.assets) {
  const input = fileURLToPath(new URL(asset.source, source));
  const metadata = await sharp(input).metadata();
  if (metadata.width !== 1478 || metadata.height !== 1064 || !metadata.hasAlpha) {
    throw new Error(`${asset.id}: expected a transparent 1478×1064 registered layer`);
  }
  for (const [suffix, width] of [['', 1478], ['-mobile', 768]]) {
    const filename = `${asset.id}${suffix}.webp`;
    const result = await sharp(input).resize({ width }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(fileURLToPath(new URL(filename, output)));
    console.log(`${filename}: ${result.width}×${result.height}, ${Math.round(result.size / 1024)} KB`);
  }
}

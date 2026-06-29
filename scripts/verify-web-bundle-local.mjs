import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const assetsDir = path.join(repoRoot, 'apps/web/dist/assets');
const maxChunkBytes = 550 * 1024;

let assetNames;
try {
  assetNames = await readdir(assetsDir);
} catch (error) {
  throw new Error(
    `Web build assets were not found at ${assetsDir}. Run npm run build:web before bundle verification.`,
    { cause: error },
  );
}

const jsAssets = assetNames.filter((assetName) => assetName.endsWith('.js'));
const oversizedAssets = [];

for (const assetName of jsAssets) {
  const assetPath = path.join(assetsDir, assetName);
  const assetStat = await stat(assetPath);
  if (assetStat.size > maxChunkBytes) {
    oversizedAssets.push({
      name: assetName,
      sizeKb: Math.round(assetStat.size / 1024),
    });
  }
}

if (oversizedAssets.length > 0) {
  const details = oversizedAssets
    .map((asset) => `${asset.name}=${asset.sizeKb}KB`)
    .join(', ');
  throw new Error(`Web bundle has oversized JS chunks over 550KB: ${details}`);
}

console.log(`Web bundle local smoke passed. Checked ${jsAssets.length} JS chunks.`);

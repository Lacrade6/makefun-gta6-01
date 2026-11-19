// Solmar City — Streets of Gold. Entry program for the make.fun gta6-01
// bounty. Node 22, standard library only. It copies this repository's game/
// and screenshots/ folders into /output and writes /output/dossier.json with
// the vendored make.fun library, so the judge can read the game.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (inside the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used.)

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — nothing to hand in');
}

function countTree(dir, seen = { files: 0, bytes: 0 }) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) countTree(full, seen);
    else {
      seen.files += 1;
      seen.bytes += info.size;
    }
  }
  return seen;
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

const gameStats = countTree(join(outDir, 'game'));
const shotStats = countTree(join(outDir, 'screenshots'));

// The scorer's caps for this bounty: dossier text at most 160 KiB, at most
// 4 screenshots of at most 256 KiB each, game/ at most 993 files and
// 48 MiB in all, no path under game/ longer than 1000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(
  `Solmar City handed in: ${gameStats.files} game files (${gameStats.bytes} bytes), ` +
  `${shotStats.files} screenshots (${shotStats.bytes} bytes) -> ${outDir}`,
);

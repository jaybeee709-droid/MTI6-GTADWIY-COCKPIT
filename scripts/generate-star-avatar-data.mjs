/* Generates src/star-avatar-data.ts MECHANICALLY from the canonical
 * js/data/star-avatar.js (owner-designated portrait, 2026-11-16:
 * Daniel's own uploaded portrait is STAR's face; expressions idle /
 * talking / thinking / smile derived from it in the Embodiment
 * builds). The source file is never edited — this script only reads
 * it. Run: node scripts/generate-star-avatar-data.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync('js/data/star-avatar.js', 'utf8'), sandbox);

const src = sandbox.window.STAR_AVATAR_SRC;
const expr = sandbox.window.STAR_AVATAR_EXPRESSIONS;
if (typeof src !== 'string' || !src.startsWith('data:image/')) {
  throw new Error('STAR_AVATAR_SRC missing or not a data URI');
}
for (const name of ['talking', 'thinking', 'smile']) {
  if (typeof expr?.[name] !== 'string' || !expr[name].startsWith('data:image/')) {
    throw new Error(`STAR_AVATAR_EXPRESSIONS.${name} missing or not a data URI`);
  }
}
console.log(`portrait=${src.length} talking=${expr.talking.length} thinking=${expr.thinking.length} smile=${expr.smile.length}`);

const body = `/* GENERATED 2026-11-23 by scripts/generate-star-avatar-data.mjs from
 * js/data/star-avatar.js — the owner's designated portrait of STAR
 * (his own uploaded portrait, cutout, with the ruled re-dress) and
 * its expression variants. DO NOT HAND-EDIT — regenerate instead. */

export const STAR_PORTRAIT: string = ${JSON.stringify(src)};

export const STAR_EXPRESSIONS: { talking: string; thinking: string; smile: string } = {
  talking: ${JSON.stringify(expr.talking)},
  thinking: ${JSON.stringify(expr.thinking)},
  smile: ${JSON.stringify(expr.smile)},
};
`;
writeFileSync('src/star-avatar-data.ts', body);
console.log(`wrote src/star-avatar-data.ts (${body.length} bytes)`);

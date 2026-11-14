import { readFileSync, writeFileSync } from 'node:fs';
import { create } from 'fontkitten';

const [fontPath] = process.argv.slice(2);
if (!fontPath) {
  console.error('Usage: node scripts/build-glyphs.mjs <path to InterTight[wght].ttf>');
  process.exit(1);
}

const font = create(readFileSync(fontPath)).getVariation({ wght: 600 });
const round = (v) => Math.round(v * 10) / 10;
const chars = [];
for (let c = 0x21; c <= 0x7e; c++) chars.push(c);
for (let c = 0xc0; c <= 0xff; c++) chars.push(c);

const glyphs = {};
for (const code of chars) {
  const glyph = font.glyphForCodePoint(code);
  if (!glyph.id) continue;
  const contours = [];
  let current = '';
  for (const { command, args } of glyph.path.commands) {
    const a = args.map(round).join(' ');
    if (command === 'moveTo') {
      if (current) contours.push(current);
      current = `M${a}`;
    } else if (command === 'lineTo') current += `L${a}`;
    else if (command === 'quadraticCurveTo') current += `Q${a}`;
    else if (command === 'bezierCurveTo') current += `C${a}`;
    else if (command === 'closePath') current += 'Z';
  }
  if (current) contours.push(current);
  if (contours.length) glyphs[String.fromCodePoint(code)] = { adv: round(glyph.advanceWidth), contours };
}

const data = { upm: font.unitsPerEm, cap: font['OS/2'].capHeight, x: font['OS/2'].xHeight, glyphs };
writeFileSync(new URL('../src/lib/name-glyphs.json', import.meta.url), JSON.stringify(data));
console.log(`Wrote ${Object.keys(glyphs).length} glyphs`);

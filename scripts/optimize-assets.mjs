import sharp from "sharp";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
const names = [
  "home-imgFrame136",
  "home-imgNftArtwork18",
  "home-imgNftArtwork05",
  "home-imgNftArtwork09",
];
for (const name of names) {
  if (existsSync(`public/assets/${name}.png`))
    await sharp(`public/assets/${name}.png`)
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 85, effort: 6 })
      .toFile(`public/assets/${name}.webp`);
  else console.log(`${name}: WebP já incluído no repositório.`);
}
async function rewrite(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) await rewrite(file);
    else if (/\.(tsx?|css)$/.test(e.name)) {
      let text = await readFile(file, "utf8");
      for (const name of names)
        text = text.replaceAll(`${name}.png`, `${name}.webp`);
      await writeFile(file, text);
    }
  }
}
await rewrite("src");

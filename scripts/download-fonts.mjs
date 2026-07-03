import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'public', 'fonts');
fs.mkdirSync(outDir, { recursive: true });

const urls = [
  ['Roboto-Regular.ttf', 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf'],
  ['Roboto-Bold.ttf', 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf'],
];

(async () => {
  for (const [name, url] of urls) {
    console.log(`Downloading ${name}...`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${name}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(path.join(outDir, name), buf);
    console.log(`  Done: ${(buf.length / 1024).toFixed(0)} KB`);
  }
  console.log('All fonts downloaded!');
})().catch((e) => { console.error(e); process.exit(1); });

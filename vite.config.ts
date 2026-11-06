import { defineConfig } from 'vitest/config';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
export default defineConfig({
  plugins: [{ name: 'cozy-offline-manifest', apply: 'build', async writeBundle(options, bundle) {
    const assets = Object.keys(bundle).filter(name => /\.(js|css)$/.test(name)).map(name => `/${name}`);
    const paths = ['/', '/favicon.svg', '/fonts/fonts.css', '/fonts/fredoka.woff2', '/fonts/dm-sans.woff2', ...assets];
    const version = createHash('sha256').update(paths.join('|')).digest('hex').slice(0, 12);
    const template = await readFile('public/sw.js', 'utf8');
    await writeFile(resolve(options.dir ?? 'dist', 'sw.js'), template.replace("'cozy-science-v1'", `'cozy-science-${version}'`).replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(paths)};`));
  } }],
  test: { include: ['tests/**/*.test.ts'], coverage: { include: ['src/core/**'] } }, server: { host: '0.0.0.0' }
});

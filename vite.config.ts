import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { readCloudConfig } from "./src/core/cloud-config";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { branches } from "./src/data/catalog";
import { HANDBOOK_EDITION } from "./src/data/handbook-edition";
import { researchers } from "./src/data/researchers";
import { profileBorders } from "./src/data/profile-borders";
const base = process.env.VITE_BASE_PATH || "/";
if (!base.startsWith("/") || !base.endsWith("/"))
  throw new Error("VITE_BASE_PATH must start and end with /.");
export default defineConfig(({ mode }) => {
  const config = readCloudConfig({
    ...loadEnv(mode, process.cwd(), "VITE_"),
    ...process.env,
  });
  return {
    base,
    plugins: [
      {
        name: "cozy-cloud-csp",
        transformIndexHtml(html) {
          return config.enabled
            ? html
                .replace(
                  "connect-src 'self';",
                  `connect-src 'self' ${config.url};`,
                )
                .replace(
                  "img-src 'self' data:;",
                  `img-src 'self' data: ${config.url};`,
                )
            : html;
        },
      },
      {
        name: "cozy-offline-manifest",
        apply: "build",
        async writeBundle(options, bundle) {
          const assets = Object.keys(bundle)
            .filter((name) => /\.(js|css)$/.test(name))
            .map((name) => `${base}${name}`);
          const paths = [
            base,
            `${base}school-seal.webp`,
            `${base}fonts/fonts.css`,
            `${base}fonts/fredoka.woff2`,
            `${base}fonts/dm-sans.woff2`,
            `${base}researchers/moon-garden-frame.svg`,
            ...researchers.map(
              (person) => `${base}researchers/${person.id}.jpg`,
            ),
            ...profileBorders.map(
              (border) => `${base}profile-borders/${border.id}.jpg`,
            ),
            ...branches.map(
              (branch) =>
                `${base}study-guides/${branch.id}-study-handbook.pdf?v=${HANDBOOK_EDITION}`,
            ),
            ...assets,
          ];
          const version = createHash("sha256")
            .update(paths.join("|"))
            .digest("hex")
            .slice(0, 12);
          const template = await readFile("public/sw.js", "utf8");
          await writeFile(
            resolve(options.dir ?? "dist", "sw.js"),
            template
              .replace("'cozy-science-v1'", `'cozy-science-${version}'`)
              .replace(
                "const PRECACHE = [];",
                `const PRECACHE = ${JSON.stringify(paths)};`,
              ),
          );
        },
      },
    ],
    test: {
      include: ["tests/**/*.test.ts"],
      coverage: { include: ["src/core/**"] },
    },
    server: { host: "0.0.0.0" },
  };
});

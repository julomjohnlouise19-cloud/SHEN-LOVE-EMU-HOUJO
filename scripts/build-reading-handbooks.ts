import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { branches } from "../src/data/catalog";
import { handbookHtml, handbookFile } from "../src/core/reading-documents";
import {
  contentHash,
  readingSourceHash,
  type ReadingManifest,
} from "./reading-handbook-files";

await mkdir("public/study-guides", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const manifest: ReadingManifest = {
  version: 1,
  sourceHash: readingSourceHash(),
  files: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 1100 },
    reducedMotion: "reduce",
  });
  for (const branch of branches) {
    await page.setContent(handbookHtml(branch.id), { waitUntil: "load" });
    const path = handbookFile(branch.id);
    const pdf = await page.pdf({
      path: `public/${path}`,
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#52645a;padding:0 16mm;display:flex;justify-content:space-between"><span>The Cozy Science Lab · Study handbook · Edition 1</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    });
    manifest.files.push({
      branch: branch.id,
      path,
      sha256: contentHash(pdf),
      bytes: pdf.byteLength,
    });
    console.log(`${branch.name}: ${pdf.byteLength.toLocaleString()} bytes`);
  }
  await writeFile(
    "public/study-guides/manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    "src/data/handbook-edition.ts",
    `export const HANDBOOK_EDITION = "${manifest.sourceHash.slice(0, 12)}";\n`,
  );
  const check = await readFile("public/study-guides/life-study-handbook.pdf");
  if (check.subarray(0, 5).toString() !== "%PDF-")
    throw new Error("The exported handbook is not a PDF.");
} finally {
  await browser.close();
}

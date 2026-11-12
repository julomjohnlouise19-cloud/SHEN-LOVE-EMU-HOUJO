import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
export interface ReadingManifest {
  version: number;
  sourceHash: string;
  files: { branch: string; path: string; sha256: string; bytes: number }[];
}
export const readingSourceFiles = [
  "src/data/catalog.ts",
  "src/data/study-guides.ts",
  "src/data/science-figures.ts",
  "src/data/references.ts",
  "src/core/reading-documents.ts",
  "scripts/build-reading-handbooks.ts",
];
export const readingSourceHash = () =>
  createHash("sha256")
    .update(
      readingSourceFiles
        .map((path) => `${path}\n${readFileSync(path, "utf8")}`)
        .join("\n"),
    )
    .digest("hex");
export const contentHash = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");

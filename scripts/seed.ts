import { writeFile } from "node:fs/promises";
import { initialState } from "../src/store/seed";
import { hashPassword, makeSalt } from "../src/store/auth";
import { validState } from "../src/store/schema";
const salt = makeSalt();
const state = initialState(
  await hashPassword("admin123", salt),
  salt,
  Date.now(),
);
if (!validState(state)) throw new Error("Seed did not pass the backup schema.");
const output = "/tmp/cozy-science-seed.json";
await writeFile(output, JSON.stringify(state, null, 2), { mode: 0o600 });
console.log(`Validated fresh demo seed written to ${output}.`);
console.log(
  "The app seeds an empty browser automatically. To reset intentionally, sign in as admin and restore this file in Audit & backup.",
);
console.log(
  "Existing browser data and repository files were not changed. Demo admin: admin / admin123.",
);

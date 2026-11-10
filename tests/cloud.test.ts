import { describe, expect, it } from "vitest";
import { readCloudConfig } from "../src/core/cloud-config";
import {
  acknowledge,
  cloudJobKey,
  csvCell,
  enqueue,
  jobForRun,
  readOutbox,
  type CloudOutbox,
} from "../src/core/cloud-records";
import type { Run } from "../src/core/types";

const settings = {
  VITE_BACKEND_MODE: "supabase",
  VITE_SUPABASE_URL: "https://example-project.supabase.co/",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_public_fixture_123456789",
};
const run: Run = {
  id: "run",
  userId: "student",
  deckId: "life.cells",
  level: "medium",
  mode: "practice",
  created: 1794268800000,
  completed: true,
  ids: ["q1"],
  answers: [{ questionId: "q1", value: "a", correct: true, xp: 12, merits: 5 }],
};
describe("cloud configuration", () => {
  it("requires explicit activation and validates the project origin", () => {
    expect(readCloudConfig({}).enabled).toBe(false);
    expect(readCloudConfig(settings)).toEqual({
      enabled: true,
      url: "https://example-project.supabase.co",
      publishableKey: settings.VITE_SUPABASE_PUBLISHABLE_KEY,
    });
    for (const url of [
      "http://example-project.supabase.co",
      "https://example-project.supabase.co.evil.test",
      "https://evil.test/a.supabase.co",
      "https://user:password@example-project.supabase.co",
      "https://example-project.supabase.co:5000",
      "https://example-project.supabase.co/rest/v1",
      "https://example-project.supabase.co?x=1",
    ])
      expect(() =>
        readCloudConfig({ ...settings, VITE_SUPABASE_URL: url }),
      ).toThrow();
    expect(() =>
      readCloudConfig({ ...settings, VITE_BACKEND_MODE: "typo" }),
    ).toThrow();
    expect(() =>
      readCloudConfig({ ...settings, VITE_SUPABASE_PUBLISHABLE_KEY: "" }),
    ).toThrow();
  });
  it("rejects private credentials even in local mode and in unexpected Vite variables", () => {
    for (const mode of ["local", "supabase"]) {
      expect(() =>
        readCloudConfig({
          ...settings,
          VITE_BACKEND_MODE: mode,
          VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_fake_test_value",
        }),
      ).toThrow();
      expect(() =>
        readCloudConfig({
          ...settings,
          VITE_BACKEND_MODE: mode,
          VITE_SUPABASE_SECRET_KEY: "private",
        }),
      ).toThrow();
      expect(() =>
        readCloudConfig({
          ...settings,
          VITE_BACKEND_MODE: mode,
          VITE_UNRELATED: "sb_secret_fake_test_value",
        }),
      ).toThrow();
    }
    expect(() =>
      readCloudConfig({
        ...settings,
        SUPABASE_SECRET_KEY: "server_only_not_bundled",
      }),
    ).not.toThrow();
  });
});
describe("durable quiz records", () => {
  it("keeps invalid upload queues available for recovery", () => {
    expect(readOutbox(undefined)).toEqual({
      version: 1,
      pending: [],
      sent: [],
    });
    const corrupt = { version: 1, pending: [null], sent: [] };
    expect(() => readOutbox(corrupt)).toThrow("recovery");
    expect(corrupt.pending).toEqual([null]);
    expect(
      readOutbox({ version: 1, pending: [jobForRun(run)], sent: [] }).pending,
    ).toHaveLength(1);
  });
  it("uploads answers and ownership without trusting client scores or roles", () => {
    expect(jobForRun(run)).toEqual({
      userId: "student",
      runId: "run",
      deckId: "life.cells",
      level: "medium",
      mode: "practice",
      startedAt: new Date(run.created).toISOString(),
      answers: [{ question_id: "q1", value: "a" }],
    });
    expect(() => jobForRun({ ...run, completed: false })).toThrow();
  });
  it("deduplicates pending and acknowledged attempts without erasing another student's work", () => {
    const job = jobForRun(run),
      other = { ...job, userId: "other" };
    const empty: CloudOutbox = { version: 1, pending: [], sent: [] };
    const pending = enqueue(enqueue(enqueue(empty, job), other), job);
    expect(pending.pending).toHaveLength(2);
    const saved = acknowledge(pending, job);
    expect(saved.pending).toEqual([other]);
    expect(saved.sent).toEqual([cloudJobKey(job)]);
    expect(enqueue(saved, job)).toEqual(saved);
    expect(empty.pending).toEqual([]);
  });
  it("escapes CSV text and spreadsheet formulas", () => {
    expect(csvCell('A, "B"\nC')).toBe('"A, ""B""\nC"');
    for (const value of [
      '=HYPERLINK("example")',
      "+cmd",
      "-1+2",
      "@SUM(A1)",
      "  =1+1",
      "\t=1+1",
    ])
      expect(csvCell(value).startsWith("\"'")).toBe(true);
    expect(csvCell("Student One")).toBe('"Student One"');
  });
});

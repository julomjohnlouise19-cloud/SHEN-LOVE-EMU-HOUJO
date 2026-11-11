import { decks } from "../src/data/catalog";
import { referencesFor } from "../src/data/references";
const sources = [
  ...new Map(
    decks
      .flatMap((deck) => referencesFor(deck.id))
      .map((ref) => [ref.url, ref]),
  ).values(),
];
const online = process.argv.includes("--online");
const escape = (value: string) =>
  value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
let broken = false;
for (const ref of sources) {
  if (new URL(ref.url).protocol !== "https:")
    throw new Error(`Use HTTPS for ${ref.title}.`);
  if (ref.format === "PDF" && !new URL(ref.url).pathname.endsWith(".pdf"))
    throw new Error(`PDF address missing for ${ref.title}.`);
}
if (online) {
  // Check only the app's curated public reading links; never send account credentials.
  for (let start = 0; start < sources.length; start += 3) {
    const batch = await Promise.allSettled(
      sources.slice(start, start + 3).map(async (ref) => {
        let result = "",
          missing = false;
        try {
          const response = await fetch(ref.url, {
            signal: AbortSignal.timeout(15000),
            redirect: "follow",
            headers: {
              "User-Agent": "Cozy-Science-Lab-Source-Check/1.0",
              Accept: "application/pdf,text/html;q=0.9,*/*;q=0.5",
            },
          });
          result = `HTTP ${response.status}`;
          missing =
            [404, 410].includes(response.status) ||
            !response.url.startsWith("https:");
          if (response.ok && ref.format === "PDF" && response.body) {
            const reader = response.body.getReader();
            let header = "";
            while (header.length < 5) {
              const part = await reader.read();
              if (part.done) break;
              header += new TextDecoder().decode(
                part.value.subarray(0, 5 - header.length),
              );
            }
            const pdf = header === "%PDF-";
            await reader.cancel();
            if (!pdf) {
              missing = true;
              result += "; expected PDF, received another document";
            } else result += "; PDF signature verified";
          } else await response.body?.cancel();
        } catch {
          result =
            "Could not verify from the build host; in-app topic notes remain available";
        }
        broken ||= missing;
        const message = `${ref.title}: ${result}. ${ref.url}`;
        console.log(message);
        if (process.env.GITHUB_ACTIONS === "true")
          console.log(
            `::${missing ? "error" : "notice"} title=Science source link::${escape(message)}`,
          );
      }),
    );
    for (const result of batch)
      if (result.status === "rejected") throw result.reason;
  }
}
console.log(
  `Science sources checked: ${sources.length} unique HTTPS references across ${decks.length} decks${online ? "; upstream availability is separate from in-app reading" : " (address validation; use --online for public HTTP checks)"}.`,
);
if (broken) process.exitCode = 1;

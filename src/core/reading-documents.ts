import { branches, decks, deckById } from "../data/catalog";
import { studyGuides, type StudyGuide } from "../data/study-guides";
import { figureById } from "../data/science-figures";
import { referencesFor, referenceCitation } from "../data/references";

export const escapeDocumentText = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function diagramMarkup(id: string, focused = "", closed = false) {
  const figure = figureById(id);
  if (!figure) throw new Error("Unknown science illustration.");
  const body = figure.shapes
    .filter((s) => !s.when || s.when === (closed ? "closed" : "open"))
    .map((s) => {
      const attrs = {
        ...s.attrs,
        ...(focused && s.part && s.part !== focused ? { opacity: 0.32 } : {}),
        ...(focused && s.part === focused && s.tag !== "text"
          ? { "stroke-width": 4, stroke: "#244837" }
          : {}),
      };
      const attributes = Object.entries(attrs)
        .map(([key, value]) => `${key}="${escapeDocumentText(String(value))}"`)
        .join(" ");
      return `<${s.tag} ${attributes}>${s.text ? escapeDocumentText(s.text) : ""}</${s.tag}>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${figure.width} ${figure.height}" role="img" aria-label="${escapeDocumentText(figure.title)}" font-family="Arial, sans-serif" stroke-linecap="round" stroke-linejoin="round"><title>${escapeDocumentText(figure.title)}</title><desc>${escapeDocumentText(figure.description + " " + figure.limit)}</desc>${body}</svg>`;
}
export function guideDocumentBody(guide: StudyGuide) {
  const deck = deckById(guide.deckId)!;
  return `<article class="topic"><p class="kicker">${escapeDocumentText(deck.grades.map((g) => `Grade ${g}`).join(" / "))} · Lab-authored study notes</p><h2>${escapeDocumentText(deck.name)}</h2><p>${escapeDocumentText(guide.introduction)}</p>${guide.ideas.map(([title, body]) => `<section><h3>${escapeDocumentText(title)}</h3><p>${escapeDocumentText(body)}</p></section>`).join("")}<h3>Key terms</h3><dl>${guide.terms.map(([term, meaning]) => `<dt>${escapeDocumentText(term)}</dt><dd>${escapeDocumentText(meaning)}</dd>`).join("")}</dl><section class="example"><h3>${escapeDocumentText(guide.example[0])}</h3><p>${escapeDocumentText(guide.example[1])}</p></section><p class="remember"><strong>Remember:</strong> ${escapeDocumentText(guide.remember)}</p>${guide.figures
    .slice(0, 1)
    .map((id) => {
      const figure = figureById(id)!;
      return `<figure>${diagramMarkup(id)}<figcaption>${escapeDocumentText(figure.title)}. ${escapeDocumentText(figure.limit)}</figcaption></figure>`;
    })
    .join(
      "",
    )}<section class="self-check"><h3>Check your thinking</h3><p>${escapeDocumentText(guide.check[0])}</p><p><strong>Explanation:</strong> ${escapeDocumentText(guide.check[1])}</p></section><section class="citations"><h3>Supporting references</h3><p>These original notes summarize school science concepts. They are not quotations or official curriculum pages.</p>${referencesFor(
    guide.deckId,
  )
    .map(
      (ref) =>
        `<p><a href="${escapeDocumentText(ref.url)}">${escapeDocumentText(referenceCitation(ref))}</a></p>`,
    )
    .join("")}</section></article>`;
}
export function handbookHtml(branchId: string) {
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) throw new Error("Unknown study handbook.");
  const guides = studyGuides.filter((g) => g.deckId.startsWith(branchId + "."));
  const contents = guides
    .map((g) => `<li>${escapeDocumentText(deckById(g.deckId)!.name)}</li>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeDocumentText(branch.name)} study handbook · The Cozy Science Lab</title><style>
@page{size:A4;margin:17mm 16mm 18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#293b35;font-size:10.5pt;line-height:1.6;margin:0}h1,h2,h3{color:#244837;line-height:1.25}h1{font-size:32pt}h2{font-size:24pt;margin:10mm 0 5mm}h3{font-size:13pt;margin:6mm 0 2mm}p{margin:2mm 0 4mm}a{color:#315b48;overflow-wrap:anywhere}.cover{min-height:230mm;padding-top:25mm}.cover>p{max-width:150mm}.kicker{font-size:9pt;letter-spacing:.5pt;color:#52645a}.topic{break-before:page}.example,.remember,.self-check{padding:4mm;background:#edf3e5;border:1px solid #d4dfd3;border-radius:3mm;break-inside:avoid}dt{font-weight:bold}dd{margin:1mm 0 3mm}figure{margin:5mm 0;break-inside:avoid}figure svg{width:100%;max-height:91mm}figcaption{font-size:8.5pt;color:#52645a}.citations{font-size:8pt;break-inside:avoid}li{margin:2mm 0}.cover ul{padding-left:5mm}.cover .edition{margin-top:10mm;border-top:1px solid #d4dfd3;padding-top:5mm;font-size:9pt} </style></head><body><section class="cover"><p class="kicker">THE COZY SCIENCE LAB · ORIGINAL STUDY SERIES</p><h1>${escapeDocumentText(branch.name)}</h1><p>A Grade 7–10 study handbook with concept notes, examples, self-check explanations and labelled illustrations.</p><h3>In this handbook</h3><ul>${contents}</ul><p class="edition">Edition 1 · Lab-authored learning materials. Supporting publications are credited with each topic. Examples are constructed for teaching; diagrams state their model and scale limits. For current Philippine hazard or weather decisions, consult the responsible agencies rather than a static study guide.</p></section>${guides.map(guideDocumentBody).join("")}</body></html>`;
}
export const handbookFile = (branchId: string) =>
  `study-guides/${branchId}-study-handbook.pdf`;
export const handbookTopics = (branchId: string) =>
  decks.filter((d) => d.branch === branchId);

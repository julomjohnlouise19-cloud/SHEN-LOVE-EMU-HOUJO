# Cozy Science Lab project instructions

## Workflow (§0)
- Ship a complete playable product, using the existing checkout. Do not create worktrees unless asked.
- Read PLAN.md and DECISIONS.md before changes. Update checkboxes after each phase.
- Finish P0 and P1 before P2. No stubs, TODOs, dead controls or lorem ipsum.
- Each phase gate: lint, typecheck, unit tests, Playwright, validate:questions, zero browser console errors; fix then commit.
- Keep the first playable slice (Life Science → Cells → Medium → results/mastery/review) working.
- Resolve ambiguity with a numbered decision; choose cozy, calm, accessible behavior.
- Supplied source brief ends at §4.8. Sections 5–16 and Appendix A were not provided.

## Architecture and safety (§2)
- Vite + strict TypeScript, no UI framework. Justify small free dependencies in DECISIONS.md.
- Pure core has zero DOM access, Date.now or Math.random; inject clock, RNG and rules.
- All business mutations are role-checked commands returning patch/events/inverse.
- Keep localStorage implementation inside store/. Use atomic cross-tab transactions, revisions and BroadcastChannel/storage synchronization.
- Lazy-load static question JSON; persist admin overlays, not whole question banks.
- Version/migrate data; quarantine corrupt JSON; show export recovery on quota errors.
- Daily mechanics use configured timezone, default Asia/Manila.
- PBKDF2-SHA-256 >=120k, per-user crypto salt, expiring session tokens, 5-attempt/30s login limiter.
- Demo admin is admin/admin123; label demo security honestly. Production needs server hashing and role enforcement.
- Never assign user text to innerHTML. Only the vetted static svg helper may use innerHTML.
- Keep CSP and import schema validation. Never import secrets into committed files.

## Science accuracy (§4.5)
- Exactly one clear correct answer; no all/none-of-the-above, tricks or double negatives. SI units.
- Pluto is a dwarf planet; 118 elements; Sun is a star; Earth has one natural satellite.
- Seasons: axial tilt. Moon phases: view of the sunlit half, not Earth's shadow.
- Ignoring air resistance, heavier objects do not fall faster.
- Most plant mass comes from carbon dioxide and water, not soil.
- Deoxygenated blood is dark red. Mass is not weight. Speed is not velocity. Heat is not temperature.
- Populations evolve, individuals do not. Sound needs a medium; light does not. No tongue taste map.
- Use Grade 7–10 Philippine K–12 wording and electron shells/energy levels, not tiny planetary orbits.
- Every deck needs a visible curriculum source note. Drop uncertain facts.
- Author and validate one deck at a time; skeptical-teacher review before reviewed:true.

## Economy (§5 absent: adopted defaults)
- Rules are a single editable source. All merits/XP/reward/stock logic lives in core.
- Correct answers earn 3/5/7 merits by level with a modest combo, capped at 120 play merits per Manila day.
- Review/daily/quest/spin rewards are capped separately; no refresh, repeated-answer or concurrent-tab reward duplication.
- Real-item shop, redemption and claims are local demos; clearly state school verification is required.
- Simulate representative honest and repeated-play behavior before delivery.

## Delivery (§16 absent: adopted gates)
- Run meaningful tests, generator checks, question validation, build and browser/a11y smoke tests.
- Preserve command exit codes. Do not claim unrun checks passed.
- README must document commands, demo credentials, security limits, offline behavior and backup recovery.
- Distinguish repository defects, environment issues and missing source specifications.

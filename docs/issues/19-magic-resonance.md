# Epic 19 — Magic & Resonance Depth (Issues #84–#87)

Implementation spec hardening for Phase 19. Source epic: [../FEATURE_PARITY_PLAN.md](../FEATURE_PARITY_PLAN.md) (lines 628–716).

**Implementation order:** #84 → #85 → #86 → #87. #84 changes the `CharacterMagic`/`CharacterResonance` shape (grade lists) that #86's chargen UI writes to; #85 establishes the focus-improvement lifecycle that #86 does not touch but shares the `char.improvements` aggregation added in-flight; #87 is independent of the others.

**In-flight work already on disk (uncommitted) — align, do not revert:**
- `foci` moved off `CharacterMagic` onto `equipment.foci: readonly CharacterFocus[]` (`types/equipment.ts:481–489,514`); `Focus` type deleted from `character.ts`.
- `improvements: readonly Improvement[]` added to `Character` (`character.ts:201`), populated by qualities (`stores/character.ts:672,729,783`), read by `calculations.ts` via `valueOf`.
- `stores/magic.ts` already has `getFocusKarmaCost`/`bondFocus`/`unbondFocus` (magic.ts:411–487) — **but these are stubs to be superseded by #85** (wrong Power Focus multiplier ×4; never populate improvements).
- `FociSelector.svelte` (new, untracked) with hardcoded 10000/25000 costs (lines 41–47); wired as a Foci tab in `MagicSelector.svelte`.
- `metamagics` gamedata store added (`gamedata.ts:837`); CareerAdvancement metamagic list now data-driven.
- The plan's mention of an `initiations` field / readonly `initiateGrade` svelte-check errors does **not** match the current tree (no `initiations` field exists). #84 below introduces it.

**Cross-epic dependency — #82 (XML epic, M10):** #82 converts `CharacterMagic.metamagics` and `CharacterResonance.echoes` from `readonly string[]` to `readonly CharacterMetamagic[]` and changes the `learnMetamagic` signature. Since M10 < M11, **#82 lands before this epic** — treat `metamagics`/`echoes` as `CharacterMetamagic[]` throughout (D4/I2). Slot math (`initiations.length − metamagics.length`) is length-only and survives, but any `{#each metamagics as m}` must render `m.name`, not `m`.

---

## Issue #84: Structured initiation grades with ordeal/group discounts

### Verified current state
- `CharacterMagic.initiateGrade: number` (`character.ts:244`); `CharacterResonance.submersionGrade: number` (`character.ts:296`). No grade list exists.
- Career cost: `getInitiationCost`/`initiate` (`career.ts:559–597`), `getSubmersionCost`/`submerge` (`career.ts:599–635`). Formula used: `INITIATION_BASE(10) + newGrade × INITIATION_MULTIPLIER(3)` where `newGrade = current+1`. **Discounts are entirely missing.**
- Metamagic/echo slots derive as `initiateGrade − metamagics.length` (`CareerAdvancement.svelte:284–290`).
- XML: scalar `<initiategrade>`/`<submersiongrade>` only (`exporter.ts:98,100`; `importer.ts:666,686`).

### Plan corrections (desktop is authority — `clsUnique.cs:8220–8240`)
- Desktop `InitiationGrade` fields are **`{grade, group, ordeal, technomancer, notes}`** — there is **no `schooling`**. Drop schooling from the plan.
- Discounts are **−0.2 for group and −0.2 for ordeal** (not −0.1). `KarmaCost = ceil((10 + grade × KarmaInitiation) × (1 − 0.2·group − 0.2·ordeal))`, `KarmaInitiation` default = 3.
- `grade` in the formula is the **target grade number** (grade being created), matching the current web `newGrade`.

### Design
```ts
// types/character.ts (new)
export interface InitiationGrade {
  readonly id: string;
  readonly grade: number;        // 1-based target grade this entry represents
  readonly group: boolean;       // group (magician) / network (technomancer)
  readonly ordeal: boolean;      // ordeal (magician) / task (technomancer)
  readonly technomancer: boolean;
  readonly notes: string;
}
// CharacterMagic: add   readonly initiations: readonly InitiationGrade[];
// CharacterResonance: add readonly submersions: readonly InitiationGrade[];
// Keep initiateGrade / submersionGrade as DERIVED counts (= list.length) for back-compat.
```
- New pure cost helper (place in `engine/` or `career.ts`, keep <60 lines):
```ts
export function initiationGradeCost(targetGrade: number, group: boolean, ordeal: boolean): number;
// return Math.ceil((10 + targetGrade * 3) * (1 - (group?0.2:0) - (ordeal?0.2:0)))
```
- `initiate`/`submerge` gain `{ group?: boolean; ordeal?: boolean }` params; push an `InitiationGrade` (grade = `list.length + 1`) and keep `initiateGrade`/`submersionGrade` in sync as `list.length`.
- **Firestore migration (MC4):** existing saves have `initiateGrade: N` but no `initiations`. Add the backfill as an **idempotent function in `stores/migrations.ts`, chained in `migrateCharacter` AFTER #82's metamagic migration** (chain order: #82's string→`CharacterMetamagic` conversion first, then this initiation backfill; both touch `CharacterMagic` on disjoint fields). If `initiations` is absent, synthesize `N` bare grades `{grade:i, group:false, ordeal:false, ...}`. Do the mirror for submersion. Keep the scalar writeable derived value so old readers keep working. (#99 must not re-add `initiations` — it reverts the test literal; this migration is the only producer for legacy saves.)
- Metamagic/echo slots: change `CareerAdvancement.svelte:284–290` to `initiations.length − metamagics.length` (equivalent while the derived count is maintained; prefer the list to make intent explicit).

### Implementation steps
1. Add `InitiationGrade` type + `initiations`/`submersions` fields; update `schemas.ts` Zod + `createEmptyCharacter` (`character.ts:400` area) with `initiations: []`. → verify: `npm run check`.
2. Add `initiationGradeCost`; refactor `getInitiationCost`/`initiate`/`getSubmersionCost`/`submerge` to use it and to append list entries + sync derived count. → verify: unit test below.
3. Migration: idempotent backfill of `initiations`/`submersions` from scalars in `stores/migrations.ts`, chained in `migrateCharacter` after #82's metamagic migration (MC4); the XML importer path (~666,686) reuses the same function. → verify: import a legacy XML fixture, assert list length; running the migration twice equals once.
4. XML export: replace scalar with `<initiationgrades><initiationgrade><grade/><group/><ordeal/><res/><notes/></initiationgrade>…` per `clsUnique.cs:8110–8120`; keep emitting `<initiategrade>` scalar for compatibility. Import parses the list, falling back to scalar. → verify: round-trip test.
5. Update slot derivation in `CareerAdvancement.svelte`. → verify: `npm run check` + manual.

### Test plan (new `career.test.ts` cases)
- `initiationGradeCost(1,false,false)` = 13; `(2,false,false)` = 16; `(3,false,false)` = 19.
- `(1,true,false)` = `ceil(13×0.8)` = **11**; `(1,false,true)` = 11; `(1,true,true)` = `ceil(13×0.6)` = **8**.
- `(4,true,true)` = `ceil(22×0.6)` = **14**.
- Submersion parity: `initiationGradeCost` reused → `(1,false,false)` = 13.
- `initiate({group:true})` from grade 0 with 20 karma → success, `initiations.length===1`, `initiateGrade===1`, karma 9.
- Migration: character `{initiateGrade:3}` no `initiations` → after load `initiations.length===3`.

### Dependencies
- #99 (type-error triage / in-flight cleanup) should land first so `improvements`/foci relocation is settled. No hard dep on other epic issues.

### Size: **L** (type + schema + migration + XML + career + UI).

### Risks & edge cases
- Double-counting: never let both the scalar and the list drift — treat the list as source of truth, derive the scalar on every write.
- exactOptionalPropertyTypes: `initiate` optional params must be `group?: boolean` handled with explicit defaults, not `undefined` spread into the object.
- Technomancer flag must be set true for submersion entries (affects XML `<res>` and display strings).

---

## Issue #85: Complete the foci system

### Verified current state
- `CharacterFocus` (`types/equipment.ts:481–489`) already has `improvements: readonly Improvement[]`; `equipment.foci` exists (`equipment.ts:514`). `StackedFocus` (`types/equipment.ts:494–498`) is declared but not referenced by `CharacterEquipment` — dead.
- `bondFocus`/`unbondFocus` (`magic.ts:411–487`) only flip `bonded` and add/refund karma; **never populate `focus.improvements` nor `char.improvements`.** `getFocusKarmaCost` (magic.ts:411) uses Power Focus ×4 — **wrong for SR4**.
- `addFocus(name,category,force,costMultiplier)` (`equipment.ts:149`) computes `cost = force × costMultiplier` from the **hardcoded** 10000/25000 passed by `FociSelector.svelte:43–44`.
- `gear.json` Foci items have `cost: null` because the converter does `Number("Rating * 25000") → NaN → null` (`convert-xml-to-json.ts:1097`) and the `GearItem` interface (1069–1077) **drops the `<bonus>` node entirely**.
- The web `career.ts:48–66` `FOCUS_BONDING_COSTS` table (POWER:6, SPELLCASTING:2, SUSTAINING:2, WEAPON:3, CENTERING:3, MASKING:5, SHIELDING:4, etc.) holds **SR4A** values that diverge from the desktop authority — do **not** treat it as correct SR4. Desktop `clsOptions.cs:841–855` field defaults are the effective runtime multipliers because `bin/settings/default.xml` has **no** `<karmacost>` section and `clsOptions.Load()` (clsOptions.cs:1693–1715) wraps the focus reads in a single try/catch whose first `SelectSingleNode(...).InnerText` throws a swallowed NullReferenceException, leaving the field initializers in force: **POWER:8, SPELLCASTING:4, CENTERING/MASKING/SHIELDING:6** (SUSTAINING:2 and WEAPON:3 already agree). Reconcile `FOCUS_BONDING_COSTS` to the desktop defaults (or document an intentional SR4A deviation); still drop the magic.ts stub's Power ×4.

### Desktop authority (`clsUnique.cs:4591–4661`, `bin/data/gear.xml`)
- Bonding karma = `Σ (focus.force × KarmaXFocus)` per focus name (`clsUnique.cs:4591` `BindingCost`); the multipliers are the desktop `clsOptions.cs` focus-karma defaults (POWER:8, SPELLCASTING:4, SUSTAINING:2, WEAPON:3, CENTERING/MASKING/SHIELDING:6), **not** the current SR4A `FOCUS_BONDING_COSTS`.
- Nuyen cost formulas (per Force): Power `Rating × 25000`; Weapon `Rating × 10000`; Spellcasting/Counterspelling/etc `Rating × 15000`. Verify each against `gear.xml` — do not assume uniform.
- Bonus nodes to map: `<skillattribute><name>MAG</name><bonus>Rating</bonus><exclude>Counterspelling</exclude>` (Power Focus → `SkillAttribute` type, improvedName `MAG`, val=force, exclude preserved); `<spellcategory><name>Combat</name><val>Rating</val>` (Spellcasting Focus → `SpellCategory` type, improvedName=category, val=force); Weapon Focus `<selecttext/>` (astral weapon — no numeric improvement, store selected text only).
- Focus addiction cap: bonded foci total Force ≤ MAG × 5 (SR4 core p.199).

### Design
- **Converter (`convert-xml-to-json.ts`):** add `cost: string` (preserve formula) and `bonus: unknown` to `GearItem` for the Foci/Metamagic Foci categories (or a dedicated `foci` export). Do NOT force `Number()`. A runtime helper resolves `"Rating * N"` × force.
```ts
// engine or utils
export function resolveFocusNuyenCost(costFormula: string, force: number): number; // "Rating * 25000",3 => 75000
export function getFocusBondingKarma(name: string, category: string, force: number): number; // uses FOCUS_BONDING_COSTS
export function buildFocusImprovements(focus: CharacterFocus, bonusData: unknown): Improvement[]; // maps skillattribute/spellcategory
```
- **bondFocus (supersede magic.ts stub):** `(focusId) => { success, error }`. Validates: focus exists, not bonded, awakened, karma ≥ bonding cost (career) / chargen karma pool (creation), and **force cap** `sumBondedForce(incl. this) ≤ MAG×5`. On success: set `focus.bonded=true`, `focus.improvements = buildFocusImprovements(...)`, append those to `char.improvements` (source `'Focus'`, sourceName = focus.id), deduct karma. Immutable spread.
- **unbondFocus:** `{ success, error }`; `removeImprovements(char.improvements,'Focus',focusId)` (helper exists, `improvementManager.ts:75`), clear `focus.improvements`, set bonded false, refund karma only in creation mode (career = spent karma, not refunded — match `initiate`).
- **Stacking:** wire `StackedFocus` into `CharacterEquipment` as `readonly stackedFoci: readonly StackedFocus[]`. `StackedFocus` needs `bonded: boolean` + `focusIds: readonly string[]` (generalize beyond primary/secondary — desktop stores a gear list, `clsUnique.cs:4484`). `stackFoci(focusIds[])`/`unstackFoci(id)`: a bonded stack acts as one focus with combined force = Σ member forces; bonding karma = Σ member `force×mult` (`BindingCost`, `clsUnique.cs:4591`); member foci must be individually unbonded (Street Magic). Force cap counts stack combined force once.
- **Consumption gap (critical):** `SkillAttribute` and `SpellCategory` improvement types are **not read by any calc today**. The `skillattribute`/`spellcategory` **producer handlers in `createImprovementsFromBonus` (`improvementManager.ts:102`) are owned by #68** (engine epic, Tier-1) — #85 **does not** add its own emit handlers (DUP2); `buildFocusImprovements` reuses #68's handlers. #85 owns only the **consumer** side: add `valueOf(char.improvements,'SkillAttribute',<attr>)`/`'SpellCategory'` reads wherever skill/spell dice pools are computed (pools are currently computed in components, not engine — locate and wire, or add engine helpers). Without these reads a bonded Power Focus changes nothing.
- **Firestore migration:** add `stackedFoci: []` default; existing `foci` entries lack `improvements` → default `[]`; unbonded foci need no backfill (improvements only exist while bonded).

### Implementation steps
1. Converter: preserve foci `cost` formula + `bonus`; regenerate `gear.json`. → verify: `npm run convert-data` then assert Power Focus `cost==="Rating * 25000"` and `bonus` present.
2. Add `resolveFocusNuyenCost`/`getFocusBondingKarma`/`buildFocusImprovements`; update `FociSelector.svelte:41–47` + `addFocus` to use resolved cost (drop the `costMultiplier` param). → verify: unit tests.
3. Rewrite `bondFocus`/`unbondFocus` (populate/remove improvements, force cap, `{success,error}`). Delete the stub `getFocusKarmaCost`. → verify: bond/unbond lifecycle test.
4. Add `stackedFoci` to type + equipment store `stackFoci`/`unstackFoci`. → verify: stacking test.
5. Wire `SkillAttribute`/`SpellCategory` consumption into pool calc. → verify: pool test.
6. Foci management panel in `CareerAdvancement.svelte` Magic tab (bond/unbond/stack). → verify: `npm run check` + manual.
7. XML export/import `<foci><focus>` + `<stackedfoci>` per `clsUnique.cs:4394–4413,4499–4510`. → verify: round-trip.

### Test plan
- `resolveFocusNuyenCost("Rating * 25000",3)` = 75000; Weapon `"Rating * 10000",2` = 20000.
- `getFocusBondingKarma("Power Focus","Foci",3)` = 24 (3 × 8); `("Spellcasting Focus (Combat)","Foci",4)` = 16 (4 × 4).
- bond Power Focus F3 with MAG 5, 30 karma → success (cost 24); `char.improvements` gains a `SkillAttribute/MAG` val 3 (exclude "Counterspelling"); MAG-linked skill pool +3. unbond → improvement gone, pool reverts. (career mode: karma not refunded.)
- Force cap: MAG 4 (cap 20), bonded foci summing 18, bond F3 → fail (`21>20`); bond F2 → success.
- Stack two Sustaining F2 → combined force 4, bonding karma `Σ 2×2=8`; force cap counts 4 once.

### Dependencies
- Relies on in-flight `char.improvements` + `equipment.foci` relocation (#99). No dep on #84.

### Size: **XL** (converter + cost engine + improvement lifecycle + stacking + pool wiring + panel + XML).

### Risks & edge cases
- `noUncheckedIndexedAccess`: `gear.json` `bonus` is loosely typed — validate shape before mapping (guard `skillattribute`/`spellcategory` presence).
- Metamagic Foci (Centering/Masking/etc.) may have no numeric bonus — store improvements `[]` but still charge bonding karma.
- Weapon Focus `selecttext` needs a selection UI value; without it store name only, no improvement.
- Don't double-apply: focus improvements live on BOTH `focus.improvements` (for removal) and `char.improvements` (for aggregation) — keep them consistent; `removeImprovements` by sourceName=focus.id is the single removal path.
- ESLint complexity 10 / max-depth 3: `buildFocusImprovements` bonus-node switch may exceed limits — split per bonus type.

---

## Issue #86: Creation-time initiation and metamagic UI

### Verified current state
- Metamagic learning UI exists only in career (`CareerAdvancement.svelte:537–571`, now data-driven from `metamagics` store); echo UI at `:598–630` from `echoes` store.
- `MagicSelector.svelte` (wizard) has tabs `tradition | spells | powers | foci` (in-flight) — **no initiation/metamagic controls**; technomancer flow `stream | forms` — no submersion/echo controls.
- Career store has `learnMetamagic`/`learnEcho`/`initiate`/`submerge` (`career.ts`) but they gate on `status === 'career'` and spend `char.karma`.

### Design
- After #84, chargen initiation reuses the same grade-list model + `initiationGradeCost`. Add creation-mode entry points that do NOT require career status. Prefer new thin wrappers in `stores/magic.ts`/`technomancer.ts` (`initiateAtCreation`, `addMetamagicAtCreation`, `submergeAtCreation`, `addEchoAtCreation`) rather than loosening the career-mode guard, so career semantics stay isolated. Each returns `{ success, error }`.
- **Cost source at chargen (OPEN — see Open Questions):** SR4 chargen initiation costs Karma, drawn from the character's chargen Karma pool. The web has `char.karma`; confirm BP builds expose a spendable karma pool (BP→karma leftover). Wrappers spend `char.karma` and validate `≥ cost`; do not add a `BuildPointAllocation` line for initiation (desktop has none).
- `MagicSelector.svelte`: add an **Initiation** section (visible when `magic` present and build rules permit) showing current grade, group/ordeal checkboxes, computed cost line (`initiationGradeCost`), Initiate button; a **Metamagic picker per grade** (reuse `metamagics` store list; slot count = `initiations.length − metamagics.length`). Technomancer flow: mirror with submersion + echo picker (`echoes` store).
- No new persisted fields beyond #84/#85; metamagics/echoes are `readonly CharacterMetamagic[]` (from #82, not `readonly string[]`) — the metamagic/echo pickers render `m.name` (D4/I2).

### Implementation steps
1. Add creation-mode wrappers (magic.ts / technomancer.ts) delegating to shared cost helper; guard on creation status + karma. → verify: unit tests.
2. Initiation + metamagic UI section in `MagicSelector.svelte` (magician/adept). → verify: `npm run check` + manual build of a grade-1 initiate.
3. Submersion + echo UI in the technomancer branch. → verify: manual.
4. Wire karma validation display (disable buttons when `karma < cost`). → verify: manual.

### Test plan
- `initiateAtCreation({group:false,ordeal:false})` with `karma≥13` on a grade-0 magician → success, `initiations.length===1`, karma −13.
- With one grade, `addMetamagicAtCreation('Centering')` → success (slot available); a second before another grade → fail (no slot).
- Full chargen: grade-1 initiate + 1 metamagic total cost = 13 karma, matching desktop.
- Insufficient karma → `{success:false}` and no mutation.

### Dependencies
- **Hard dep on #84** (grade list + `initiationGradeCost`) and on **#82** (`CharacterMetamagic[]` shape — render `.name`; D4/I2). Shares the `metamagics`/`echoes` gamedata stores already added in-flight.

### Size: **M** (UI + thin store wrappers, model already built in #84).

### Risks & edge cases
- BP builds may not currently surface a chargen karma balance — if not, this blocks (see Open Questions); do not silently spend from a nonexistent pool.
- Build-rule gating: only magicians/adepts (magic present, MAG-based) may initiate; technomancers submerge. Guard both.
- Keep career and creation paths from diverging on cost — both must call the single `initiationGradeCost`.

---

## Issue #87: Complex form ratings and career improvement

### Verified current state
- `ComplexForm` (`character.ts:305–312`) already has `rating: number`. Both creation `addComplexForm` (`technomancer.ts:41–74`) and career `learnComplexForm` (`career.ts:637–682`) hardcode `rating: 1`; no rating picker, no improve path.
- `IMPROVE_COMPLEX_FORM_MULTIPLIER: 1` (`career.ts:33`) declared, unused. `NEW_COMPLEX_FORM: 5` used for career learn cost. Chargen `addComplexForm` charges flat 5 BP (`technomancer.ts:66–69`).
- `programs.json` (71 entries, all `complexform:true`) has **no options and no maxRating** — keys are `name,category,complexform,source,page`.

### Plan corrections (desktop is authority)
Web costs do **not** match desktop; desktop defaults (`clsOptions.cs:808–826`, `frmCreate.cs:15925–15968`, `frmCareer.cs:5536,7603`):
- **Chargen BP build:** `BP = Rating × BPComplexForm` where `BPComplexForm = 1` → **Rating × 1 BP** (not flat 5). (Alternate optional rule = `BPSpell` = 3 flat — out of scope.)
- **Chargen Karma build:** first point = `KarmaNewComplexForm = 2`; each point i from 2..Rating adds `i × KarmaImproveComplexForm` = `i × 1`. Totals: R1=2, R2=4, R3=7, R4=11.
- **Career new complex form:** flat `KarmaNewComplexForm = 2` (web uses 5 — correct to 2).
- **Career improve R→R+1:** `(R+1) × KarmaImproveComplexForm = (R+1) × 1`.
- **Rating cap:** `min(program.MaxRating, RES)`; since data has no MaxRating, cap = **RES total** only.
- TechProgramOption: desktop supports options (`frmCareer.cs:7603`, `ImproveComplexFormOption`) but `programs.json` carries none → **skip options with documented rationale**; do not invent a converter change.

Recommend adding `KARMA_COSTS.NEW_COMPLEX_FORM = 2` correction and a `BP_COMPLEX_FORM = 1` constant; note any consumer of the old `5` and keep spells (5) untouched.

### Design
- Creation `addComplexForm` gains `rating` (validate `1 ≤ rating ≤ RES total`); BP delta on the `complexForms` allocation bucket = `rating × 1` (replace flat 5). Keep signature returning current void or upgrade to `{success,error}` if surrounding wizard code tolerates it (check callers before changing return type).
- Career `learnComplexForm`: cost = `KARMA_COSTS.NEW_COMPLEX_FORM` (2); accept an optional starting `rating` and, if >1, add `Σ_{i=2}^{R} i × IMPROVE_COMPLEX_FORM_MULTIPLIER` on top (mirror desktop chargen karma) — or restrict career-learn to rating 1 and require successive `improveComplexForm` calls (simpler, matches desktop career UX). Pick the latter unless the wizard needs multi-rating career learn.
- New `improveComplexForm(formId): { success, error }` in `career.ts`: `cost = (form.rating + 1) × KARMA_COSTS.IMPROVE_COMPLEX_FORM_MULTIPLIER`; gate `status==='career'`, `rating+1 ≤ RES`, karma ≥ cost; `spendKarmaInternal`; immutably bump `form.rating`. Wire into the technomancer tab of `CareerAdvancement.svelte` (Complex Forms list, per-form "Improve (N karma)" button, disabled at RES cap or insufficient karma).
- No new persisted fields (`rating` already on `ComplexForm`). No Firestore migration.

### Implementation steps
1. Add rating picker + `rating × 1` BP to creation `addComplexForm`; cap at RES. → verify: unit test on BP delta.
2. Correct career `learnComplexForm` cost to 2; add `improveComplexForm`. → verify: unit tests.
3. Career UI: rating display + improve button in `CareerAdvancement.svelte` resonance tab. → verify: `npm run check` + manual.
4. Complex forms serialize as `<techprogram>` inside `<techprograms>` — **owned by #80b `writeTechPrograms` (emits `rating`/`maxrating`) and #81 `parseTechPrograms` (reads them)**; #87 does **not** add its own `<complexform>` writer/parser (that element does not exist in the desktop format; C5). #87 only needs to **verify** `rating` threads through the techprogram round-trip. → verify: round-trip test asserting rating survives export→import via the #80b/#81 techprogram path.

### Test plan
- Creation BP: `addComplexForm(rating 3)` on RES 4 → `buildPointsSpent.complexForms += 3`; `rating 5` on RES 4 → rejected.
- Career learn: flat 2 karma, rating 1.
- `improveComplexForm` R1→R2 = 2 karma; R2→R3 = 3 karma; R3→R4 = 4 karma; at rating==RES → fail.
- Chargen karma-build total (if multi-rating supported): R3 = 7 karma.
- XML round-trip preserves rating 3.

### Dependencies
- Independent of #84/#85/#86. Touches `career.ts` (shared with epic Career Mode Completion #88 expense-undo — see cross-epic).

### Size: **M**.

### Risks & edge cases
- Changing `NEW_COMPLEX_FORM` 5→2 and chargen 5→`rating×1` alters existing character BP/karma totals — this is an intentional parity fix; call it out in the PR and check no test asserts the old 5.
- RES total must use the augmented/total value (`getAttributeTotal(char,'res')`), not base, for the cap.
- `improveComplexForm` return-type change vs current void `learnComplexForm` — keep new fn `{success,error}`; don't retrofit callers of the old one unnecessarily.
- ESLint max-lines-per-function 60: keep `improveComplexForm` lean (validate → spend → update).

<!-- EPIC COMPLETE -->

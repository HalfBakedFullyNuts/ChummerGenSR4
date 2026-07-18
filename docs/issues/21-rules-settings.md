# Epic: Rules Enforcement & Settings (Phase 21)

Issues **#93–#96**. Parent plan: [../FEATURE_PARITY_PLAN.md](../FEATURE_PARITY_PLAN.md) (Part III, "Epic: Rules Enforcement & Settings").

**Implementation order (within epic):**
1. **#93** first — it introduces the avail parser (`$engine/availability.ts`) that #96 reuses. Hard-depends on **#82** (owned items must carry `avail`).
2. **#94** independent of #93; can proceed in parallel. Fixes a live name/code bug (see below).
3. **#95** (house rules) is the largest; it relocates `CharacterSettings` from constants and touches cost/validation across epics — schedule after #93/#94 land to avoid churn.
4. **#96** last — presentation layer over #93's parser + #82's `avail`/`source` fields.

**Cross-cutting facts verified once (used by all issues):**
- Owned-item types (`CharacterWeapon` L66, `CharacterArmor` L131, `CharacterCyberware` L209, `CharacterBioware` L263, `CharacterVehicle` L318, `CharacterGear` L406 in `src/lib/types/equipment.ts`) carry **neither `avail` nor `source`**. Only the `Game*` variants do. → #82 is a hard prerequisite for #93 and #96.
- Item `source` in all `static/data/*.json` is a book **CODE** (`"AR"`, `"SR4"`, `"RC"`, …), matching desktop `BookXPath()` (`clsOptions.cs:2104`), which builds `source = "CODE" or …`.
- `Character.improvements: readonly Improvement[]` (`character.ts:202`) already exists; `RestrictedItemCount` is a live improvement type (`src/lib/types/improvements.ts:67`, `improvementManager.ts` maps `restricteditemcount`), populated by Restricted Gear quality (`qualities.json:2874+`). Query via `valueOf(char.improvements, 'RestrictedItemCount')` (`improvementManager.ts:18`). **Disambiguation:** two `improvements` modules exist — `src/lib/types/improvements.ts` (the `ImprovementType` union, including `RestrictedItemCount`) and `src/lib/engine/improvements.ts` (a different `Improvement` interface with `target`/`value`; its L67 is just a comment). Every `improvements.ts:NN` citation in this epic means **`types/`** unless it says `engine/`. CLAUDE.md's key-files table lists only `engine/improvements.ts`, so open the `types/` file for these type references.
- **Add-fn module is resolved by the time this epic runs (C1):** #62a/#75 (M8/M9) delete the `stores/character.ts` duplicates and make `stores/equipment/` the single canonical module — wire enforcement into `stores/equipment/` only; there is no second copy to wire by M12.

---

## Issue #93: Enforce maximum availability at creation

**Labels:** `epic:rules`, `priority:high` · **Size: M**

### Verified current state
- `appSettings.ts:22` `maxAvailability: 12` (app default); `character.ts:339` per-character `maxAvailability: 12` in `DEFAULT_CHARACTER_SETTINGS`, exposed on `Character.settings` (`character.ts:234`). Enforcement is the source of truth to read — prefer `char.settings.maxAvailability`, falling back to app default only for new-character UI.
- `validation.ts:422–423` is a comment-only no-op (not 422 literal code). Replace with a real check.
- No avail parser exists anywhere (`grep parseAvail` → none).

### Design
New util `src/lib/engine/availability.ts`:

```ts
export type AvailRestriction = '' | 'R' | 'F';

export interface ParsedAvail {
  readonly value: number;          // resolved numeric avail at given rating
  readonly restriction: AvailRestriction;
  readonly isModifier: boolean;    // leading '+' → adds to parent (accessory/mod)
  readonly formula: string;        // original string, for diagnostics
}

// rating defaults to the item's current rating (1 when unrated)
export function parseAvail(raw: string, rating?: number): ParsedAvail;

// Grammar (from static/data survey — cover ALL of these):
//   PLAIN:     "12"            → {value:12}
//   SUFFIX:    "12R" | "12F"   → restriction R/F  (note stray "24FF" exists → treat as F, log)
//   MODIFIER:  "+4R" | "+Rating" | "+(Rating - 3)" | "+(Rating)"  → isModifier:true
//   RATING:    "Rating", "Rating * 3", "Rating + 2", "(Rating * 4) + 4R", "12 + Rating"
//   FIXED:     "FixedValues(0,4,6,8)" → index by rating (1-based); "FixedValues(4R,4R,8R)"
//   ZERO:      "0" | "" | undefined → {value:0}
```
Parse: strip trailing `R`/`F` (restriction), detect leading `+` (modifier), `FixedValues(...)` picks the `rating`-th csv entry (clamp to bounds), else substitute `Rating`→rating into the arithmetic and eval a **restricted** `(*, +, -, parens)` evaluator (no `eval()`; hand-rolled or a tiny shunting-yard — TS-strict, complexity ≤10).

Enforcement helper (same file):
```ts
export interface AvailCheck { readonly allowed: boolean; readonly reason?: string; }
export function checkAvailability(
  parsed: ParsedAvail, cap: number, restrictedBudgetRemaining: number
): AvailCheck;   // allowed if value<=cap OR (value>cap && restrictedBudgetRemaining>0)
```

### Implementation steps
1. Add `availability.ts` with `parseAvail` + unit tests covering every grammar row above. → `npm run test -- availability`
2. Add `getRestrictedBudget(char)` = `valueOf(char.improvements,'RestrictedItemCount')` minus count of currently-owned items whose parsed value > cap. Helper in `availability.ts` or `validation.ts`. → covered by test in step 4.
3. Replace `validation.ts:422–423` no-op with `validateAvailability(char)`: iterate all owned items carrying `avail` (needs #82), parse each, push `AVAIL_EXCEEDED` (severity `error`) when over cap and budget exhausted. → `npm run test -- validation`
4. Gate purchases: in the canonical add-fns (see cross-cutting note), before committing, resolve `parseAvail(game.avail, rating)` and refuse the add when `!allowed` and `char.status==='creation'`. Career mode (#92) warns instead of blocks. → new test in `equipment.test.ts`
   - **Return-type note (resolved by C6/I1):** the top-level `add*` signature change lands **once, in #92** (M11, the first career issue to touch them): `add*` return the unified `MutationResult = { success: boolean; error?: string; id?: string }` (new item's id in `.id`). By the time #93 (M12) wires this gate, the signatures already exist — **#93's gate simply reads `.success`/`.error` from the add-fn result**; do not introduce a second result shape or re-change the signatures here. The step-4 `equipment.test.ts` test asserts on that returned `MutationResult`.
5. Selector UI: add derived `isAffordableAvail`/greyed flag + a "show unavailable" toggle in the relevant `wizard/*Selector.svelte`. (UI-only; no logic in `.svelte`.)

### Test plan
- `parseAvail("12F")` → `{value:12,restriction:'F',isModifier:false}`.
- `parseAvail("Rating * 3", 4)` → `{value:12}`.
- `parseAvail("(Rating * 4) + 4R", 2)` → `{value:12,restriction:'R'}`.
- `parseAvail("FixedValues(0,4,6,8)", 3)` → `{value:6}`.
- `parseAvail("+4R")` → `{value:4,restriction:'R',isModifier:true}`.
- Add avail-20 gear, cap 12, no Restricted Gear → purchase rejected + `AVAIL_EXCEEDED`.
- Same with Restricted Gear (Rating 1) improvement → first over-cap item allowed, second rejected.
- Avail-12 gear, cap 12 → allowed (boundary inclusive).

### Dependencies
- **#82** (hard for step 3 only): step 3 validates already-**owned** items, which must carry `avail` — untestable before #82. Steps 1 (parser), 4 (purchase gate) and 5 (selector greying) are all testable pre-#82: they read `avail` off the incoming `Game*` item (`GameWeapon.avail` `equipment.ts:59`, `GameArmor.avail` L124, `GameCyberware.avail` L199, `GameGear.avail` L396 already exist), not off owned items. Do not gate steps 1/4/5 on #82.
- **#92**: defines career-mode warn-vs-block behavior for step 4, lands the unified `MutationResult` add-fn signatures (C6), and ships a numeric-prefix stopgap avail parser marked `TODO(#93)` (D3 — career is M11, this epic M12, so #92 cannot wait). **#93's `parseAvail` replaces that stopgap in-place when it lands**; the #92↔#93 mutual reference is not circular because #93 keys on `char.status`, not on #92.

### Risks & edge cases
- Nested accessory/mod avail (leading `+`, e.g. weapon mods) should sum onto the base item's avail for a faithful total; **defer full summation** — MVP checks base item only, note divergence. Note there is currently no per-mod avail field to sum from: `ArmorModification` (`equipment.ts:146-152`) has no `avail`, and `CharacterArmor` (L131-143) has no avail modifier. The only real avail-modifier field is cyberware **grade** avail (`CyberwareGradeMultiplier.availModifier` L181, e.g. Used = -1), which SHOULD be summed onto grade-bearing cyberware — do not confuse it with an armor field.
- `"24FF"` malformed double-suffix — normalize to single `F`, log once.
- Rating unknown at parse time for rating-scaled gear → default rating 1 (matches desktop min).

<!-- ISSUE 93 COMPLETE -->

---

## Issue #94: Wire sourcebook filtering into game data queries

**Labels:** `epic:rules`, `priority:medium` · **Size: M**

### Verified current state
- **Live bug**: `settings/+page.svelte:7` builds toggles from `b.name` and `toggleSourcebook` stores **book names** into `enabledSourcebooks`, but the default is codes `['SR4','SR4A']` (`appSettings.ts:17`) and every item's `source` is a **code**. So the persisted array can hold a mix of names and codes and matches nothing. Also `'SR4A'` is not a code in `books.json` (only `SR4` exists) — the SR4A anniversary content shares the `SR4` code or others; drop `SR4A` from the default or map it.
- `gamedata.ts` derived stores that expose item lists and **must be filtered** (exhaustive, all in `src/lib/stores/gamedata.ts`): `metatypes` L553, `skills` L556 (skip — skills are book-agnostic? verify `source` presence), `qualities` L559, `positiveQualities` L562, `negativeQualities` L567, `spells` L572, `powers` L575, `traditions` L578, `mentors` L581, `programs` L584, `weapons` L649, `armor` L652, `cyberware` L655, `gear` L658, `lifestyles` L661, `bioware` L732, `vehicles` L760, `drones` L769, `martialArts` L793, `echoes` L811, `streams` L814, `metamagics` L837. **Do NOT filter** `books` L840, `ranges` L843, `programCategories`/`biowareCategories`/`vehicleCategories` (derive those from the *filtered* lists instead).
- Finder fns (`findMetatype` L596, `findWeapon` L670, `findGear` L694, etc.) and `filter*ByCategory` fns take raw `GameData` and must **not** silently hide owned items on lookup (guard rule below) — leave finders unfiltered; filter only the pickers/derived list stores.

### Design
New helper in `gamedata.ts` (or `$engine/sourcebooks.ts`):
```ts
export function filterBySources<T extends { source?: string }>(
  items: readonly T[], enabledCodes: readonly string[]
): T[];   // enabledCodes empty ⇒ return all (preserve current behavior)
```
Filtering must be driven by `appSettings.enabledSourcebooks` **as codes**. Convert the derived stores to `derived([gameData, appSettings], ...)`. Because `appSettings` lives in `$stores/appSettings` and `gamedata.ts` currently derives from `gameData` only, import `appSettings` there.

**Fix the settings UI (part of this issue):** store **codes**, render **names**. `settings/+page.svelte` should map each `book.code`↔`book.name`, checkbox keyed by `code`, label shows `name`. Migrate any legacy name-based persisted arrays on load (best-effort: map known names→codes, drop unknowns).

**Default = all enabled:** change `DEFAULT_SETTINGS.enabledSourcebooks` to `[]` sentinel meaning "all" (simplest, matches "default all books enabled" AC and avoids listing ~60 codes). `filterBySources([]) ⇒ all`.

### Implementation steps
1. Add `filterBySources` + tests (empty→all, unknown code→excluded, mixed). → `npm run test -- sourcebooks`
2. Convert the ~22 derived list stores above to two-input `derived([gameData, appSettings])` applying `filterBySources($data.X, $settings.enabledSourcebooks)`; rebuild category stores from filtered lists. → `npm run check`
3. Fix `settings/+page.svelte` to key on codes; add legacy name→code migration in `appSettings.ts` init. → manual + `npm run check`
4. **Owned-item guard**: character sheet / edit views read owned items directly from `Character`, not from filtered pickers, so disabling a book after purchase does not remove owned gear — verify no view resolves owned items *through* a filtered store. Add a test that a character with an Arsenal weapon still renders it with Arsenal disabled. → `equipment.test.ts`

### Test plan
- `filterBySources(weapons, ['SR4'])` → only `source:"SR4"` weapons; Arsenal (`AR`) weapons absent.
- `filterBySources(weapons, [])` → identical length to unfiltered.
- Disable Arsenal in settings → `get(weapons)` excludes `AR`; re-enable → returns.
- Character owning an `AR` weapon: sheet still shows it with `AR` disabled.

### Dependencies
- None hard. Independent of #93. Shares the `source`-is-a-code fact with #96.

### Risks & edge cases
- Odd `source` values like `"2050"` (weapons.json) — treat as its own code; only shown if `2050` is enabled. Ensure `books.json` has a matching entry or it becomes permanently hidden when default switches away from "all".
- Reactivity cost: 22 stores now depend on `appSettings` → every settings write recomputes all lists. Acceptable (lists are small, ~1MB total), but do not filter inside hot render loops.
- `exactOptionalPropertyTypes`: `source?: string` items with `source` absent are treated as always-enabled (never hidden).

<!-- ISSUE 94 COMPLETE -->

---

## Issue #95: House rules (CharacterOptions port)

**Labels:** `epic:rules`, `priority:medium` · **Size: XL**

### Verified current state
- `CharacterSettings` **already exists on the character** (`character.ts:234` → interface `types/character.ts:329`): `maxAvailability, startingBP, startingKarma, startingNuyen, ignoreRules`. This issue **extends** it, not creates it — no new Firestore top-level field needed (it already persists inside the character document).
- Cost constants are **hard-coded and duplicated**: `KARMA_BUILD_COSTS` in `stores/character.ts:70` **and again** in `stores/creation.ts:35` (dedupe as part of this issue). BP costs are scattered across `stores/attributes.ts`, `skills.ts`, `knowledgeSkills.ts`, `creation.ts`.
- **Resources→nuyen is NOT linear today.** BP spent on resources is converted by a **stepped SR4-core table** `BP_TO_NUYEN_RATES` / `bpToNuyen()` (`src/lib/types/equipment.ts:617-637`), called by `setResourcesBP` (`character.ts:1996`). Sample points: 5 BP→20,000¥, 10 BP→50,000¥, 20 BP→90,000¥, 30 BP→150,000¥, 50 BP→275,000¥. These are locked in by tests in `src/lib/types/__tests__/equipment.test.ts` (e.g. `bpToNuyen(5)=20000`, `(20)=90000`, `(50)=275000`). This diverges from desktop, whose `NuyenPerBP` is a **linear** multiplier — do not assume linear here.
- Desktop source of truth: `clsOptions.cs` (defaults read from private initializers at L733–793) + cost table L3135–3617.

### ~15 highest-impact desktop options to port (name → default)
Booleans (`clsOptions.cs`): `FreeContacts`→false, `FreeKarmaKnowledge`→false, `IgnoreArmorEncumbrance`→false, `NoSingleArmorEncumbrance`→false, `ESSLossReducesMaximumOnly`→false, `MetatypeCostsKarma`→false, `ExceedPositiveQualities`→false, `ExceedNegativeQualities`→false, `MultiplyRestrictedCost`→false, `MultiplyForbiddenCost`→false, `EnforceCapacity`→**true**, `UnrestrictedNuyen`→false, `StrengthAffectsRecoil`→false, `MoreLethalGameplay`→false, `SpecialKarmaCostBasedOnShownValue`→false.
Numerics: `NuyenPerBP`→5000 (**desktop default; NOT adopted as-is on web — see nuyenPerBp reconciliation below**), `FreeContactsMultiplier`→2, `FreeContactsFlatNumber`→0, `MetatypeCostsKarmaMultiplier`→1, `RestrictedCostMultiplier`→1, `ForbiddenCostMultiplier`→1, `EssenceDecimals`→(desktop default; verify — likely 2).

### Design
Extend `CharacterSettings` (all `readonly`, all defaulted so existing saves stay valid under `exactOptionalPropertyTypes`):
```ts
export interface HouseRules {          // nested under CharacterSettings.houseRules
  readonly freeContacts: boolean;
  readonly freeContactsMultiplier: number;
  readonly freeKarmaKnowledge: boolean;
  readonly ignoreArmorEncumbrance: boolean;
  readonly noSingleArmorEncumbrance: boolean;
  readonly essLossReducesMaximumOnly: boolean;
  readonly metatypeCostsKarma: boolean;
  readonly metatypeCostsKarmaMultiplier: number;
  readonly exceedPositiveQualities: boolean;
  readonly exceedNegativeQualities: boolean;
  readonly multiplyRestrictedCost: boolean;
  readonly restrictedCostMultiplier: number;
  readonly multiplyForbiddenCost: boolean;
  readonly forbiddenCostMultiplier: number;
  readonly enforceCapacity: boolean;
  readonly unrestrictedNuyen: boolean;
  readonly nuyenPerBp: number;      // 0 = use stepped BP_TO_NUYEN_RATES table (default, legacy-safe); >0 = linear override (bp * nuyenPerBp)
}
export interface CostTable {           // nested under CharacterSettings.costs; defaults = current constants
  readonly bpAttribute: number;        // 10 ... (see SR4 table)
  readonly karmaAttributeMultiplier: number;   // 3  (== ATTRIBUTE_MULTIPLIER)
  readonly karmaNewActiveSkill: number;        // 4
  readonly karmaImproveActiveSkillMultiplier: number; // 2
  readonly karmaSpecialization: number;        // 2
  readonly karmaNewSkillGroup: number;         // 10
  readonly karmaSpell: number;                 // 5
  // ...mirror KARMA_BUILD_COSTS keys 1:1
}
```
Add `houseRules: HouseRules` and `costs: CostTable` to `CharacterSettings`; provide `DEFAULT_HOUSE_RULES`/`DEFAULT_COST_TABLE` and fold into `DEFAULT_CHARACTER_SETTINGS`.

**Refactor**: cost functions read `char.settings.costs.*` (fall back to defaults). Keep `KARMA_BUILD_COSTS` as the default seed for `DEFAULT_COST_TABLE`; delete the `creation.ts` duplicate and import from one place.

**Migration**: on character load, deep-merge missing `houseRules`/`costs` from defaults (mirror the `appSettings.ts:33` merge pattern). No Firestore schema version bump required (additive, defaulted).

**XML**: desktop writes `<settings>{filename}.xml</settings>` (a reference to an external options file). We diverge: embed a `<houserules>`/`<costs>` block with literal values inside the character XML. **Document this divergence** in the exporter and importer; on import of a desktop file lacking the block, apply defaults.

### Implementation steps
1. Add `HouseRules`/`CostTable` types + defaults; extend `CharacterSettings`. → `npm run check`
2. Load-time deep-merge migration + test with a legacy character (no houseRules). → `character.ts` test
3. Dedupe `KARMA_BUILD_COSTS` (character.ts vs creation.ts) → single export seeding `DEFAULT_COST_TABLE`. → `npm run check` + existing cost tests green
4. Route cost/validation reads through `char.settings.costs`/`.houseRules` (attributes, skills, knowledge, qualities cap, contacts, nuyen). → `npm run test`
5. Wire the ~5 highest-value flags into logic: `nuyenPerBp` (resources→nuyen; see reconciliation below), `freeContacts(+multiplier)`, `metatypeCostsKarma(+multiplier)`, `enforceCapacity`, `essLossReducesMaximumOnly` (MAG/RES max). → targeted tests per flag
   - **`nuyenPerBp` reconciliation (do not silently break existing totals):** the current conversion is the stepped `bpToNuyen()` table (`equipment.ts:617-637`), used only by `setResourcesBP` (`character.ts:1996`). Change `setResourcesBP` to branch: when `char.settings.houseRules.nuyenPerBp === 0` (the default) keep calling `bpToNuyen(clampedBP)` (unchanged legacy totals, existing `equipment.test.ts` assertions stay green); when `> 0`, use the linear `clampedBP * nuyenPerBp` override. Do **not** delete or default-replace `bpToNuyen`/`BP_TO_NUYEN_RATES` — they remain the default path. A linear default of 5000/BP would diverge from the table at nearly every value (5 BP: 20,000 table vs 25,000 linear; 20 BP: 90,000 vs 100,000; 50 BP: 275,000 vs 250,000) and break both the existing tests and this issue's own "unchanged totals" AC.
6. `/settings` "House Rules" section (app defaults for new characters) + per-character override panel in the wizard. → `npm run check`
7. Export/import `<houserules>`/`<costs>` block. → `xml/__tests__` round-trip test

### Test plan
- `nuyenPerBp: 2500` (linear override active) → 10 BP resources yields 25,000¥ (`10 * 2500`). Pick a BP value that distinguishes linear from the table, e.g. `nuyenPerBp: 5000` at **20 BP** → 100,000¥ linear vs 90,000¥ table — asserting only at 10 BP is a false-positive since the table also yields 50,000¥ there.
- `nuyenPerBp: 0` (default) → `setResourcesBP` still uses the stepped table: 5 BP→20,000¥, 20 BP→90,000¥, 50 BP→275,000¥ (existing `equipment.test.ts` assertions unchanged).
- `freeContacts:true, freeContactsMultiplier:2, CHA 4` → 8 free contact points, BP contact cost 0 up to that.
- `metatypeCostsKarma:true, multiplier:1` → Elf (normally BP) charged karma instead in a karma build.
- Round-trip: house-ruled character save→load→export→import preserves every `houseRules`/`costs` value (the AC).
- Legacy character (no block) loads with defaults, unchanged totals.

### Dependencies
- `restrictedCostMultiplier`/`forbiddenCostMultiplier` need the R/F classification from **#93/#96** parser to know which items to multiply.
- Cost-table refactor overlaps career-mode karma costs (**#92**) and creation-BP epics — coordinate to avoid double-refactor of the same functions.

### Risks & edge cases
- ESLint `max-lines-per-function 60`: the load-time merge and settings panel must stay decomposed.
- Do not expose all 100 desktop options — scope creep; ship the listed subset only (YAGNI).
- `exactOptionalPropertyTypes`: every new field is required-with-default, never `?`, to keep merge logic total.

<!-- ISSUE 95 COMPLETE -->

---

## Issue #96: Restricted/forbidden gear handling

**Labels:** `epic:rules`, `priority:low` · **Size: S**

### Verified current state
- No restriction surfacing anywhere. `avail` R/F suffix is currently parsed by nothing (until #93 lands `parseAvail`).
- Fake gear exists in `static/data/gear.json`: "Fake License" (L796), "Fake SIN" (L805). **Match by name, not category.** Both sit in category `"ID/Credsticks"`, which also holds real credsticks — e.g. "Certified Credstick, Platinum" (L778), "Certified Credstick, Ebony" (L787) — so a category filter would wrongly list real credsticks as fake licenses. Select `fakeLicenses` by name (`name` starts with / equals "Fake License" or "Fake SIN"). Also note credsticks abuse the `rating` field to store nuyen value (500000 / 1000000), whereas Fake License/SIN use `rating` as an actual 1–6 rating — another reason category-based selection is wrong and why `LegalitySummary.fakeLicenses[].rating` is only meaningful for name-matched fake gear.
- Presentation targets: `src/lib/components/CharacterSheet.svelte`, plus equipment list UIs in the wizard/manual editors.

### Design
Reuse `parseAvail` from #93 — **no new parser**. Add a thin presentation helper (`$engine/availability.ts` or a UI util):
```ts
export type Legality = 'legal' | 'restricted' | 'forbidden';
export function legalityOf(parsed: ParsedAvail): Legality;   // R→restricted, F→forbidden, else legal
export interface LegalitySummary {
  readonly restricted: readonly { id: string; name: string }[];
  readonly forbidden:  readonly { id: string; name: string }[];
  readonly fakeLicenses: readonly { id: string; name: string; rating: number }[];
}
export function summarizeLegality(char: Character): LegalitySummary;
```
Pure/presentational only — **no purchase blocking** here (that is #93). This issue is badges + a sheet summary + informational fake-license linkage.

### Implementation steps
1. `legalityOf` + `summarizeLegality` with tests. → `npm run test -- legality`
2. Badge component/markup on owned-item rows: small "R"/"F" chip driven by `legalityOf(parseAvail(item.avail, item.rating))` (needs #82 `avail` on owned items). → `npm run check`
3. Character-sheet legality section: list restricted + forbidden items; list fake licenses/SINs owned with their ratings; **informational** note (do not auto-match a specific license to a specific item — desktop does not enforce a mapping either). → `npm run check`
4. (Optional, informational) count fake licenses vs restricted items and show a soft hint if fewer licenses than restricted items.

### Test plan
- Item avail `"12R"` → badge "R", appears under `restricted`.
- Item avail `"18F"` → badge "F", under `forbidden`.
- Item avail `"6"` → no badge, `legal`.
- Character with 2 restricted items + 1 Fake License → summary lists both restricted items and the one fake license.

### Dependencies
- **#93** (hard): reuses `parseAvail`/`ParsedAvail`.
- **#82** (hard): owned items must carry `avail` to classify them.

### Risks & edge cases
- Modifier avail (`+…R` on an accessory) can make a legal base item restricted — for MVP classify base item only; note divergence (same caveat as #93).
- Fake License/SIN rating scaling (`rating` field) — display rating; do not compute legal coverage.

<!-- ISSUE 96 COMPLETE -->

<!-- EPIC COMPLETE -->

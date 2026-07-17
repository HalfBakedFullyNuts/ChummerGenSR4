# Epic: Career Mode Completion (Phase 20)

Issues #88–#92. Parent plan: [../FEATURE_PARITY_PLAN.md](../FEATURE_PARITY_PLAN.md) (§ "Epic: Career Mode Completion (Phase 20)", lines ~719–821).

**Implementation order:** #89 (calendar) → #90 (street cred, independent) → #88 (expense undo) → #91 (lifestyle upkeep, needs #89) → #92 (career purchasing, undo via #88). #90 has no deps and can land first as a warm-up. #88 is the keystone: #91 and #92 both log undoable expenses, so land #88's `undo` shape before them even if the per-kind reverts arrive incrementally.

All store code lives in `$stores/career.ts` unless noted. Returns follow `{ success, error }`; store updates are immutable spreads; arrays typed `readonly`. TS strict: `exactOptionalPropertyTypes` (so `undo?:` must be omitted, never `undefined`), `noUncheckedIndexedAccess`. ESLint (.ts only): max-lines-per-function 60, complexity 10, max-depth 3 — split reverts into per-kind helpers.

---

## Issue #88: Expense undo system

**Labels:** `epic:career2`, `priority:high` · **Size:** L

### Verified current state
- `addExpenseEntry(type, amount, reason)` — `career.ts:98–115`. Entry shape has no undo field. Signature must gain an optional `undo` param.
- `ExpenseEntry` — `types/character.ts:90–96`: `{ id, date, type, amount, reason }`, all `readonly`. No undo.
- Every advancement mutation (`improveAttribute` 234, `improveSkill` 300, `learnNewSkill` 340, `addSpecialization` 379, `learnKnowledgeSkill` 423, `improveKnowledgeSkill` 467, `learnSpell` 510, `initiate` 568, `submerge` 606, `learnComplexForm` 638) calls `spendKarmaInternal` (`career.ts:128`), which calls `addExpenseEntry` internally with no undo data. Threading undo through requires either passing undo into `spendKarmaInternal` or logging the expense at each call site.
- History tab: `CareerAdvancement.svelte:813–838`; feed is `expenseLog.slice().reverse()` (`:273`). No per-entry controls exist.
- Improvements are keyed by `source` (`ImprovementSource` enum, `types/improvements.ts:105`) + `sourceName` — `removeImprovements(imps, source, sourceName)` at `improvementManager.ts:75–84`. **Keying is id-based for equipment/power/focus/martial-advantage** (#62c sets `sourceName = character item id`, #85 focus `sourceName = focus.id`), and name-based only for quality/metatype/metamagic/echo (I4). For all undo `kind`s in this epic that target equipment, `undo.objectId` **already equals** the id-based `sourceName`, so removal is a direct call — **no `sourceId` field on `Improvement` is needed** (see Risks).
- Desktop parity target read in full: `clsExpenses.cs`. `ExpenseUndo` (lines 66–317) stores `{ KarmaType | NuyenType, ObjectId, Qty, Extra }`; attached to `ExpenseLogEntry.Undo` (330, 558). Enums `KarmaExpenseType` (12–37) and `NuyenExpenseType` (39–61) enumerate every reversible action.

### Design
Model undo as a discriminated union on `kind`, not the desktop's flat enum pair (cleaner for TS narrowing). `previousValue` captures the pre-mutation rating so reverts restore exactly (desktop re-derives; we store it to avoid recomputation drift).

```ts
// types/character.ts
export type ExpenseUndoKind =
  | 'attribute' | 'skill' | 'skillNew' | 'skillSpec' | 'knowledgeNew' | 'knowledge'
  | 'spell' | 'complexForm' | 'initiation' | 'submersion'
  | 'gear' | 'weapon' | 'armor' | 'cyberware' | 'bioware' | 'vehicle' | 'lifestyle';

export interface ExpenseUndo {
  readonly kind: ExpenseUndoKind;
  readonly objectId: string;        // id of the created/modified object (skill name for name-keyed skills)
  readonly previousValue?: number;  // prior rating for improve* reverts (omit for pure adds)
  readonly qty?: number;            // nuyen item quantity (parity w/ ExpenseUndo.Qty)
}

export interface ExpenseEntry {
  readonly id: string;
  readonly date: string;
  readonly type: 'karma' | 'nuyen';
  readonly amount: number;
  readonly reason: string;
  readonly undo?: ExpenseUndo;      // omit (never set undefined) — exactOptionalPropertyTypes
}
```

Signatures:
```ts
// career.ts
export function addExpenseEntry(
  type: 'karma' | 'nuyen', amount: number, reason: string, undo?: ExpenseUndo
): void;
// spendKarmaInternal gains a trailing `undo?: ExpenseUndo` forwarded to addExpenseEntry
export function undoExpense(entryId: string): { success: boolean; error?: string };
export function canUndoExpense(entryId: string): boolean; // most-recent-per-object guard
```

`undoExpense` logic: (1) locate entry, require `entry.undo`; (2) enforce **most-recent-per-object**: reject if a later entry shares the same `undo.objectId` (desktop restriction — you can only peel the top change of an object); (3) refund `-entry.amount` back to karma/nuyen (do **not** append a refund expense — desktop removes the entry); (4) dispatch on `undo.kind` to a per-kind revert helper (restore `previousValue` or remove the object); (5) for object kinds, also `removeImprovements(char.improvements, source, undo.objectId)` — equipment/power/focus improvements are id-keyed so `undo.objectId` is exactly the `sourceName` (I4); (6) drop the entry from `expenseLog`. Do not touch `totalKarma` (mirrors desktop, which counts career karma from the log — removing the entry naturally lowers it).

### Implementation steps
1. Add `ExpenseUndo`/`ExpenseUndoKind` + `undo?` to `types/character.ts`. → `npm run check` clean.
2. Thread `undo?` through `addExpenseEntry` + `spendKarmaInternal`; populate at each advancement call site (attribute→`previousValue`=old base; skill improve→old rating; adds→objectId of new entity). → unit test each entry now carries undo.
3. Implement `canUndoExpense` (most-recent-per-object). → test rejects when a newer same-object entry exists.
4. Implement `undoExpense` with a `switch(undo.kind)` dispatch to small per-kind helpers (keep each ≤60 lines). Karma-kind reverts first; object/nuyen kinds (gear/cyberware/etc.) may be stubbed until #92 lands their add paths — track which kinds are live.
5. History tab (`CareerAdvancement.svelte:820–834`): add an Undo button per entry where `canUndoExpense(entry.id)`, behind a confirm dialog (reuse the spec-modal pattern at `:842`). → manual: undo restores value + karma.

### Test plan (`career.test.ts` / new `career-undo.test.ts`)
- `improveAttribute` BOD 3→4 (career, cost 20) then `undoExpense`: karma restored +20, BOD base back to 3, entry gone.
- `learnNewSkill` then `undoExpense`: skill removed, +4 karma.
- Two improvements on same skill: `canUndoExpense(firstEntry)` === false; undoing the newer one then succeeds on the older.
- `learnSpell` undo: spell removed from `magic.spells`, +5 karma.
- Cyberware undo (once #92 live): nuyen + essence restored, its improvements removed from `char.improvements`.

### Dependencies
- #92 supplies the career equipment add functions whose reverts kinds `gear/weapon/armor/cyberware/bioware/vehicle` target. #88 defines the shape; those reverts can be filled when #92 lands.
- #91 lifestyle add uses `kind:'lifestyle'`.

### Risks & edge cases
- **Improvement cleanup (resolved, I4):** equipment/power/focus/martial-advantage improvements are **id-keyed** (`sourceName = character item id`, #62c/#85), and `undo.objectId` is that same id — so removal is a direct `removeImprovements(char.improvements, source, undo.objectId)`. No id→name lookup, and **no `sourceId` field needs to be added to `Improvement`** (the cross-epic #16 shared-type change floated here is dropped). Only quality/metatype/metamagic/echo improvements are name-keyed, and those undo kinds carry the name as `objectId`.
- Duplicate item names (two "Ares Predator") are a non-issue for equipment undo: id-keyed removal targets the exact instance.
- Refund must not itself create an undoable entry (infinite peel).
- Migration: existing saved characters have entries without `undo` → button simply hidden (field optional).

<!-- ISSUE 88 END -->

---

## Issue #89: Calendar and in-game time tracking

**Labels:** `epic:career2`, `priority:low` · **Size:** M

### Verified current state
- Expenses stamp real-world time: `career.ts:101` `date: new Date().toISOString()`. Same at `:84`, `:113` (`updatedAt`). No in-game clock anywhere.
- No `calendar` field on `Character` (`types/character.ts` — grep confirms absent).
- Desktop keeps an in-game `DateTime` and a `CalendarWeek` list; SR4 fiction default is 2072. We only need a lightweight day counter + optional labeled entries — do not port the desktop's full week model (YAGNI).

### Design
```ts
// types/character.ts
export interface CalendarEntry {
  readonly id: string;
  readonly date: string;   // in-game ISO date (yyyy-mm-dd)
  readonly title: string;
  readonly notes: string;
}
export interface CharacterCalendar {
  readonly currentDate: string;            // in-game ISO date; default '2072-01-01'
  readonly entries: readonly CalendarEntry[];
}
// Character gains:
readonly calendar: CharacterCalendar;
```
Add `undo`-independent. `ExpenseEntry` gains **`readonly gameDate?: string`** (in-game date at time of expense) so History can show in-game dates while `date` stays the real-world audit stamp. Populate `gameDate` from `char.calendar.currentDate` inside `addExpenseEntry`.

```ts
// career.ts
export function advanceTime(days: number): { success: boolean; error?: string };
export function addCalendarEntry(title: string, notes: string): { success: boolean; error?: string };
```
`advanceTime`: reject `days <= 0`; add days to `currentDate` (use plain `Date` arithmetic on the ISO date, re-serialize `yyyy-mm-dd`); return new date. Fires the lifestyle-lapse check from #91 (import guard: #91 subscribes, not the reverse — keep `advanceTime` free of lifestyle logic; #91 adds a derived warning off `currentDate` + `monthsPrepaid`).

**Firestore migration (mandatory, not cosmetic):** `calendar` is a **required** field, but there is no read-path normalizer today — the load path is `firebase/characters.ts:72` `loadCharacter` → `CharacterSchema.safeParse` (`schemas.ts:163`, `.passthrough()` at `:238`) → cast to `Character` → `persistence.ts:43` `characterStore.set`; no step merges defaults. A legacy doc lacking `calendar` passes passthrough validation and loads with `char.calendar === undefined`, so the first `char.calendar.currentDate` read (the `addExpenseEntry` gameDate stamp in step 2, `advanceTime`) crashes. The character factory default (`types/character.ts` default object ~line 443) only covers **new** characters, not loaded ones. **Add the backfill as an idempotent migration function in `stores/migrations.ts`, chained from `migrateCharacter`** (epic 17 shared decision 4 — the single backfill mechanism per D6/MC5; do NOT add a separate ad-hoc load hook or a Zod `.default()`, since `CharacterSchema` uses `.passthrough()` and `calendar` is a required field): fill `{ currentDate: '2072-01-01', entries: [] }` when absent.

### Implementation steps
1. Add `CalendarEntry`, `CharacterCalendar`, `Character.calendar`, `ExpenseEntry.gameDate?`; default in factory. → `npm run check` clean.
2. `addExpenseEntry` stamps `gameDate: get(characterStore).calendar.currentDate`. → test entry carries gameDate.
3. `advanceTime(days)` + `addCalendarEntry`. → unit tests.
4. History tab (`CareerAdvancement.svelte:823–825`): show `entry.gameDate ?? new Date(entry.date).toLocaleDateString()`. Add a minimal calendar strip in career mode (current date + "advance N days" input).
5. XML export/import: **#80b (XML epic, M10) already emits `<calendar />` empty; #89 populates `currentDate` + `entries` inside that same #80b writer** (and the #81 importer reads them) — there is no separate #18 task for this (D5). Mirror the `CharacterCalendar` type (`currentDate` + `entries` only — no `<week>`, per the YAGNI decision above).

### Test plan
- `advanceTime(30)` from `2072-01-01` → `2072-01-31`. `advanceTime(0)` → error.
- Expense logged after advancing shows `gameDate === '2072-01-31'`.
- Loader on a legacy character (no calendar) yields default `2072-01-01`.

### Dependencies
- #91 reads `calendar.currentDate` for lapse warnings and `payLifestyle` dating.
- #80b (XML epic, M10) emits `<calendar />` empty; #89 populates `currentDate` + `entries` in that writer (and #81 reads them) — no separate #18 task (D5).

### Risks & edge cases
- Timezone drift: operate on date-only strings, never `Date` with local time, to avoid off-by-one across DST.
- `exactOptionalPropertyTypes`: omit `gameDate` on non-career manual entries rather than setting `undefined`.

<!-- ISSUE 89 END -->

---

## Issue #90: Street cred derivation

**Labels:** `epic:career2`, `priority:low` · **Size:** M

### Verified current state (plan corrections)
- `reputation` is `{ streetCred, notoriety, publicAwareness }`, all stored, default 0 — `types/character.ts:149–155`, defaults `:444–447`. These become **manual/GM-awarded modifiers** layered on top of derived values (mirrors desktop `StreetCred`/`Notoriety`/`PublicAwareness` fields vs `Calculated*`).
- Plan says `floor(totalKarmaEarned / 10) + manual`. **Two corrections against `clsCharacter.cs`:**
  1. **Rounding is round-half-up, not floor.** `CalculatedStreetCred` (`clsCharacter.cs:4015–4033`): remainder<5 → floor, ≥5 → ceil. For `/10` this equals `Math.round(careerKarma/10)`.
  2. **Source is CareerKarma, and there is no `totalKarmaEarned` field.** `CareerKarma` (`clsCharacter.cs:3055–3070`) = Σ of `expenseLog` entries where `type==='karma' && amount>0 && !refund`. The web `Character.totalKarma` field (`types/character.ts:220`) is NOT the same (it includes creation karma / is set on award). Derive from the expense log. Web `ExpenseEntry` has no `refund` flag today → treat all positive karma entries as earned (add a `refund?: boolean` only if #88 needs it; expense reversals in #88 *remove* the entry, so no refund flag required).
- Notoriety: `CalculatedNotoriety` (`:4067–4082`) = `valueOf(imps,'Notoriety')` **plus the count of Enemy contacts** (plan omits enemies). `valueOf` exists at `improvementManager.ts:18`; `'Notoriety'` is a valid `ImprovementType` (`types/improvements.ts:85`).
- Public awareness: `CalculatedPublicAwareness` (`:4134–4149`) = `floor((TotalStreetCred + TotalNotoriety) / 3)`, clamped ≥0, where the **Totals include the manual modifiers** (plan used raw derived, missing the manual add).
- Display targets: `CareerAdvancement.svelte:433` currently shows `$character?.reputation.streetCred ?? 0` (raw stored). `CareerPanel.svelte:207` (verified present).
- `BurntStreetCred` (`clsCharacter.cs:2950`) subtracts from street cred and halves into notoriety — **not modeled in web**; omit for MVP, note as gap.

### Design — pure functions in `$engine/calculations.ts`
```ts
export function calculateCareerKarma(expenseLog: readonly ExpenseEntry[]): number; // Σ karma, amount>0
export function calculateStreetCred(char: Character): number;      // round(careerKarma/10) + reputation.streetCred
export function calculateNotoriety(char: Character): number;       // valueOf(imps,'Notoriety') + enemyContactCount + reputation.notoriety
export function calculatePublicAwareness(char: Character): number; // max(0, floor((streetCred+notoriety)/3)) + reputation.publicAwareness
```
Enemy contacts: `Contact` (`types/character.ts:77–84`) has only `readonly type: string` — a freeform string, no enemy enum/flag (desktop uses `ContactType.Enemy`). **Decision:** match on the existing field with `contact.type === 'Enemy'` — do NOT invent a new field. No data contract guarantees that string value, so document it as a best-effort assumption; characters whose enemy contacts use a different label will under-count until a proper contact-type enum lands (note the gap).

### Implementation steps
1. Add the four functions to `calculations.ts`. Keep `reputation.*` as manual addends. → `npm run check`.
2. Wire display: `CareerAdvancement.svelte:433` and `CareerPanel.svelte:207` show derived totals (with a tooltip breakdown mirroring desktop `StreetCredTooltip`: `(CareerKarma) ÷ 10`).
3. Leave stored `reputation` editable as the manual modifier in career UI.

### Test plan (`calculations.test.ts`)
- CareerKarma 34 → street cred `round(3.4)=3`; 35 → `round(3.5)=4` (exact desktop boundary at `:4022`).
- Manual `reputation.streetCred=2` on careerKarma 34 → total 5.
- Notoriety: one `'Notoriety'` improvement val 3 + one contact with `type: 'Enemy'` → 4 (+manual). A contact with any other `type` string does not count.
- Public awareness: streetCred 4, notoriety 2 → `floor(6/3)=2`; negative inputs clamp to 0.

### Dependencies
- Independent. Can land first. Sourcing CareerKarma from the log means #88's undo (which removes entries) automatically lowers street cred — no extra coupling.

### Risks & edge cases
- If a `refund?` flag is later added (#88), exclude refunds from `calculateCareerKarma` to match `clsCharacter.cs:3064`.
- BurntStreetCred unmodeled → derived values will read slightly high for burnt-cred characters; acceptable MVP gap, document it.

<!-- ISSUE 90 END -->

---

## Issue #91: Lifestyle upkeep in career mode

**Labels:** `epic:career2`, `priority:medium` · **Size:** L

### Verified current state
- `CharacterLifestyle` — `types/equipment.ts:463–472`: `{ id, name, level, monthlyCost, monthsPrepaid, location, notes }`. Single nullable slot: `CharacterEquipment.lifestyle: CharacterLifestyle | null` (`:512`).
- One-time cost only: `calculateEquipmentCost` counts `monthlyCost * monthsPrepaid` at `equipment.ts:554–556`, and again in the split store copies at `stores/equipment.ts:70–71, 1080–1081` and `stores/character.ts:2030–2031, 2796–2797`. **No `payLifestyle`/monthly-deduction anywhere.**
- Set/remove: `stores/character.ts:2816/2838` and `stores/equipment.ts:1100/1120` both write `equipment.lifestyle` (single) — the store split duplicated this; both must change together.
- **In-flight svelte-check error (the "modules" note):** the untracked test `engine/__tests__/calculations.test.ts:62–70` constructs a lifestyle as `{ level, modules: [], monthsPrepaid, cost, monthlyCost }` — shape does NOT match `CharacterLifestyle` (extra `modules` + `cost`, missing `id/name/location/notes`). This is the type error the plan flags. Reconcile: add `modules` + `cost` to the type (below), and correct the test to include required fields — do not leave the test defining a divergent shape.
- Read sites to update for the array migration: `CharacterSheet.svelte:1211–1232`, `EquipmentSelector.svelte:166`, `FinalizeCharacter.svelte:90,363–368`, `validation.ts:412`, `src/lib/json/importer.ts:165`, plus the four cost/set/remove blocks above.
- **XML layer also references the removed `lifestyle` key and will fail `tsc`/`svelte-check` after the type change** (not covered by #89, which defers only calendar XML). **Note (MC3): #80a (M10) restructures the exporter into `src/lib/xml/export/*` and #81 rewrites the importer — both land before #91 (M11), so the line references below are pre-restructure. #91's XML edits must target the post-#80a `export/`-module lifestyle writer and the #81 importer, NOT `xml/exporter.ts:298–321` / `xml/importer.ts:120,189,603–611`.** The XML uses a plural `<lifestyles>` wrapper, so the importer should read **all** `<lifestyle>` entries into the array (not just `[0]`) and the exporter must iterate `equipment.lifestyles`. Test `xml/__tests__/importer.test.ts:472–493` asserts the old `equipment.lifestyle` shape and must be updated to the array.

### Design
Migrate single→array and add the module/cost fields the in-flight test expects:
```ts
// types/equipment.ts
export interface LifestyleModule {          // Runner's Companion lifestyle option/quality
  readonly id: string;
  readonly name: string;
  readonly cost: number;                    // flat nuyen added to monthly
}
export interface CharacterLifestyle {
  readonly id: string;
  readonly name: string;
  readonly level: string;
  readonly cost: number;                     // base monthly before modules (was implicit)
  readonly monthlyCost: number;              // STORED effective monthly. #91 lands a simple version (cost + Σ module.cost); #97's `lifestyleMonthlyCost(base,type,roommates,percentage,improvements)` engine helper (banker's rounding) is canonical and replaces this computation — `payLifestyle` calls #97's helper once it lands (I5). This field holds the stored *result*, not an independent sum.
  readonly monthsPrepaid: number;
  readonly location: string;
  readonly notes: string;
  readonly modules: readonly LifestyleModule[];
}
export interface CharacterEquipment {
  // ...
  readonly lifestyles: readonly CharacterLifestyle[];   // was: lifestyle: CharacterLifestyle | null
}
```

```ts
// career.ts
export function payLifestyle(lifestyleId: string, months: number): { success: boolean; error?: string };
export const lifestyleLapse: Readable<readonly { id: string; name: string; overdueMonths: number }[]>;
```
`payLifestyle`: reject `months<=0`; deduct `monthlyCost*months` via `spendNuyen`; extend that lifestyle's `monthsPrepaid`; log an expense with `undo:{ kind:'lifestyle', objectId: lifestyleId, qty: months }` (#88). Lapse: a `derived` over `characterStore` comparing `calendar.currentDate` (#89) elapsed months since career entry against each lifestyle's `monthsPrepaid` — surfaces overdue lifestyles; does not auto-deduct (GM decides).

**Firestore migration (single, shared function — MC1/MC2/D6):** old docs have `equipment.lifestyle` (object|null) and no `equipment.lifestyles`; `equipment` is validated as `z.object({}).passthrough()` (`schemas.ts:216`), so the old key survives untouched and `lifestyles` loads as `undefined`. The factory default (`equipment.ts:607`) only covers new characters.

**#91 owns the single lifestyle migration and lands the type change once.** Put it as **one idempotent function in `stores/migrations.ts`** (epic 17 shared decision 4), chained from `migrateCharacter` — **not** a second ad-hoc load hook. It does the full transform in one step: single→array, `cost = monthlyCost`, `modules = []`. Two cross-epic requirements on this same function:
- **MC2:** #82 (M10) adds `source`/`page` to the single `CharacterLifestyle` before this array migration runs — **preserve #82's `source`/`page` fields into each array element** (do not drop them).
- **MC1:** #97 (content epic) adds `type`/`qualities` into **this same migration function** (not a separate hook), and #97's LP→cost model is authoritative for lifestyle qualities; #91's `modules` (RC flat-cost option) layers on top. Decide the modules-vs-qualities cost model before either lands (recommend #97's LP→cost as authoritative).

Handle the JSON import path in `src/lib/json/importer.ts:165` too. Keep a one-release backward read of the old `lifestyle` key.

### Implementation steps
1. Add `LifestyleModule`, extend `CharacterLifestyle`, change `lifestyle`→`lifestyles: readonly[]`; update factory default `equipment.ts:607` (`lifestyles: []`). → `npm run check` surfaces all read sites.
2. Update all read/cost/set/remove sites, **including the XML importer/exporter** (`xml/importer.ts` `parseLifestyle` → read every `<lifestyle>` into the array; `xml/exporter.ts` → iterate `lifestyles`); collapse the duplicated cost logic if trivial (do NOT refactor the store split — surgical only). → `npm run check` clean.
3. Loader migration in a real load hook (`loadCharacter`/`persistence.ts`) + `src/lib/json/importer.ts:165`; fix `calculations.test.ts` lifestyle fixture and `xml/__tests__/importer.test.ts` to the new array shape. → `npm run test`.
4. `payLifestyle` + `lifestyleLapse`. → unit tests.
5. Career UI: list lifestyles, "pay N months" action, lapse badge.

### Test plan (`career.test.ts`)
- Low lifestyle monthlyCost 2000, `payLifestyle(id,3)` → nuyen −6000, `monthsPrepaid += 3`, one expense entry with `undo.kind==='lifestyle'`.
- `payLifestyle(id,0)` → error; insufficient nuyen → error, no mutation.
- Module cost 500 on 2000 base → `monthlyCost` 2500; `payLifestyle(id,1)` deducts 2500.
- Lapse: entered career at `2072-01-01`, prepaid 1 month, `advanceTime(60)` → lifestyle appears in `lifestyleLapse` with `overdueMonths ≥ 1`.
- Migration: legacy `{lifestyle:{...}}` doc loads as `lifestyles:[{…, cost, modules:[]}]`.

### Dependencies
- #89 (calendar) for elapsed-time/lapse. #88 for `kind:'lifestyle'` undo.
- **Cross-epic:** the `lifestyles` array + `modules` type change collides with the Equipment Hierarchy epic (#17) and the general type-error triage in the plan (§ line 964, "coordinate with #91 lifestyle modules"). Land the type change once; #17 must consume the array shape.

### Risks & edge cases
- Array migration is wide (6 files); a missed read site is a runtime `undefined`. `npm run check` under strict catches all typed ones — verify `.svelte` sites manually (Svelte files skip complexity lint but still type-check via svelte-check).
- `exactOptionalPropertyTypes`: none of the new fields are optional, avoiding `undefined` traps.

<!-- ISSUE 91 END -->

---

## Issue #92: Career-mode equipment purchasing

**Labels:** `epic:career2`, `priority:medium` · **Size:** L

### Verified current state
- The creation add functions **already deduct `char.nuyen`** — `addWeapon` (`stores/equipment.ts:82–121`, `if (char.nuyen < weapon.cost) return; … nuyen: char.nuyen - weapon.cost`), same pattern for `addGear`, `addArmor`, `addCyberware` (`:269`, essence too), `addBioware` (`:439`), `addVehicle` (`:517`). So creation and career both spend nuyen; the career gap is: **(a) no expense-log entry, (b) no availability gate, (c) no sell-back.**
- Add functions **return `void`** and do not expose the generated id (`generateId()` internal). Career purchase + undo need that id → refactor add* to return the created id (see steps).
- Created items store `cost` (e.g. `CharacterWeapon.cost`, `equipment.ts:66`) but **not `avail`** — the newWeapon builder at `:104` omits it. Availability must be read from the `Game*` source item at purchase time (`GameWeapon.avail: string`, `types/equipment.ts:59`).
- `EquipmentSelector.svelte` calls `addWeapon`/`addGear`/`addCyberware` directly (`:1094, 1463, 1338`) with no career awareness — it is the reuse surface named in the plan.
- Desktop sell (`frmCareer.cs:11746, 11829`) uses `objX.TotalCost * frmSell.SellPercent` — a **GM-prompted** percentage, not a fixed rate. The plan's "30% default" is a deliberate house-rule simplification → document it; make the rate a single named constant so it is trivially configurable later.

### Design
Thin career wrappers in `career.ts` (do NOT duplicate item construction — delegate to the refactored add*):
```ts
// stores/equipment.ts — refactor: add* return the unified MutationResult (C6/I1) — the new
// item's id travels in `.id`, NOT a bare `string | null`. This is the single top-level
// signature change for add*; land it here (first career issue to touch them) and have #93
// consume `.success`/`.error`. MutationResult = { success: boolean; error?: string; id?: string }.
export function addWeapon(weapon: GameWeapon): MutationResult; // (and addGear/addArmor/addCyberware/addBioware/addVehicle) — new id in result.id

// career.ts
export const CAREER_SELL_RATE = 0.3;   // house-rule; desktop prompts per-sale
export function purchaseWeapon(weapon: GameWeapon): MutationResult; // { success, error?, id? }
// + purchaseGear/purchaseArmor/purchaseCyberware/purchaseBioware/purchaseVehicle (same shape)
export function sellItem(
  kind: 'weapon'|'gear'|'armor'|'cyberware'|'bioware'|'vehicle', itemId: string
): { success: boolean; error?: string };
```
`purchase*`: require career mode; **availability gate** — parse `weapon.avail` and block/warn if over `char.settings.maxAvailability`. **#92 MUST ship a stopgap avail parser (a simple numeric-prefix parse, marked `TODO(#93)`); it cannot wait for #93 (D3) because career mode is M11 and rules is M12 — #93's later landing replaces the stopgap in-place, keying on `char.status` so no circular dependency exists.** Call the add* (unified `MutationResult`); on success read the new id from `result.id` and `addExpenseEntry('nuyen', -cost, \`Purchased \${name}\`, { kind, objectId: result.id, qty: 1 })`. Because add* already deducts nuyen, career wrappers must NOT double-deduct — they only add the log entry (and the up-front nuyen check moves into the gate). Cyberware/bioware additionally revert essence on undo (already handled by #88's cyberware revert using the stored `essence`).

`sellItem`: locate item, refund `floor(item.cost * CAREER_SELL_RATE)` via nuyen add + `addExpenseEntry('nuyen', +refund, \`Sold \${name}\`)` (a sale is not undoable — omit `undo`), remove the item, and clean up its improvements with **`removeImprovements(char.improvements, source, itemId)`** — equipment improvements are **id-keyed** (#62c sets `sourceName = character item id`), so pass the item id directly; there is no name-ambiguity problem and no id→name lookup needed (I4).

### Implementation steps
1. Refactor add* in `stores/equipment.ts` to return the unified `MutationResult` (`{ success, error?, id? }` — new id in `.id`; C6/I1), not `string | null` (change the trailing `characterStore.set(updated)` block to build and return the result). Existing void callers ignore the return — non-breaking. → `npm run check`.
2. Add `purchase*` wrappers + `CAREER_SELL_RATE` + `sellItem` in `career.ts`. → unit tests.
3. Availability gate: temporary numeric-prefix parse with a `// TODO(#93)` marker, or import #93's parser if merged. → test avail-over-cap blocked.
4. Wire `EquipmentSelector.svelte` to call `purchase*` when `$isCareerMode` (else the existing add*), so the same UI serves both modes. Add a Sell control in the career equipment view.
5. Confirm undo path: purchased item → History undo (#88 `kind` reverts) restores nuyen + removes item + (cyberware) essence/improvements.

### Test plan (`career.test.ts`)
- Career character nuyen 5000, `purchaseWeapon(Ares Predator, cost 350)` → nuyen 4650, weapon in list, one nuyen expense with `undo.kind==='weapon'`.
- Insufficient nuyen → error, no mutation, no log entry.
- `sellItem('weapon', id)` on the 350¥ weapon → nuyen +105 (floor(350*0.3)), weapon removed, positive expense, no `undo`.
- Cyberware purchase then `undoExpense` (#88) → nuyen + essence restored, improvements removed.
- Avail gate: item avail "20F" with cap 12 → blocked (or warned per #93 decision).

### Dependencies
- **#88** — purchase expenses carry `undo`; #88 must handle the equipment kinds (its plan stubs them pending this issue). Land the `undo` shape (#88 step 1) before #92.
- **#93** (Rules Enforcement epic) owns the avail-string parser and `maxAvailability` enforcement — #92 consumes it; ship a stopgap parser if #93 is not merged, marked `TODO(#93)`.
- **#17** (Equipment Hierarchy) — nested children (cyberware gear, weapon mods) purchased in career mode need per-child expense entries; scope #92 to top-level items and defer nested-purchase logging to #17.

### Risks & edge cases
- Double-deduction: add* already spends nuyen; wrappers must not re-deduct — audit each wrapper.
- Stored items lack `avail`, so a career avail gate can only run at purchase from the `Game*` item, not retroactively — acceptable.
- Sell of an item that provided improvements (cyberware) must clean them up via **id-keyed** `removeImprovements(source, itemId)` (#62c convention) — no name-based ambiguity (I4).

<!-- ISSUE 92 END -->

<!-- EPIC COMPLETE -->

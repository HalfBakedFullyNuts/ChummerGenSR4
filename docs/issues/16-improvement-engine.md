# Epic: Improvement Engine Completion (Phase 16)

> **Issues:** #61–#71 · **Labels:** `epic:engine2` · **Plan:** [../FEATURE_PARITY_PLAN.md](../FEATURE_PARITY_PLAN.md) (Part III)
> **Hardened:** 2026-07-16 — every file:line reference below was verified against the working tree on that date; desktop behavior was read directly from `F:\Projects\ChummerDesktop\Chummer\clsImprovement.cs`, `clsUnique.cs`, `clsCharacter.cs`, `frmCreate.cs` and `F:\Projects\ChummerDesktop\bin\data\*.xml`.

## Epic-level implementation order

```
#99 (stabilize tree, other epic) — hard prerequisite
  → #61  (quality dedupe — small, unblocks trust in the barrel)
  → #69  (delete dead engine/improvements.ts — small, removes type collision noise)
  → #62a/#63a (store dedupe: equipment + magic/metatype mutations — pure refactor)
  → #62b (converter carries <bonus> through to JSON — unblocks all data-driven work)
  → #66  (rating scaling + valueOf fixes — parser core others build on)
  → #62c, #63b (equipment + magic sources create improvements)
  → #64  (producer/consumer alignment)
  → #65  (skill dice pools) → #67 (Uneducated/Uncouth/Infirm)
  → #68  (parser expansion to full data coverage)
  → #70  (movement/defense wiring)
  → #71  (golden-character integration suite — regression net over everything above)
```

Two epic-wide findings that reshape several issues (details in the issues themselves):

1. **The store split is only half-finished.** `stores/character.ts` (4,425 lines) still contains full duplicate implementations of nearly every mutation that also exists in the split modules (`attributes.ts`, `equipment.ts`, `magic.ts`, `technomancer.ts`, `creation.ts`). The UI imports a mix of both. The plan's issue #61 covers only the quality trio; the same disease affects equipment (`addCyberware`/`addBioware`/`addGear`), magic (`addPower`/`learnMetamagic`), resonance (`learnEcho`), and metatype (`setMetatype`). Sub-issues #62a and #63a extend the dedupe.
2. **The data pipeline of record is broken for bonuses.** `scripts/convert-xml-to-json.ts` strips `<bonus>` for *every* file type — including qualities. The bonus data currently in `static/data/qualities.json` was produced by some earlier/other tool: **re-running `npm run convert-data` today would regress qualities.json** by deleting all bonus blocks (verified: `convertQualities()` at `scripts/convert-xml-to-json.ts:459–503` copies only name/bp/category/source/page/mutant/limit). Fixing the converter (#62b) is on the critical path.

---

## Issue #61: Fix divergent duplicate addQuality implementations

**Labels:** `epic:engine2`, `priority:critical`, `bug`

### Verified current state

- Improvement-creating versions live in `src/lib/stores/character.ts`: `addQuality` (line 607, calls `createImprovementsFromBonus` at 644), `addQualityAgain` (line 688, call at 709), `removeQuality` (line 744, `removeImprovements` at 783). *(Plan's refs 644/709/783 were the call sites, not the declarations.)*
- Improvement-less duplicates live in `src/lib/stores/attributes.ts`: `addQuality` (252), `addQualityAgain` (305), `removeQuality` (342). They are byte-for-byte copies minus the improvement wiring. `AddQualityOptions` is also duplicated (`attributes.ts:245`, `character.ts:594`).
- The barrel `src/lib/stores/index.ts:113–123` exports the **attributes.ts** (improvement-less) versions, while exporting `type AddQualityOptions` from `character.ts` (line 100) — the type and the functions come from different modules today.
- Actual consumers (verified by grep):
  - `src/lib/components/wizard/QualitySelector.svelte:3` and `src/lib/components/manual/QualitiesSection.svelte:4` import from `$stores/character` → get the **correct** versions.
  - `src/lib/stores/__tests__/magic.test.ts:3` imports from `../character` → correct.
  - Nothing currently imports the quality trio from the barrel — the bug is latent, exactly as the plan says.
- `createImprovementsFromBonus`/`removeImprovements` are called **nowhere else** in `src/lib/stores` (grep confirms character.ts:644/709/783 are the only call sites in the codebase).

### Design

- **Canonical home:** keep the implementations in `character.ts` for this issue (they are correct and tested); do not attempt a `qualities.ts` module move here — that belongs to the broader dedupe (#62a/#63a) if desired. Minimal diff wins.
- Delete from `attributes.ts`: `addQuality`, `addQualityAgain`, `removeQuality`, the duplicated `AddQualityOptions` interface, and the now-unused imports these orphan (`CharacterQuality`, `generateId` — verify with `noUnusedLocals` which will flag them).
- Barrel change in `stores/index.ts`:

```ts
// index.ts — quality mutations come from character.ts (the improvement-creating versions)
export {
    // ...existing character.ts exports...
    addQuality,
    addQualityAgain,
    removeQuality,
    type AddQualityOptions
} from './character';

export {
    setAttribute,
    calculateTotalAttributeCost,
    calculateNonSpecialAttributeBP,
    isAttributeNA,
    countMaxedAttributes,
    getMaxedAttributeName
} from './attributes';
```

- One behavioral divergence to preserve deliberately: `character.ts#addQualityAgain` does **not** accept `AddQualityOptions` (no selection pass-through). Keep the current signature; extending it is not in scope.
- No persisted-data migration: both versions write the same `CharacterQuality` shape.

### Implementation steps

1. Delete the three functions + `AddQualityOptions` from `attributes.ts`. → verify: `npm run check` flags no orphaned unused imports left behind.
2. Update `stores/index.ts` per the design block. → verify: `npm run check` passes; `grep -rn "addQuality" src` shows exactly one declaration per function.
3. Add regression test `src/lib/stores/__tests__/quality-barrel.test.ts` (see test plan). → verify: `npx vitest run src/lib/stores/__tests__/quality-barrel.test.ts` passes.
4. Full suite. → verify: `npm run test:unit` — all 531+ tests green.

### Test plan

| Test | Setup | Expected |
| --- | --- | --- |
| `barrel addQuality creates improvements` | import `addQuality` from `../index`; load gamedata fixture with quality `Toughness` (`bonus: { damageresistance: 1 }`); `startNewCharacter()`; `addQuality('Toughness','Positive',10)` | `get(character).improvements` contains one entry: `type='DamageResistance'`, `source='Quality'`, `sourceName='Toughness'`, `val=1` |
| `barrel removeQuality removes improvements` | continue above; `removeQuality(id)` | `improvements.length === 0`, BP refunded (qualities BP back to 0) |
| `barrel and direct import are identical` | `import * as barrel from '../index'; import * as direct from '../character'` | `barrel.addQuality === direct.addQuality` (reference equality) |

### Dependencies

- None within the epic. (#99 tree stabilization from Phase 0 must be done first, as for everything here.)

### Size

**S**

### Risks & edge cases

- `attributes.ts` may have module-private helpers used only by the deleted functions (`generateId` import); `noUnusedLocals` makes this a compile error, so it cannot slip through silently.
- Any uncommitted in-flight work importing the quality trio from `$stores` (barrel) will silently change behavior — from no-improvements to improvements. That is the *desired* direction, but re-run the full suite rather than scoped tests.
- `magic.test.ts` asserts on quality behavior via the character.ts version; it must remain untouched by this change.

---

## Issue #62: Create improvements from equipment sources (cyberware, bioware, gear)

**Labels:** `epic:engine2`, `priority:critical`

### Verified current state

- **Two full implementations of every equipment mutation exist:**
  - `stores/character.ts`: `addCyberware` (2169), `removeCyberware` (2226), `addBioware` (2257), `removeBioware` (2310), `addGear` (2554), `removeGear` (2638).
  - `stores/equipment.ts`: `addCyberware` (269), `removeCyberware` (321), `addChildCyberware` (346), `addBioware` (439), `removeBioware` (488), `addGear` (789), `removeGear` (867), `addGearToGear` (995), `removeGearFromGear` (1035).
  - The barrel `stores/index.ts:218–245` exports the **equipment.ts** versions. But `EquipmentSelector.svelte:2–26` imports `addCyberware`/`addBioware`/`addGear`/etc. from **`$stores/character`** — while importing `addChildCyberware` from `stores/equipment` (line 27). The UI is split-brained across the two copies today.
- **Neither copy creates improvements.** Grep confirms `createImprovementsFromBonus` is called only from character.ts:644/709 (qualities).
- **The game data carries no bonus blocks for equipment.** Survey of all `static/data/*.json` (2026-07-16): bonus keys exist **only in qualities.json**. The desktop XML sources have them: `cyberware.xml` 96 `<bonus>` nodes, `bioware.xml` 91, `gear.xml` 72, `armor.xml` 25 (counted in `F:\Projects\ChummerDesktop\bin\data`). The converter (`scripts/convert-xml-to-json.ts`) strips `<bonus>` for every file type — including qualities (qualities.json's bonus data came from an earlier tool; see epic header).
- **Game-data types carry no bonus field:** `GameCyberware` (`types/equipment.ts:194–206`), `GameBioware` (`types/equipment.ts:252–260`, plus a *duplicate* `GameBioware` in `stores/gamedata.ts:234`), `GameGear` (`types/equipment.ts:392–403`).
- **Legacy string matching** in `engine/calculations.ts`: `calculateInitiativeDice` name-matches `wired reflexes`/`synaptic booster`/`move-by-wire` (96–107) and adept `improved reflexes` (110–116); `calculateInitiativeBonus` (126–153) does the same plus `reaction enhancers`; `calculateAll` (423) adds `calculateInitiativeBonus` on top of `calculateInitiative`.
- **Desktop parity target** (all verified in source):
  - Every add path routes `<bonus>` through `CreateImprovements` with the item's **InternalId (GUID) as sourceName** and the item's rating: `frmCreate.cs:2390` (cyberware, `objCyberware.Rating`), `:2415` (cyberware plugins/children), `:2428/2453` (bioware + plugins), `:2524/2559/2588/2620` (gear at every nesting level).
  - Wired Reflexes bonus XML: `<initiativepass>Rating</initiativepass>` + `<specificattribute><name precedence="1">REA</name><val>Rating</val></specificattribute>` (cyberware.xml). Reaction Enhancers: REA `precedence="1"`, `<val>Rating</val>`, ess `Rating * 0.3`.
  - The `initiativepass` bonus node is created with **hardcoded uniqueName `"initiativepass"`** (`clsImprovement.cs:1830`) — that is the entire non-stacking mechanism for initiative passes.

### Design

**Sub-issue #62a — dedupe equipment mutations (pure refactor, no behavior change).**
`stores/equipment.ts` becomes the single home (it is what the barrel already exports and where the child/nesting functions live).

- Delete from `character.ts`: `addCyberware`, `removeCyberware`, `addBioware`, `removeBioware`, `addGear`, `removeGear`, plus `addWeapon`/`removeWeapon`/`addArmor`/`removeArmor`/`addVehicle`/`removeVehicle`/`addMartialArt`/`removeMartialArt`/`setLifestyle`/`removeLifestyle` **if and only if** diff shows the equipment.ts versions are equivalent (spot-verified for cyberware/bioware: they are copies).
- `EquipmentSelector.svelte` imports move from `$stores/character` to `$stores` (barrel).
- No signature changes in #62a.

**Sub-issue #62b — converter carries `<bonus>` through.**

```ts
// scripts/convert-xml-to-json.ts
/**
 * Pass a <bonus> node through to JSON verbatim (structure-preserving).
 * Single-child objects are normalized to arrays for keys that repeat
 * (specificattribute, specificskill, skillgroup, skillcategory, addattribute).
 * Values are kept as string | number | boolean | object — "Rating" and
 * "FixedValues(...)" expressions survive as strings for #66 to resolve.
 */
function extractBonus(raw: unknown): BonusData | undefined;
```

- Apply in `convertQualities`, `convertCyberware`, `convertBioware`, `convertGear`, `convertArmor`, `convertPowers`, `convertMetatypes`, `convertEchoes`, `convertMetamagic` (powers/metatypes/echoes/metamagic are consumed by #63 — do the converter once, here).
- **Regression guard:** before/after diff of qualities.json must show bonus blocks preserved or enriched, never dropped (the current converter would delete them — see epic header).
- Add `readonly bonus?: BonusData` to `GameCyberware`, `GameBioware` (both copies — better: delete the `stores/gamedata.ts:234` duplicate and import from `$types`), `GameGear`, the armor game type, `GamePower`, `Metatype`, `Metavariant` (`types/character.ts:43` — required for #63b's `variant?.bonus` to compile under strict mode; per the survey only 16 of metatypes.xml's 70 bonus nodes sit on base metatypes — the majority live on metavariants, so `convertMetatypes` must run `extractBonus` on each `<metavariant>` child too or most metatype bonus data is silently dropped), `GameEcho` (whose current `bonus: string` display-text field must be **renamed** to `bonusText` to avoid a type collision — chase consumers), `GameMetamagic`.
- `BonusData` is the renamed, extended `QualityBonus` (currently `stores/gamedata.ts:57–128`), moved to `src/lib/types/improvements.ts`; keep `export type QualityBonus = BonusData` alias for compatibility. Value positions widen to carry `"Rating"` expressions (resolved by #66):

```ts
// types/improvements.ts
export type BonusValue = number | string; // string = "Rating", "-Rating", "Rating*2", "FixedValues(2,3,5)"
export interface BonusData {
    readonly specificattribute?: readonly AttributeBonus[];
    readonly addattribute?: readonly AttributeBonus[];
    readonly specificskill?: readonly SkillBonus[];
    // ... existing QualityBonus keys, numeric values widened to BonusValue ...
    readonly [key: string]: unknown; // tolerate keys the parser learns later (#68)
}
```

**Sub-issue #62c — wire create/remove.**

- **sourceName = the character item's `id`** (mirrors desktop InternalId, `frmCreate.cs:2390`). Rationale: two Reaction Enhancers items must be independently removable; name-keyed removal would strip both. Qualities keep name-keying (their instance names are already unique; changing them would orphan improvements on saved characters).
- Signature stays `createImprovementsFromBonus(source, sourceName, bonusData, rating, ...)`; `rating` is the purchased item rating (#66 makes the parser actually apply it).
- In `equipment.ts`:

```ts
export function addCyberware(cyber: GameCyberware, grade: CyberwareGrade = 'Standard'): void {
    // ...existing essence/nuyen logic...
    const newCyber: CharacterCyberware = { /* ... */ };
    const newImps = cyber.bonus
        ? createImprovementsFromBonus('Cyberware', newCyber.id, cyber.bonus, newCyber.rating)
        : [];
    // single immutable characterStore.set() writes equipment + improvements + essence + nuyen together
}
```

- Same pattern: `addBioware` → source `'Bioware'`; `addGear`/`addGearToGear` → `'Gear'`; `addChildCyberware` → `'Cyberware'` with the **child's** id; `addArmor` → `'Armor'` (armor.xml has 25 bonus nodes — nonconductivity etc.).
- Removal: `removeImprovements(imps, source, item.id)`; child-bearing removals must remove improvements for the item **and every descendant** (walk `children[]`, collect ids, filter once). Export a helper so Epic 17 (#75 deep nesting) reuses it:

```ts
/** Remove improvements granted by any of the given item ids (a parent plus its nested children). */
export function removeImprovementsForTree(
    improvements: readonly Improvement[],
    source: ImprovementSource,
    itemIds: readonly string[]
): Improvement[];
```

- **Delete legacy string matching** once tests pass: `calculateInitiativeBonus` entirely, the cyberware/power name loops inside `calculateInitiativeDice` (keep the `valueOf` lines with base `dice = 1`), and change `calculateAll:423` to `initiative: calculateInitiative(char)` (REA bonuses now arrive through `getAttributeTotal` via Attribute improvements). Remove `initiativeBonus` from `CharacterCalculations` and fix its consumers (grep `initiativeBonus` in components).
- **Migration:** none for persisted Firestore characters — existing saves have no equipment improvements and their derived stats were already wrong; they self-heal when items are re-added. A re-derivation pass on load is deliberately out of scope (it is #81's import strategy).

### Implementation steps

1. **#62a** dedupe: delete character.ts equipment mutations, repoint `EquipmentSelector.svelte` to the barrel. → verify: `npm run check` + `npm run test:unit` green; grep shows one implementation of each function.
2. **#62b** converter: implement `extractBonus`, apply to all converters, extend game-data types, regenerate `static/data/*.json`. → verify: run the bonus-key survey (`scripts/survey-bonus-keys.mjs` — **not yet in the repo**; it is authored as part of #68 step 5 — write it here first if #62b lands before #68); cyberware.json now shows keys (`initiativepass`, `specificattribute`, …); qualities.json key count ≥ the current 36; `npm run check` green.
3. **#62c-1** id-keyed improvement creation in `addCyberware`/`addBioware`/`addGear`/`addGearToGear`/`addChildCyberware`/`addArmor`. → verify: unit tests below.
4. **#62c-2** removal + `removeImprovementsForTree`. → verify: unit tests below.
5. **#62c-3** delete legacy name matching in `calculations.ts`; update `calculateAll` and `CharacterCalculations` consumers. → verify: grep confirms no `includes('wired reflexes')` remains; initiative tests still pass via improvements only.
6. Full suite + `npm run lint`. → verify: green.

### Test plan

(SR4 values verified against desktop data files.)

| Test | Setup | Expected |
| --- | --- | --- |
| `Wired Reflexes 2 creates typed improvements` | human REA 4; `addCyberware(wiredReflexes)` rating 2 | improvements contain `InitiativePass` (val 2, uniqueName `initiativepass`) and `Attribute`/`rea` (val 2, uniqueName `precedence1`); essence 6 − 3 = 3 (FixedValues(2,3,5)[2]) |
| `removal cleans up` | remove the item | zero improvements; essence back to 6 |
| `two identical items are independent` | Reaction Enhancers ×2 (rating 1 each) | 2 `Attribute`/`rea` improvements with distinct sourceNames; removing one leaves the other (REA +1 remains) |
| `child improvements removed with parent` | cyberlimb + bonus-carrying child; `removeCyberware(parent)` | child improvements gone (`removeImprovementsForTree`) |
| `gear bonus` | add Sim Module-style gear with `matrixinitiativepass` | Gear-sourced improvement exists; removing the gear removes it |
| `no-bonus item creates nothing` | add plain gear | `improvements.length === 0` |

### Dependencies

- **#62a:** none. **#62b:** none (blocks #63, #64, #68, #71). **#62c:** needs #62b (data); benefits from #66 — until #66 lands, string values like `"Rating"` must be **skipped with a console warning**, never written as `NaN`.
- Coordinates with Epic 17: #75 reuses `removeImprovementsForTree`; #72 (weapon accessories → Smartlink) builds on the same converter work.

### Size

**L** (as three PRs: #62a S, #62b M, #62c M)

### Risks & edge cases

- **Converter regression risk is immediate:** running `npm run convert-data` today destroys qualities.json bonus data. #62b must land qualities `extractBonus` in the same PR as any regeneration; add a test asserting a known bonus (Toughness → `damageresistance: 1`) survives conversion.
- `GameEcho.bonus: string` (display text) collides with the structured field — the rename must chase all consumers.
- Duplicate `GameBioware` definitions (`types/equipment.ts:252` vs `stores/gamedata.ts:234`) can drift; consolidate during #62b.
- Cyberware grade (`Used`, `Alphaware`, …) does **not** scale bonus values in desktop — do not multiply improvements by grade.
- `addGear` with quantity > 1: desktop creates improvements once per gear *object*, not per unit; mirror that (quantity affects cost only).
- ESLint `max-lines-per-function: 60` / `complexity: 10`: `addCyberware` grows — extract the grade table and improvement wiring into helpers.
- `calculateAll().initiativeBonus` removal is a **breaking change to `CharacterCalculations`** — `CharacterSheet.svelte` and `AttributeAllocator.svelte` render initiative; check both.

---

## Issue #63: Create improvements from magic/resonance sources (powers, metatype, metamagic, echoes)

**Labels:** `epic:engine2`, `priority:critical`

### Verified current state

- **Duplicates again** — none of either copy creates improvements:
  - `addPower`: `stores/magic.ts:203` (barrel export) **and** `stores/character.ts:1782`; `removePower`: `magic.ts:232` / `character.ts:1814`.
  - `learnMetamagic`: `magic.ts:359` **and** `character.ts:4008`; `learnEcho`: `technomancer.ts:101` **and** `character.ts:3814`.
  - `setMetatype`: `creation.ts:181` (barrel export, `stores/index.ts:109`) **and** `character.ts:288`. **The UI imports the character.ts copy** (`MetatypeSelector.svelte:3`, `manual/IdentitySection.svelte:3` — both `from '$stores/character'`). The two are currently identical copies.
- Data model constraints:
  - `char.magic.metamagics` and `char.resonance.echoes` are `string[]` (names only, no ids).
  - `CharacterPower` has `id`, `name`, `points`, `level`.
  - `Metatype` (`types/character.ts:24–37`) has no `bonus` field; `GamePower` (`stores/gamedata.ts:161–169`) has no `bonus`; `GameEcho.bonus` is a display **string** (`stores/gamedata.ts:273–278`).
  - powers.json / metatypes.json / echoes.json / metamagic.json carry **zero** structured bonus data (survey 2026-07-16); the desktop XML has: powers.xml 55 `<bonus>` nodes, metatypes.xml 70 (16 on base metatypes — e.g. Troll — rest on metavariants/critters), echoes.xml 9, metamagic.xml 6.
- Desktop parity facts (verified in source/data):
  - `frmCreate.cs:2237` — powers: `CreateImprovements(Power, objPower.InternalId, bonus, false, Convert.ToInt32(objPower.Rating), …)` — **rating = power level**.
  - `frmCreate.cs:2361/2373` — metamagic/echo: source `Metamagic`/`Echo`, rating 1.
  - Metatype bonuses are applied at character creation from `metatypes.xml` (e.g. Troll: `<armor><b>1</b><i>1</i></armor><reach>1</reach>`; Centaur/shapeshifters: `<addattribute name MAG …>` + `<enabletab><name>critter</name></enabletab>`).
  - Improved Reflexes exists as **three separate powers** (`Improved Reflexes 1/2/3`) with fixed values: IR2 = `<initiativepass>2</initiativepass>` + REA `precedence="0"` val 2 (powers.xml).
  - **Stacking mechanism** (`clsImprovement.cs:891–1006`, `ValueOf`): improvements with a `uniqueName` contribute only the highest value per group; additionally, if any collected uniqueName is `precedence1`, the total becomes the **sum of only precedence1 items**; if any is `precedence0`, the total becomes the **single highest precedence0 value, overriding everything**. Wired Reflexes/Reaction Enhancers REA are `precedence1` (they sum with each other, override plain bonuses); adept Improved Reflexes REA is `precedence0` (it alone applies when present). Initiative passes never stack because both cyberware and powers write uniqueName `initiativepass`.
  - The web `valueOf` (`engine/improvementManager.ts:18–69`) implements plain uniqueName-highest but **not** `precedence0`/`precedence1`.

### Design

**Sub-issue #63a — dedupe magic/resonance/metatype mutations.** Split-module versions (`magic.ts`, `technomancer.ts`, `creation.ts`) win; delete the `character.ts` copies (`setMetatype` 288, `addPower` 1782, `removePower` 1814, `learnEcho` 3814, `learnMetamagic` 4008 — plus their neighbors `removeEcho`/`removeMetamagic` if duplicated); repoint `MetatypeSelector.svelte`, `IdentitySection.svelte`, `MagicSelector.svelte` imports to the barrel. Pure refactor, no behavior change.

**Sub-issue #63b — improvements wiring.**

- `valueOf` gains desktop precedence semantics (this issue needs it for its acceptance criterion; #66 covers the remaining `valueOf` gaps):

```ts
// engine/improvementManager.ts — inside valueOf, after collecting uniqueGroups
// 1. sum highest-per-uniqueName as today
// 2. if uniqueGroups has 'precedence1': total = sum of ALL precedence1 entries (not just highest)
// 3. if uniqueGroups has 'precedence0': total = highest precedence0 entry (overrides everything)
```

  Parser side: `specificattribute`/`addattribute` entries with a `precedence` property emit `uniqueName: 'precedence' + n` (converter #62b must preserve the XML attribute — emit it as `{ name: 'REA', precedence: '1', val: 'Rating' }`).
- `addPower(power)` → `createImprovementsFromBonus('Power', newPower.id, gamePower.bonus, power.level)`; `removePower` → `removeImprovements(imps, 'Power', power.id)`. Changing a leveled power's level = remove + re-create (desktop does the same on rating change).
- `setMetatype` → sourceName = **metatype name** (a character has exactly one; ids don't exist for metatypes):

```ts
// creation.ts setMetatype — before building `updated`
let imps = char.improvements;
if (char.identity.metatype) {
    imps = removeImprovements(imps, 'Metatype', char.identity.metatype);
    if (char.identity.metavariant) imps = removeImprovements(imps, 'Metavariant', char.identity.metavariant);
}
const metatypeImps = metatype.bonus
    ? createImprovementsFromBonus('Metatype', metatypeName, metatype.bonus, 1) : [];
const variantImps = variant?.bonus
    ? createImprovementsFromBonus('Metavariant', metavariantName!, variant.bonus, 1) : [];
```

  Both `creation.ts:181` (after #63a: the only copy) gets this; the metatype's racial quality lists (`metatype.qualities.positive/negative`) are a separate concern — see open question in the epic summary (metatypes.json currently has empty quality arrays even for Dwarf).
- `learnMetamagic(name)` → `createImprovementsFromBonus('Metamagic', name, gameMetamagic.bonus, 1)`; `removeMetamagic` symmetric. Names are unique per character (`includes` guard exists at magic.ts:364), so name-keying is safe.
- `learnEcho(name)` → source `'Echo'`, name-keyed (same uniqueness guard, technomancer.ts:106). Echo bonus examples from echoes.xml: `livingpersona` children, `skillwire`, `initiativepassadd`, `matrixinitiativepassadd`.
- `bondFocus` is **out of scope** — belongs to #85 (Magic epic); note the dependency there.

### Implementation steps

1. **#63a** delete character.ts copies; repoint component imports; barrel untouched (already correct). → verify: `npm run check` + full tests green; grep shows single implementations.
2. Implement precedence0/1 in `valueOf` + parser emission of `precedence` uniqueNames. → verify: new `valueOf` unit tests (below).
3. Wire `addPower`/`removePower`. → verify: power tests below.
4. Wire `setMetatype` with switch-cleanup. → verify: metatype tests below.
5. Wire `learnMetamagic`/`removeMetamagic`, `learnEcho`/`removeEcho`. → verify: tests below.
6. Full suite + lint. → verify: green.

### Test plan

| Test | Setup | Expected |
| --- | --- | --- |
| `precedence1 sums and overrides plain` | improvements: Attribute/rea +1 (uniqueName ''), +2 (`precedence1`), +1 (`precedence1`) | `valueOf(imps,'Attribute','rea')` = 3 (2+1; the plain +1 ignored) |
| `precedence0 overrides all` | above + Attribute/rea +2 (`precedence0`) | = 2 |
| `Improved Reflexes 2 (adept)` | `addPower({name:'Improved Reflexes 2', points:2.5, level:1})` with powers.json bonus | improvements: `InitiativePass` val 2 uniqueName `initiativepass`; `Attribute`/`rea` val 2 uniqueName `precedence0` |
| `IR2 + Wired Reflexes 2 do not stack` | both present (needs #62c) | initiative dice = 1 + max(2,2) = **3**; REA bonus = **2** (precedence0 wins) |
| `metatype switch leaves no orphans` | `setMetatype(gd,'Troll')` then `setMetatype(gd,'Human')` | after Troll: `BallisticArmor` 1, `ImpactArmor` 1, `Reach` 1 (source `Metatype`, sourceName `Troll`); after switch to Human: zero Metatype improvements |
| `power removal` | add then `removePower(id)` | improvements for that power id gone; a second identical power (if legal) unaffected |
| `echo` | technomancer, submersion 1, `learnEcho` with `initiativepassadd` bonus | Echo-sourced improvement exists; `removeEcho` clears it |

### Dependencies

- **#62b** (converter + game-type `bonus` fields for powers/metatypes/echoes/metamagic — the converter work is specified there and must cover these files).
- **#66** for `"Rating"`-string values in power bonuses (leveled powers in powers.xml mostly use fixed per-level entries, so #63 can land before #66 with the skip-and-warn fallback from #62c).
- #62c for the combined cyberware+adept stacking test.

### Size

**M** (#63a S, #63b M)

### Risks & edge cases

- `addattribute` MAG/RES (Adept/Magician/Technomancer qualities, 31 occurrences in qualities.json; also critter metatypes) is currently **unhandled by the parser** — the web handles MAG/RES enablement via the hardcoded `MAGIC_QUALITIES` list in `addQuality` (character.ts:633). Do **not** double-implement: #68 maps `addattribute` → `Attribute` with uniqueName `enableattribute` and **value 0** (desktop `clsImprovement.cs:1200–1212` reads only the attribute name; min/max/val/aug children are ignored); until then the hardcoded list stays.
- Metatype improvements must survive persistence: sourceName is the metatype *name*, so a saved character re-setting the same metatype must not duplicate — `setMetatype` always removes-then-adds.
- Shapeshifter/critter metatypes carry `enabletab critter` — `SpecialTab` consumer (`AttributeAllocator.svelte:20–25`) only checks magician/adept/technomancer; harmless extra improvement, don't block on it.
- `powerPoints` for `AdeptPowerPoints` improvements (metamagic source in metamagic.xml) interacts with in-flight uncommitted work on `powerPoints` (svelte-check errors noted in plan §1) — coordinate with #99.
- Precedence changes alter existing `valueOf` results only when data contains `precedence` attributes — currently none in JSON (converter emits them first in #62b), so step 2 is safe to land early.

---

## Issue #64: Align improvement producer/consumer type mismatches

**Labels:** `epic:engine2`, `priority:critical`, `bug`

### Verified current state

- **Parser production** (`engine/improvementManager.ts:102–229`): structured handlers for `specificattribute`/`selectattribute` → `Attribute`, `specificskill`/`selectskill` → `Skill`, `skillgroup` → `SkillGroup`, `skillcategory` → `SkillCategory`; `propMappings` table (185–207) for 21 flat-number keys; 5 boolean flags (217–221); `enabletab` → `SpecialTab` (224–226). Exactly **31 of 89** types producible.
- **The `conditionmonitor` mapping is doubly wrong** (`improvementManager.ts:188`): it maps a *flat number* to type `ConditionMonitor`, but (a) desktop `conditionmonitor` is an **object** with children `physical`/`stun`/`threshold`/`thresholdoffset`/`overflow` mapped to `PhysicalCM`/`StunCM`/`CMThreshold`/`CMThresholdOffset`/`CMOverflow` (`clsImprovement.cs:1628–1663`; threshold and thresholdoffset support `precedence` attributes), and (b) **no consumer reads `ConditionMonitor`** — `calculatePhysicalCM`/`calculateStunCM`/`calculateOverflow` (`calculations.ts:53–68`) read `PhysicalCM`/`StunCM`/`CMOverflow`.
- **The plan's Toughness example is factually wrong:** desktop `qualities.xml` gives Toughness `<damageresistance>1</damageresistance>` (+1 die on damage-resistance tests), not +1 Physical CM. `Will to Live (Rating 1–3)` is the CM quality: `<conditionmonitor><overflow>N</overflow></conditionmonitor>`. **Both bugs compound:** the current qualities.json has *no* `conditionmonitor` key at all — Will to Live's bonus was dropped by whatever produced the JSON (verified: `"Will to Live (Rating 1)"` has `bonus: undefined`). Data regeneration via #62b is required before the parser fix is observable.
- **Consumed types** (verified across `calculations.ts` and `AttributeAllocator.svelte:20–177`): Attribute, PhysicalCM, StunCM, CMOverflow, Initiative, InitiativePass, InitiativePassAdd, Composure, JudgeIntentions, Memory, LiftAndCarry, BallisticArmor, ImpactArmor, DrainResistance, FadingResistance, MatrixInitiative, MatrixInitiativePass, MatrixInitiativePassAdd, SpecialTab — 19 types.
- **Produced-but-never-consumed** (13): Skill, SkillGroup, SkillCategory (→ #65), ConditionMonitor (dead — fix here), DamageResistance, Notoriety (→ #90, career epic), LifestyleCost (→ #91), Reach, UnarmedDV, MovementPercent/SwimPercent/FlySpeed (→ #70), RestrictedItemCount (→ #93), NuyenMaxBP, FreePositiveQualities/FreeNegativeQualities, Skillwire, CyberwareEssCost/BiowareEssCost, SensitiveSystem, BlackMarketDiscount (→ #96), Uneducated/Uncouth/Infirm (→ #67).
- **Consumed-but-never-produced** (7): PhysicalCM, StunCM, CMOverflow, Memory, BallisticArmor, ImpactArmor, FadingResistance.
- Desktop `armor` bonus node (23 occurrences: cyberware/bioware/powers/metatypes/qualities): `<armor><b>N</b><i>N</i></armor>` → `BallisticArmor`/`ImpactArmor` (`clsImprovement.cs:1785–1795`). Desktop `memory` node (bioware/gear) → `Memory`.

### Design

This issue fixes the **mismatches among types that already have one side implemented**; blanket expansion to all data keys is #68.

1. **Parser fixes** (`improvementManager.ts`):

```ts
// remove: conditionmonitor from propMappings
// add structured handlers:
if (bonusData.conditionmonitor) {
    const cm = bonusData.conditionmonitor; // { physical?, stun?, threshold?, thresholdoffset?, overflow? }
    if (cm.physical !== undefined) b('PhysicalCM', '', { val: resolve(cm.physical) });
    if (cm.stun !== undefined) b('StunCM', '', { val: resolve(cm.stun) });
    if (cm.threshold !== undefined) b('CMThreshold', '', { val: resolve(cm.threshold), uniqueName: precedenceOf(cm.threshold) });
    if (cm.thresholdoffset !== undefined) b('CMThresholdOffset', '', { val: resolve(cm.thresholdoffset), uniqueName: precedenceOf(cm.thresholdoffset) });
    if (cm.overflow !== undefined) b('CMOverflow', '', { val: resolve(cm.overflow) });
}
if (bonusData.armor) {  // { b?, i? }
    if (bonusData.armor.b !== undefined) b('BallisticArmor', '', { val: resolve(bonusData.armor.b) });
    if (bonusData.armor.i !== undefined) b('ImpactArmor', '', { val: resolve(bonusData.armor.i) });
}
// propMappings additions: memory → 'Memory', fadingresist → 'FadingResistance' (web-side symmetric
// with drainresist; desktop lacks a fadingresist node — document as web extension, keep parsing tolerant)
```

   (`resolve` = the #66 value resolver; before #66, numbers pass through and strings warn-and-skip.)
2. **New consumers** for already-produced types:

```ts
// calculations.ts
/** SR4 damage soak: BOD + ballistic/impact armor + DamageResistance improvements. */
export function calculateDamageSoakBallistic(char: Character): number {
    return getAttributeTotal(char, 'bod') + calculateArmorBallistic(char)
        + valueOf(char.improvements, 'DamageResistance');
}
export function calculateDamageSoakImpact(char: Character): number; // same with impact
```

   Add both to `CharacterCalculations` + `calculateAll`. (Reach/UnarmedDV display consumers go to the equipment/combat surfaces later; not forced here.)
3. **Essence-cost consumers** (`CyberwareEssCost`/`BiowareEssCost`/`SensitiveSystem`, values are percentages — Biocompatability = 90):

```ts
// equipment.ts (used inside addCyberware / addBioware)
function essenceMultiplier(imps: readonly Improvement[], kind: 'Cyberware' | 'Bioware'): number {
    const type = kind === 'Cyberware' ? 'CyberwareEssCost' : 'BiowareEssCost';
    let pct = valueOf(imps, type) || 100;            // 90 ⇒ ×0.9
    if (kind === 'Cyberware' && valueOf(imps, 'SensitiveSystem') > 0) pct *= 2; // SR4: double essence cost
    return pct / 100;
}
```

   Applied in `addCyberware`/`addBioware` essence math (BasicBiowareEssCost applies only to bioware category `Basic` — defer that refinement to #68 with a note).
4. **Producer/consumer matrix test** (the drift guard):

```ts
// engine/__tests__/improvement-matrix.test.ts
const PRODUCED: ImprovementType[] = [...];   // maintained list: every type createImprovementsFromBonus can emit
const CONSUMED: ImprovementType[] = [...];   // every type read by calculations.ts / stores / components
const DEFERRED: Partial<Record<ImprovementType, string>> = {
    Notoriety: '#90', LifestyleCost: '#91', RestrictedItemCount: '#93', BlackMarketDiscount: '#96',
    MovementPercent: '#70', SwimPercent: '#70', FlySpeed: '#70',
    Skill: '#65', SkillGroup: '#65', SkillCategory: '#65',
    Uneducated: '#67', Uncouth: '#67', Infirm: '#67', /* … */
};
it('every produced type is consumed or explicitly deferred', () => {
    for (const t of PRODUCED) expect(CONSUMED.includes(t) || t in DEFERRED, t).toBe(true);
});
```

   Keeping `PRODUCED` in sync is enforced by exporting a `PRODUCIBLE_TYPES` const from `improvementManager.ts` next to the handler table and testing against it — the parser and the list live in the same file.

### Implementation steps

1. Export `PRODUCIBLE_TYPES` from `improvementManager.ts`; write the matrix test against the *current* state (with today's dead `ConditionMonitor` expected to fail) — commit it failing-then-fixed in the same PR. → verify: test red before fix, green after.
2. Implement conditionmonitor/armor/memory parser handlers; delete `ConditionMonitor` from `propMappings`. → verify: unit tests below.
3. Add `calculateDamageSoak*` consumers + `CharacterCalculations` wiring. → verify: Toughness test below.
4. Add `essenceMultiplier` into `addCyberware`/`addBioware`. → verify: Biocompatability test below.
5. Regenerate data via #62b so Will to Live carries its bonus. → verify: survey shows `conditionmonitor` key present in qualities.json.
6. Full suite + lint. → verify: green.

### Test plan

| Test | Setup | Expected |
| --- | --- | --- |
| `Toughness adds soak, not CM` | BOD 4, armor jacket (8/6, worn), `addQuality('Toughness', …)` | `calculateDamageSoakBallistic` = 4+8+1 = **13**; `calculatePhysicalCM` unchanged at 10 |
| `Will to Live (Rating 1) adds overflow` | BOD 4, quality bonus `{conditionmonitor:{overflow:1}}` | `calculateOverflow` = 4+1 = **5** |
| `armor bonus node` | Troll metatype bonus `{armor:{b:1,i:1}}` (via #63) or synthetic quality | `calculateArmorBallistic`/`Impact` each +1 with no worn armor |
| `Biocompatability (Cyberware)` | quality bonus `{cyberwareessmultiplier: 90}`; then add Datajack (0.1 ess) | essence cost 0.09; `char.attributes.ess` = 5.91 |
| `Sensitive System doubles cyberware essence` | quality flag; add Datajack | essence cost 0.2 |
| `matrix guard` | — | fails compilation/assert if a new produced type lacks consumer & deferral entry |

### Dependencies

- #62b (data regeneration — Will to Live/armor/memory keys only exist after the converter fix); #66 for string values (skip-and-warn fallback acceptable); #61 (barrel correctness for quality tests).
- Downstream: #65 (skills), #67 (flags), #70 (movement) each remove entries from `DEFERRED`.

### Size

**M**

### Risks & edge cases

- Order of operations in `addCyberware`: essence multiplier must read improvements that exist **before** this item is added (Biocompatability quality), not improvements the new item itself creates.
- Essence-multiplier retroactivity: desktop recalculates essence when the multiplier quality is added *after* cyberware; the web's stored `essence` per item is a snapshot. Match desktop by **not** retroactively adjusting in this issue; document divergence in the test file and revisit with #88 (expense undo).
- `conditionmonitor.threshold` precedence attributes need converter preservation (#62b emits `{ threshold: { value: 1, precedence: '0' } }`-style objects — normalize shape in `extractBonus` and document it in `BonusData`).
- Layered-armor interplay: `calculateArmorBallistic` (calculations.ts:271–292) applies a simplified layering rule; improvement armor adds flat on top (desktop equivalent). Do not "fix" layering here.
- The matrix test is intentionally a maintained list, not reflection — reviewers must reject PRs that grow `PRODUCIBLE_TYPES` without a consumer or deferral.

---

## Issue #65: Integrate Skill/SkillGroup/SkillCategory improvements into dice pools

**Labels:** `epic:engine2`, `priority:critical`

### Verified current state

- `calculateDicePool` (`calculations.ts:219–238`): `skill.rating + attr + skill.bonus + woundModifier`; defaulting = `attr − 1`. No improvement consultation at all.
- `CharacterSkill` (`types/skills.ts:70–76`) = `{ name, rating, specialization, bonus, karmaSpent }` — **no category, no group**. Category/group live only in game data (`SkillDefinition`, `types/skills.ts:55–64`: `attribute`, `category`, `default`, `skillgroup`, `specializations`).
- The parser already produces `Skill` (specificskill/selectskill, improvementManager.ts:155–168), `SkillGroup` (:169–175), `SkillCategory` (:176–182) — with `val` from `bonus` and `max` from `max`; `exclude` and `addToRating` fields exist on `Improvement` (types/improvements.ts:167–171) but are **never written by the parser and never read**.
- Desktop semantics (verified):
  - `ValueOf(type, blnAddToRating, improvedName)` (`clsImprovement.cs:891`): improvements where `AddToRating != blnAddToRating` are excluded — pool bonuses and rating bonuses are disjoint query modes.
  - `specificskill` handling (`clsImprovement.cs:1690–1712`): optional `<applytorating>yes</applytorating>` child sets `AddToRating`; `<bonus>` child → val; `<max>` child → a separate max-modifier improvement; optional `precedence` attribute → uniqueName.
  - `skillcategory`/`skillgroup` nodes support `<exclude>` children; `Exclude` is stored on the improvement and consulted by skill display/pool code (`clsUnique.cs` Skill class checks `objImprovement.Exclude == Name`).
  - Skill data category names in web `skills.json` match desktop exactly: `Combat Active`, `Physical Active`, `Social Active`, `Technical Active`, `Magical Active`, `Resonance Active`, `Vehicle Active`.

### Design

1. **Denormalize category/group onto `CharacterSkill`** (desktop's Skill object carries both; engine functions must stay pure with no gamedata store access):

```ts
// types/skills.ts
export interface CharacterSkill {
    readonly name: string;
    readonly rating: number;
    readonly specialization: string | null;
    /** @deprecated display-only; dice pools use improvements. Kept for XML import compat. */
    readonly bonus: number;
    readonly karmaSpent: number;
    readonly category?: SkillCategory;   // optional: pre-migration saves lack it
    readonly group?: string;             // '' = none
}
```

   Populated in `setSkill`/`setSkillWithGroupCheck` (`stores/skills.ts`) from the `SkillDefinition`; persistence load backfills missing fields by name-lookup against loaded gamedata (add `backfillSkillMeta(char, gameData)` in `stores/persistence.ts` at load time — this is the Firestore migration; `exactOptionalPropertyTypes` means write the fields only when known).
2. **`valueOf` addToRating parameter** (desktop-exact):

```ts
export function valueOf(
    improvements: readonly Improvement[] | undefined,
    type: ImprovementType,
    improvedName?: string,
    propertyToSum: 'val' | 'min' | 'max' | 'aug' | 'augMax' = 'val',
    addToRating = false
): number; // filters imp.addToRating !== addToRating
```

   Default `false` preserves every existing call site (all current improvements have `addToRating: false`).
3. **Dedicated pool helper** (keeps `valueOf` free of exclude logic; complexity budget):

```ts
// engine/improvementManager.ts
/** Total dice-pool bonus for a skill from Skill + SkillGroup + SkillCategory improvements,
 *  honoring `exclude` (desktop: an improvement whose exclude equals the skill name is skipped). */
export function skillPoolBonus(
    improvements: readonly Improvement[] | undefined,
    skill: { name: string; group?: string; category?: string },
    addToRating = false
): number;
```

   Implementation: three `valueOf`-style passes with an exclude predicate `imp.exclude.split(',').map(s => s.trim()).includes(skill.name)`.
4. **`calculateDicePool` rewrite:**

```ts
export function calculateDicePool(char, skillName, attributeCode): number {
    const skill = findSkill(char, skillName);
    const attr = getAttributeTotal(char, attributeCode);
    if (!skill) return Math.max(0, attr - 1); // defaulting unchanged (see risks)
    const ratingBonus = skillPoolBonus(char.improvements, skill, true);   // addToRating
    const poolBonus = skillPoolBonus(char.improvements, skill, false);
    const effectiveRating = skill.rating + ratingBonus;                    // cap interaction: see #66 max wiring
    return Math.max(0, effectiveRating + attr + poolBonus + getWoundModifier(char));
}
```

   `skill.bonus` is **dropped from the pool** (deprecated); XML importer keeps writing it for fidelity. The `attributeCode` parameter keeps the existing union `'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil'` (calculations.ts:222) — widening to `edg`/`mag`/`res` is out of scope here.
5. **Parser:** `specificskill`/`selectskill` write `addToRating` from the bonus data's `applytorating` flag; `skillcategory`/`skillgroup` write `exclude` (converter #62b must carry `applytorating` and `exclude` through — extend `BonusData` skill entries: `{ name, bonus?, max?, applytorating?, exclude? }`).

### Implementation steps

1. Type change + `setSkill` population + persistence backfill. → verify: `npm run check`; existing skill tests green; new backfill unit test (character without category loads and gains it).
2. `valueOf` addToRating param (additive, default false). → verify: full suite unchanged.
3. `skillPoolBonus` + unit tests. → verify: tests below.
4. `calculateDicePool` rewrite. → verify: tests below + existing `calculations.test.ts` updated where it asserted `skill.bonus` inclusion.
5. Parser writes `addToRating`/`exclude`; converter carries them (#62b coordination). → verify: parse test with `applytorating` fixture.
6. Full suite + lint. → verify: green.

### Test plan

(AGI 4, Pistols 3 baseline → pool 7.)

| Test | Setup | Expected |
| --- | --- | --- |
| `specificskill bonus` | quality: `{specificskill:[{name:'Pistols',bonus:2}]}` (Analytical-Mind-style) | pool 9 |
| `skillgroup bonus` | Animal Empathy-style `{skillgroup:[{name:'Firearms',bonus:2}]}`, Pistols group='Firearms' | pool 9 |
| `skillcategory bonus with exclude` | `{skillcategory:[{name:'Combat Active',bonus:1,exclude:'Dodge'}]}` | Pistols pool 8; Dodge pool unchanged |
| `addToRating vs pool` | improvement `Skill/Pistols val 1 addToRating:true` on rating-3 skill | effective rating 4 shown; pool 8; a plain pool bonus does not change effective rating |
| `unskilled defaulting` | no Pistols skill | pool = AGI − 1 = 3 (improvements do not apply when defaulting — documented divergence risk below) |
| `wound modifier still applies` | 3 boxes physical | pool −1 |

### Dependencies

- #61 (quality path creates the improvements used in tests); #62b (converter carries `applytorating`/`exclude`); #64 (matrix test rows for Skill/SkillGroup/SkillCategory flip from deferred to consumed); #66 interacts on `max` (skill-cap improvements) — the `max` flow is specified in #66, only `val` here.

### Size

**M**

### Risks & edge cases

- **Defaulting semantics:** desktop applies skill improvements to rating-0 skill objects; the web has no rating-0 skill entries. Keeping defaulting at `attr − 1` is a small divergence (a `+1 Pistols` improvement won't help a character without the skill). Accepted and documented in the test file; revisit if a golden test (#71) catches a real desktop mismatch.
- The deprecated `skill.bonus` is still rendered by components (grep `skill.bonus` in `SkillAllocator.svelte`/`CharacterSheet.svelte` during implementation) — display should switch to `skillPoolBonus` or show both; don't leave double-counted UI.
- `category`/`group` optionality under `exactOptionalPropertyTypes`: use conditional spread (`...(def ? { category: def.category } : {})`) — assigning `undefined` is a compile error.
- Knowledge skills are out of scope (desktop applies Skill improvements to them too; the web `KnowledgeSkill` type is separate — note for a follow-up in #67 where knowledge categories matter).
- `calculateDodge` (calculations.ts:266) routes through `calculateDicePool` and will silently pick up Dodge improvements — the desired #70 behavior; make sure the #70 spec doesn't double-add.

---

## Issue #66: Implement rating scaling and remaining valueOf semantics

**Labels:** `epic:engine2`, `priority:high`

### Verified current state

- `createImprovementsFromBonus` receives `rating` and stores it on each improvement, but no value is ever scaled — the punt comment sits at `improvementManager.ts:44–50`; `valueOf` sums the chosen property raw (`:51`).
- Desktop resolution model (verified, `clsImprovement.cs:1058–1101` `ValueToInt`): bonus values are resolved **once, at creation time** — `"Rating"` and attribute abbreviations (`BOD`…`RES`) are string-substituted, the result is evaluated as an XPath arithmetic expression and floored; `"FixedValues(a,b,c)"` indexes by rating (1-based). Read-time `Value` is used as stored. Exception: attribute `Minimum/Maximum/Augmented/AugmentedMaximum` modifiers multiply by `improvement.Rating` at read time (`clsUnique.cs:433–487`), but every creation site passing min/max/aug resolves via `ValueToInt` first and stores rating 1 — so creation-time resolution is the effective behavior. **Decision: the web resolves at creation time. `valueOf` stays a pure summation.**
- Real string shapes in desktop data (must all parse): `Rating`, `-Rating`, `Rating * 2`, `(Rating * 5)R` *(avail, not bonus — excluded)*, `FixedValues(2,3,5)`, plain integers. Attribute-name substitution (`BOD`, …) appears in bonus data rarely; requires character context the parser lacks.
- **Attribute min/max/aug mapping bug:** desktop `specificattribute` maps XML `val` → improvement **Augmented** (the value bonus) and XML `aug` → **AugmentedMaximum** (`clsImprovement.cs:1575–1608`). The web parser maps `val→val`, `aug→aug` where `aug` is documented as "Augmented bonus" (types/improvements.ts:156–157) — but the data means *augmented maximum* (the Adept quality's `addattribute` MAG XML carries `{min:1, max:6, val:1, aug:6}` where aug 6 is the augmented cap — though note desktop's `addattribute` handler itself ignores all four fields and stores zeros, `clsImprovement.cs:1200–1212`; the mapping fix here applies to `specificattribute`/`selectattribute`). Web consumers read `val` for the value (`getAttributeTotal`, calculations.ts:24), so the web convention is: `val` = value bonus, `aug` = **misnamed augmented-max**. Nothing reads `aug`/`augMax` today (`valueOf(propertyToSum)` callers all use default `'val'`).
- **`valueOf` improvedName divergence:** web includes improvements with `improvedName === ''` when a name filter is passed (`improvementManager.ts:33`); desktop requires exact equality (`clsImprovement.cs:911–916`). Today this is latent (all name-filtered queries target Attribute/Skill improvements which always carry names) but becomes a live bug once #62c/#63 create unnamed improvements of the same types.
- No transaction system exists (desktop `Commit`/`Rollback`, `clsImprovement.cs:2800–2817`, rolls back on user-cancelled selection dialogs).
- Attribute caps: `attributeLimits` (metatype min/max) are enforced in `stores/attributes.ts#setAttribute` (`:190–238`; the check is a silent clamp at `:197`, `Math.max(limits.min, Math.min(limits.max, value))` — lines 81–176 are BP-cost helpers, not validation) and `engine/validation.ts:122–172`; **augmented maximum is enforced nowhere**, and improvement `min`/`max` modifiers are read nowhere.

### Design

1. **Value resolver** (creation-time, desktop-equivalent minus XPath):

```ts
// engine/improvementManager.ts
/**
 * Resolve a bonus value to a number. Handles:
 *  - numbers (pass through)
 *  - "Rating" arithmetic: substitute rating, evaluate + - * / and parentheses (floor result)
 *  - "FixedValues(a,b,c)": pick entry [rating - 1] (clamped to last entry)
 * Returns undefined (with console.warn) for unresolvable strings (e.g. attribute names).
 */
export function resolveBonusValue(raw: number | string | undefined, rating: number): number | undefined;
```

   The arithmetic evaluator is a ~20-line recursive-descent/shunting-yard over `[0-9+\-*/(). ]` after substitution — **no `eval`, no `Function`**. Attribute-name substitution (desktop `BOD`… replacement) is explicitly unsupported: warn and skip (survey found no bonus values using it in shipped SR4 data; `ess`/`avail`/`cost` fields use `Rating` arithmetic heavily but those are not bonus values).
2. All parser handlers route values through `resolveBonusValue(raw, rating)`; a rating change on an item (e.g. future `setCyberwareRating`) is remove-improvements + re-create, never in-place mutation.
3. **Fix the attribute field mapping** while touching every handler anyway — align field names to desktop meaning:

```ts
// types/improvements.ts — semantic clarification (no rename of persisted keys; JSDoc + mapping fix only)
/** min  = modifier to the attribute's natural minimum */
/** max  = modifier to the attribute's natural maximum */
/** aug  = (unused legacy; parser stops writing it)    */
/** augMax = modifier to the augmented maximum (XML `aug`) */
/** val  = modifier to the attribute's current value  (XML `val`) */
```

   Parser change: `specificattribute`/`selectattribute` write `augMax: resolve(attr.aug, rating)` instead of `aug:` (`addattribute` is the exception — desktop stores zeros for it, `clsImprovement.cs:1200–1212`; its handler lands in #68). Persisted characters: no migration needed (nothing read `aug`/`augMax` before; recreated improvements get the new mapping — saved improvements from qualities keep working because their `val`/`min`/`max` are unchanged).
4. **Wire attribute limit flows:**

```ts
// calculations.ts
/** Natural maximum incl. improvements (metatype max + Attribute max-modifiers). */
export function getAttributeNaturalMax(char: Character, attr: AttributeValueKey): number;
/** Augmented maximum: SR4 = floor(natural max × 1.5), plus augMax improvements. */
export function getAttributeAugmentedMax(char: Character, attr: AttributeValueKey): number;
// getAttributeTotal clamps: min(base + bonus + valOf improvements, augmentedMax)
```

   `stores/attributes.ts#setAttribute` (`:190–238`) switches the max side of its clamp (`:197`) from `limits.max` to `getAttributeNaturalMax` (metatype limit + `valueOf(..., 'max')`); Exceptional Attribute (`selectattribute {max:1}`) then works for free. Note the semantics: `setAttribute` **clamps silently** rather than rejecting — an over-cap call succeeds and stores the clamped value.
5. **`valueOf` exact-name matching:** drop the `|| imp.improvedName === ''` fallback (`improvementManager.ts:33`). Audit call sites: all pass lowercase attr codes or skill names against improvements that carry the same — the empty-name fallback is only reachable by malformed data.
6. **Transactions: DO NOT PORT.** Store mutations are single immutable `characterStore.set()` calls — improvement creation and the state change land atomically or not at all; user-cancelled selection dialogs abort *before* the mutation runs (the wizard collects selections first — `AddQualityOptions` pattern). Record in `.claude/ArchitectureDecisions.md` with a pointer to desktop `clsImprovement.cs:2800`.
7. `propertyToSum` variants get direct test coverage (currently zero tests touch `'min' | 'max' | 'aug' | 'augMax'`).

### Implementation steps

1. `resolveBonusValue` + exhaustive unit tests (pure function). → verify: table test below.
2. Thread it through all existing parser handlers; parser signature unchanged. → verify: existing improvementManager tests green; new rating tests.
3. Attribute field-mapping fix (`aug` → `augMax`). → verify: parse test on a `specificattribute` fixture with `aug:6` asserts `augMax === 6` (not an `addattribute` fixture — that node stores zeros per desktop; see #68).
4. `getAttributeNaturalMax`/`getAttributeAugmentedMax` + clamp in `getAttributeTotal`; switch `attributes.ts` validation. → verify: tests below; existing attribute tests updated deliberately where caps now bind.
5. `valueOf` exact-name matching. → verify: full suite (any failure = a real latent consumer relying on the fallback — investigate, don't paper over).
6. Write the ADR for no-transactions. → verify: file exists, linked from this issue.
7. Full suite + lint. → verify: green.

### Test plan

| Test | Input | Expected |
| --- | --- | --- |
| `resolveBonusValue` table | `(3, r=2)`→3 · `('Rating', r=2)`→2 · `('-Rating', r=3)`→−3 · `('Rating * 2', r=2)`→4 · `('FixedValues(2,3,5)', r=3)`→5 · `('FixedValues(2,3,5)', r=9)`→5 (clamp) · `('BOD + 2', r=1)`→undefined + warn | as listed |
| `Wired Reflexes rating scaling` | bonus `{initiativepass:'Rating', specificattribute:[{name:'REA',precedence:'1',val:'Rating'}]}`, rating 2 | InitiativePass val 2; Attribute/rea val 2 |
| `rating upgrade re-creates` | remove + re-add at rating 3 | vals become 3; exactly one improvement set present |
| `Exceptional Attribute raises natural max` | human BOD limits {min1,max6}; quality `selectattribute {max:1}` targeting BOD | `getAttributeNaturalMax` = 7; `setAttribute('bod', 7)` stores 7; `setAttribute('bod', 8)` **clamps to 7** (assert the stored base is 7 — `setAttribute` clamps, it does not reject) |
| `augmented max clamps` | BOD base 6 (max 6), augMax default → floor(6×1.5)=9; +5 attribute improvements | `getAttributeTotal` = 9, not 11 |
| `specificattribute aug→augMax mapping` | `specificattribute {name:'BOD',min:1,max:6,val:1,aug:6}` (synthetic) | improvement `{min:1,max:6,val:1,augMax:6}` (`addattribute` stores zeros instead — tested in #68) |
| `exact-name filter` | Attribute/'' val 2 + Attribute/'rea' val 1 | `valueOf(imps,'Attribute','rea')` = 1; `valueOf(imps,'Attribute')` = 3 |
| `propertyToSum` | mixed min/max/augMax improvements | each property sums independently |

### Dependencies

- #62b (string values only exist in JSON after the converter carries them). Blocks the full value of #62c/#63b (they land with warn-and-skip until this merges). #65 consumes the `max` flow for skill caps in a follow-up (skill max wiring stays here as attribute-only; skill rating caps are #65's risk note).

### Size

**M**

### Risks & edge cases

- The arithmetic evaluator must reject anything outside its grammar loudly (warn + undefined), not throw — malformed data must never crash character load.
- `FixedValues` with rating 0 (unrated item passed rating 0): clamp to index 0 and warn — desktop would throw.
- Clamping `getAttributeTotal` to augmented max changes existing derived values for characters previously over-cap — this is a *correction*, but goldens/UI snapshots will move; update `calculations.test.ts` expectations explicitly, never loosen assertions.
- `getAttributeTotal`'s attr union (`calculations.ts:19–26`) excludes `mag`/`res`; the new max helpers should cover them (`getMagicTotal`/`getResonanceTotal` clamp too — initiate grade raising MAG cap interacts with the Magic epic #84; keep the helper metatype+improvement-based and let #84 extend it).
- ESLint `complexity: 10` on the evaluator: split tokenizer/parser into separate functions.

---

## Issue #67: Wire Uneducated/Uncouth/Infirm into skill costs

**Labels:** `epic:engine2`, `priority:high`

### Verified current state

- Parser produces the flags (`improvementManager.ts:217–219`: `uneducated`/`uncouth`/`infirm` → val-1 improvements). Nothing consumes them.
- `utils/qualities.ts:320–337` renders display text only ("Technical/Academic skills cost double", etc. — note its Infirm text says "Physical **attributes**", which is wrong; SR4/desktop double Physical **skills**).
- Skill BP is computed flat in **two duplicate functions**: `calculateSkillsBP` (`stores/character.ts:804`, private, `SKILL_BP_PER_POINT = 4` at :796) and `calculateSkillsBP` (`stores/skills.ts:29`, exported, own constant at :20). Career karma costs: `getSkillImprovementCost` in `stores/career.ts`.
- Exporter hardcodes `<uneducated>False</uneducated>` / uncouth / infirm (`xml/exporter.ts:75–77`).
- Desktop parity (verified `clsUnique.cs:3150–3200`): BP cost per rating point **×2** when `(Uneducated && category === 'Technical Active') || (Uncouth && 'Social Active') || (Infirm && 'Physical Active')`; the same doubling applies in the karma-build branch (`KarmaNewActiveSkill`/`KarmaImproveActiveSkill` ×2). Desktop `Character.Uneducated` booleans are set/cleared by the improvement engine itself (`clsImprovement.cs:1899–1903` on create, `:2653+` on remove, with a has-any-other-source check).
- SR4 RAW (SR4A p. 94–95): Uneducated also doubles **Academic and Professional knowledge** skill costs and forbids defaulting on those skills; Uncouth forbids defaulting on Social Active skills. The verified desktop code doubles only the *active* categories — the knowledge-skill and defaulting halves are RAW-but-not-desktop.
- Web skill categories match desktop strings exactly (`skills.json`: `Technical Active`, `Social Active`, `Physical Active`; knowledge categories `Academic`, `Professional` exist in `KnowledgeSkillCategory`).

### Design

- Consumption is a pure predicate over improvements (no new character fields — unlike desktop's cached booleans, the web derives):

```ts
// engine/improvementManager.ts
export function hasFlag(
    improvements: readonly Improvement[] | undefined,
    type: 'Uneducated' | 'Uncouth' | 'Infirm' | 'SensitiveSystem' | 'BlackMarketDiscount'
): boolean {
    return valueOf(improvements, type) > 0;
}
```

- Cost multiplier helper colocated with the cost functions:

```ts
// stores/skills.ts
/** ×2 when a cost-doubling quality flag applies to this skill's category (SR4 p.94–95). */
export function skillCostMultiplier(
    improvements: readonly Improvement[] | undefined,
    category: SkillCategory | undefined
): 1 | 2 {
    if (category === 'Technical Active' && hasFlag(improvements, 'Uneducated')) return 2;
    if (category === 'Social Active' && hasFlag(improvements, 'Uncouth')) return 2;
    if (category === 'Physical Active' && hasFlag(improvements, 'Infirm')) return 2;
    return 1;
}
```

- `calculateSkillsBP(skills, improvements)` gains the improvements parameter and applies the multiplier per skill (needs `skill.category` from #65). **Kill the duplicate:** character.ts's private copy is deleted; character.ts imports the skills.ts version (or, if #62a/#63a already gutted character.ts skill functions, this lands there).
- Karma build: `career.ts#getSkillImprovementCost` and creation karma costing apply the same multiplier (`KARMA_BUILD_COSTS` untouched — multiplier at use site, matching desktop).
- Knowledge skills: apply ×2 to `Academic`/`Professional` knowledge categories when Uneducated (`stores/knowledgeSkills.ts#calculateKnowledgeSkillBPCost/KarmaCost`) — **flagged as RAW-beyond-desktop** in code comment; acceptance is SR4 RAW here.
- Defaulting: extend `calculateDicePool`'s no-skill branch (from #65): return 0 dice (cannot default) when the skill's definition category is Technical Active + Uneducated, or Social Active + Uncouth, per SR4. Requires passing the definition category for unknown skills — add optional param `defaultCategory?: SkillCategory` supplied by callers that know it (components have gamedata); when absent, defaulting behaves as today.
- Exporter: replace the three hardcoded lines with `hasFlag(char.improvements, …) ? 'True' : 'False'`.
- Fix the Infirm display string in `utils/qualities.ts:332–336` ("Physical skills cost double").

### Implementation steps

1. `hasFlag` helper + tests. → verify: unit test.
2. `skillCostMultiplier` + wire into `calculateSkillsBP` (single remaining copy) and karma cost paths. → verify: BP tests below; grep shows one `calculateSkillsBP`.
3. Knowledge-skill doubling. → verify: knowledge BP test below.
4. Defaulting block in `calculateDicePool`. → verify: defaulting test below.
5. Exporter real flags + importer already parses them? (check `xml/importer.ts` — if it discards `<uneducated>`, note only; import re-derives from qualities per #81). → verify: export test asserts `<uneducated>True</uneducated>` for an Uneducated character.
6. Fix display text. → verify: snapshot/text assertion.
7. Full suite + lint. → verify: green.

### Test plan

| Test | Setup | Expected |
| --- | --- | --- |
| `Uneducated doubles Technical Active BP` | Uneducated quality; Hacking (Technical Active) rating 3; Pistols (Combat Active) rating 3 | skills BP = 3×4×2 + 3×4 = **36** (was 24) |
| `Uncouth doubles Social Active` | Uncouth; Negotiation 2, Pistols 2 | 2×4×2 + 2×4 = 24 |
| `Infirm doubles Physical Active` | Infirm; Running 2 | 16 |
| `karma build doubling` | karma method, Uneducated, improve Hacking 3→4 in career | cost = 4×2 (rating × 2 multiplier per `KARMA_COSTS`) × 2 = matches desktop table ×2 |
| `Uneducated doubles Academic knowledge` | knowledge skill (Academic) rating 2 beyond free points | BP doubled vs baseline |
| `no defaulting on Technical when Uneducated` | no Hacking skill; `calculateDicePool(char,'Hacking','log','Technical Active')` (bare fourth `defaultCategory` param per the design — not an options object) | 0 |
| `flag removal restores costs` | remove Uneducated quality | improvements cleared (via #61 path); BP back to flat |
| `exporter flags` | Uneducated character → `exportCharacter` | XML contains `<uneducated>True</uneducated>`, others False |

### Dependencies

- **#65** (`skill.category` on `CharacterSkill` — hard dependency), #61 (quality improvements exist), #62b (regenerated data still carries `uneducated: true` — survey confirms it does today).

### Size

**M**

### Risks & edge cases

- BP-breakdown derived store (`bpBreakdown` in character.ts) must use the improvement-aware function or totals drift from validation; grep all `calculateSkillsBP` callers.
- Order dependence in the wizard: taking Uneducated *after* buying skills must immediately reprice (derived stores recompute — verify the BP display is derived, not cached).
- Skill groups: desktop doubles only non-grouped skills (`!_blnIsGrouped`, clsUnique.cs:3154); group BP (`calculateSkillGroupsBP`) is **not** doubled — match that, and note SR4 RAW ambiguity in a comment.
- Pre-#65 saves lack `skill.category` until backfill runs; `skillCostMultiplier(undefined)` returns 1 — costs are then desktop-correct only after gamedata loads. Acceptable: BP validation already requires loaded gamedata.
- The knowledge-skill doubling exceeds verified desktop behavior — if #71 goldens are generated from actual desktop totals for an Uneducated character with knowledge skills, expect a delta and document it there.

---

## Issue #68: Expand bonus parser toward full desktop CreateImprovements coverage

**Labels:** `epic:engine2`, `priority:high`

### Verified current state

- Parser covers 31 of 89 types (breakdown in #64). Desktop `CreateImprovements` (`clsImprovement.cs:1133–2460`) handles every node.
- **Bonus-key survey — current web JSON** (`static/data/*.json`, 2026-07-16): 36 distinct keys, **all in qualities.json only** (per-key counts): addattribute 31, enabletab 28, specificskill 28, notoriety 26, specificattribute 25, initiative 14, initiativepass 10, skillcategory 8, flyspeed 7, blackmarketdiscount 5, skillgroup 4, selectskill 3, lifestylecost 3, cyberwareessmultiplier 3, movementpercent 3, freenegativequalities 3, freepositivequalities 3, selectattribute 3, restricteditemcount 3, biowareessmultiplier 2, unarmeddv 2, reach 2, drainresist 2, basicbiowareessmultiplier 2, uneducated 2, nuyenmaxbp 1, composure 1, judgeintentions 1, swimpercent 1, genetechcostmultiplier 1, transgenicsgenetechcost 1, skillwire 1, damageresistance 1, infirm 1, sensitivesystem 1, uncouth 1.
- **Bonus-key survey — desktop XML across all convertible sources** (`F:\Projects\ChummerDesktop\bin\data\{cyberware,bioware,gear,powers,metatypes,echoes,metamagic,qualities,armor,martialarts,mentors}.xml`, direct children of `<bonus>`, 2026-07-16): **75 distinct keys.** The post-#62b target set, by frequency (count · key · files):

```
138 selecttext        (bioware,gear,powers,metamagic,qualities,armor,mentors)
 96 addattribute      (metatypes,qualities)      93 enabletab        (metatypes,qualities)
 92 specificskill     (cyber,bio,gear,powers,qualities,martialarts,armor,mentors)
 52 specificattribute (cyber,bio,powers,echoes,qualities,armor)
 39 conditionmonitor  (cyber,bio,powers,qualities)   39 reach          (metatypes,qualities)
 27 spellcategory     (gear,mentors)              26 weaponcategorydv (powers,martialarts)
 26 notoriety         (qualities)                 23 armor            (cyber,bio,powers,metatypes,qualities)
 22 initiativepass    (cyber,bio,powers,metatypes,qualities)
 17 selectside        (cyberware)                 17 skillcategory    (bio,gear,powers,qualities,armor)
 16 initiative        (cyber,qualities)           12 skillattribute   (cyber,bio,gear,qualities)
 12 selectskill       (bio,gear,powers,qualities,armor,mentors)
 12 skillgroup        (bio,powers,qualities,armor) 11 lifestylecost   (bio,metatypes,qualities)
  8 matrixinitiativepass (cyber,gear,armor)         8 damageresistance (cyber,bio,qualities,mentors)
  8 flyspeed          (gear,qualities)              7 skillsoftaccess  (cyber,gear,armor)
  7 livingpersona     (echoes,qualities)            6 skillwire        (cyber,echoes,qualities)
  6 movementpercent   (cyber,qualities)             6 selectattribute  (bio,powers,qualities)
  6 nuyenamt          (qualities)                   6 concealability   (armor)
  5 matrixinitiativepassadd (cyber,gear,echoes)     5 selectspell      (gear)
  5 blackmarketdiscount     4 smartlink (cyber,gear)  4 unarmeddv       4 matrixinitiative (gear,armor)
  3 drainresist  3 cyberwareessmultiplier  3 free{pos,neg}qualities  3 restricteditemcount
  2 swimpercent  2 unarmeddvphysical (bio,powers)  2 skillarticulation (bio)  2 selectskillgroup (bio)
  2 memory (bio,gear)  2 judgeintentions  2 biowareessmultiplier  2 basicbiowareessmultiplier  2 uneducated
  1 each: cyborgessence, adapsin, selectrestricted, selectweapon, adeptlinguistics, swapskillattribute,
    unarmedap, throwrange, throwstr, basiclifestylecost, selectsprite, initiativepassadd,
    quickeningmetamagic, freespiritpowerpoints, adeptpowerpoints, nuyenmaxbp, composure,
    genetechcostmultiplier, transgenicsgenetechcost, selectmentorspirit, selectparagon, infirm,
    sensitivesystem, uncouth, softweave, armorencumbrancepenalty
```

- Structured-node shapes verified in `clsImprovement.cs`: `livingpersona` → children response/signal/firewall/system/biofeedback → `LivingPersona*` (:1668–1690); `armor {b,i}` (:1785); `conditionmonitor` (#64); `matrixinitiativepass` forces uniqueName `matrixinitiativepassadd`-style grouping (:1846–1856); `transgenicsgenetechcost` → `TransgenicsBiowareCost` (:1877); `selecttext` → `Text` improvement from a user prompt (:1156–1189).
- Unknown keys are **silently ignored** today (the parser iterates only its own mappings).

### Design

1. **Table-driven handler registry** — the current single function would blow ESLint `complexity: 10` / `max-lines-per-function: 60` long before 75 keys:

```ts
// engine/bonusHandlers.ts (new file; improvementManager re-exports the public API)
export interface BonusContext {
    readonly source: ImprovementSource;
    readonly sourceName: string;
    readonly rating: number;
    readonly selections: BonusSelections;      // user choices, see below
    readonly emit: (imp: PartialImprovement) => void;
    readonly warn: (msg: string) => void;
}
export type BonusHandler = (value: unknown, ctx: BonusContext) => void;
export const BONUS_HANDLERS: Readonly<Record<string, BonusHandler>> = { /* one entry per key */ };

// improvementManager.ts main loop:
for (const [key, value] of Object.entries(bonusData)) {
    const handler = BONUS_HANDLERS[key];
    if (!handler) { console.warn(`[improvements] unhandled bonus key "${key}" on ${sourceName}`); continue; }
    handler(value, ctx);
}
```

   Simple numeric keys share a `numeric(type, uniqueName?)` handler factory; flags share `flag(type)`; structured nodes get dedicated functions. `PRODUCIBLE_TYPES` (#64) derives from this table.
2. **Selections** — generalize the existing `selectedSkill`/`selectedAttribute` pattern instead of desktop's modal dialogs:

```ts
// types/improvements.ts
export interface BonusSelections {
    readonly skill?: string;        // selectskill
    readonly skillGroup?: string;   // selectskillgroup
    readonly attribute?: string;    // selectattribute
    readonly text?: string;         // selecttext (Allergy: "gluten")
    readonly side?: 'Left' | 'Right'; // selectside (cyberlimbs)
    readonly weapon?: string;       // selectweapon
    readonly spell?: string;        // selectspell
}
/** What selections does this bonus need? UIs call this before add-time. */
export function getRequiredSelections(bonus: BonusData): readonly (keyof BonusSelections)[];
```

   `createImprovementsFromBonus(source, sourceName, bonus, rating, selections?)` replaces the two positional selection params (keep an overload or map old args for the existing quality call sites). `selecttext` → `Text` improvement with `improvedName = selections.text` (desktop concatenates into sourceName when `blnConcatSelectedValue` — the web instead stores the customDescription on the quality already; emit the `Text` improvement and leave naming alone).
3. **Implementation priority** (only keys present in data; three tiers):
   - **Tier 1 — mechanics consumed now or by this epic:** addattribute (→ Attribute + uniqueName `enableattribute`, replacing the hardcoded `MAGIC_QUALITIES` list — see #63 risk; desktop stores **value 0, rating 0** and ignores the XML `min`/`max`/`val`/`aug` children entirely, `clsImprovement.cs:1200–1212` — store val 0, or `getMagicTotal` (`calculations.ts:29–34`) reads +1 over desktop and #71 golden 2 breaks), selecttext, armor, conditionmonitor (#64), livingpersona (children response/signal/firewall/system/biofeedback → `LivingPersona*`; #68 **only produces** the `LivingPersonaResponse` improvement here — the `calculateMatrixInitiative` (`calculations.ts:360–364`) technomancer-branch rewrite is owned by #79 (C2), which must write `(INT×2) + 1 + valueOf(LivingPersonaResponse)` (`clsCharacter.cs:3823`) so the #71 golden-5 value `(4×2)+1+1` holds; flag the shared `calculations.ts:360-368` range in both PRs. The other four `LivingPersona*` types go into #64's `DEFERRED` list → Matrix/persona surface), matrixinitiative/matrixinitiativepass/matrixinitiativepassadd (uniqueName `matrixinitiativepass` per desktop :1846), smartlink (`Smartlink`), skillattribute/swapskillattribute (`SkillAttribute`/`SwapSkillAttribute` — production only; dice-pool consumption noted in #65 as follow-up), skillarticulation (`EnhancedArticulation`), memory, unarmeddvphysical, unarmedap, initiativepassadd, nuyenamt (`Nuyen`), spellcategory (`SpellCategory {name,val}`), weaponcategorydv (`WeaponCategoryDV`), throwrange/throwstr, adeptpowerpoints, freespiritpowerpoints, adeptlinguistics, quickeningmetamagic, basiclifestylecost, genetechcostmultiplier, transgenicsgenetechcost (→ `TransgenicsBiowareCost`), basicbiowareessmultiplier (`BasicBiowareEssCost`), softweave (`SoftWeave`), armorencumbrancepenalty (`ArmorEncumbrancePenalty`), concealability (`Concealability`), skillsoftaccess (`SkillsoftAccess`), cyborgessence, adapsin, selectside (Text).
   - **Tier 2 — selection prompts needing new UI plumbing:** selectskillgroup, selectweapon (`SelectWeapon`), selectspell (Text), selectsprite, selectrestricted (`Restricted`), selectmentorspirit/selectparagon (Text; mentors are modeled separately already).
   - **Tier 3 — explicitly skipped with rationale in code:** none expected; anything unimplemented keeps the console warning (acceptance requires zero warnings when loading all shipped data).
4. **Warning policy:** unknown key → `console.warn` once per key per session (Set-deduped), never throw.

### Implementation steps

1. Refactor existing 31 handlers into `BONUS_HANDLERS` with zero behavior change. → verify: existing improvementManager tests green unchanged.
2. Selections generalization (`BonusSelections`, `getRequiredSelections`), migrate quality call sites. → verify: QualitySelector flows still pass existing tests; new unit test for `getRequiredSelections`.
3. Tier 1 handlers, in survey-frequency order, one commit per handler batch with data-driven table tests. → verify: per-key parse test (fixture from real desktop XML shape) asserts type/val/uniqueName.
4. Tier 2 handlers + wizard prompts where a consuming UI exists (weapon picker for selectweapon may stub to Text until Epic 17 #72). → verify: table tests.
5. **Exhaustiveness gate:** author and commit `scripts/survey-bonus-keys.mjs` (the surveys above were produced with an ad-hoc walker that is **not** in the repo — writing this script is part of this issue; it must walk `<bonus>`/`bonus` direct-child keys across both the desktop XML and `static/data/*.json` and reproduce the counts above, so the spec's baseline numbers become independently checkable) + test that loads every `static/data/*.json`, runs each item's bonus through the parser, and asserts the unknown-key warn set is empty. → verify: script output matches the survey tables; test green against regenerated data.
6. Full suite + lint. → verify: green; `BONUS_HANDLERS` table entries each ≤ 60 lines trivially.

### Test plan

| Test | Input (real data shape) | Expected |
| --- | --- | --- |
| `addattribute MAG` | Adept quality `{addattribute:[{name:'MAG',min:1,max:6,val:1,aug:6}]}` | Attribute/`mag`, uniqueName `enableattribute`, **val 0, min 0, max 0, augMax 0** (desktop parity: `clsImprovement.cs:1200–1212` reads only the name and ignores min/max/val/aug — storing val 1 would inflate `getMagicTotal` and contradict #71 golden 2) |
| `livingpersona` | echo `{livingpersona:{response:1}}` | `LivingPersonaResponse` val 1 |
| `smartlink` | gear Smartlink `{smartlink:2}` | `Smartlink` val 2 |
| `matrixinitiativepass grouping` | two gear items each `{matrixinitiativepass:1}` | `valueOf('MatrixInitiativePass')` = 1 (uniqueName groups) |
| `weaponcategorydv` | martial-art/power `{weaponcategorydv:{name:'Clubs',bonus:1}}`-shape | `WeaponCategoryDV` improvedName `Clubs` val 1 |
| `selecttext` | Allergy + `selections.text='Gluten'` | `Text` improvement, improvedName `Gluten` |
| `spellcategory` | mentor/gear `{spellcategory:{name:'Combat',val:2}}` | `SpellCategory` improvedName `Combat` val 2 |
| `nuyenamt` | In Debt-style `{nuyenamt:-…}`/positive | `Nuyen` val signed |
| `unknown key warns once` | `{bogus:1}` twice | single console.warn, no improvement, no throw |
| `exhaustiveness` | all shipped JSON | zero unknown-key warnings |

### Dependencies

- **#62b** (keys only exist in JSON after conversion — the desktop-XML column above is the authoritative to-do list), #66 (`resolveBonusValue` for `Rating` strings), #64 (matrix test grows with every new produced type — extend `DEFERRED` for types whose consumers live in later epics: `WeaponCategoryDV` → Epic 17, `SpellCategory` → Epic 19, `Nuyen`/`NuyenMaxBP` → BP validation, `SkillsoftAccess`/`Skillwire` → skillsofts follow-up, `LivingPersonaSignal`/`LivingPersonaFirewall`/`LivingPersonaSystem`/`LivingPersonaBiofeedback` → Matrix/persona surface; `LivingPersonaResponse` is consumed in this epic via the `calculateMatrixInitiative` formula fix above, so it does **not** go in `DEFERRED`).

### Size

**L** (mechanical but wide; split into 3–4 PRs along the tiers)

### Risks & edge cases

- `fast-xml-parser`/converter single-vs-array normalization: a lone `<specificskill>` becomes an object, two become an array — `extractBonus` (#62b) must normalize; handlers assume arrays.
- `selectside` cyberware (17 uses) has no gameplay effect beyond labeling — Text improvement + `location` field; don't over-engineer.
- Desktop forces uniqueName on some nodes (`initiativepass`, `matrixinitiativepass`) but not others that share types — copy desktop exactly per node; do not "helpfully" group `initiative`.
- `enabletab` in metatypes uses child `<name>` elements while the current qualities.json stores a flat string — the handler must accept both shapes (string | {name} | array).
- Warn-dedup Set is module state; tests must reset it (`export function __resetWarnings()` guarded for tests, or inject a warner via ctx).
- Handlers must never read the character (pure data → improvements); anything needing character context (desktop's attribute-name substitution) is out of scope per #66.

---

## Issue #69: Remove dead engine/improvements.ts and resolve type collision

**Labels:** `epic:engine2`, `priority:medium`, `cleanup`

### Verified current state

- `src/lib/engine/improvements.ts` is **574** lines (plan said 575). Zero importers of the module itself; its only exposure is the re-export block `engine/index.ts:57–72` (functions `getCyberwareImprovements`, `getQualityImprovements`, `getAdeptPowerImprovements`, `getAllImprovements`, `getTotalImprovement`, `getImprovementsForTarget`, `getImprovementsBySource`, `getStackedValue`, `getImprovementSummary`; types `ImprovementTarget`, `ImprovementSource`, `Improvement`, `ImprovementSummary`).
- Grep across `src/`: no file imports any of those nine functions or `ImprovementTarget`/`ImprovementSummary`. No test file covers it (`engine/__tests__/` contains only `calculations.test.ts`, `improvementManager.test.ts`, `validation.test.ts`).
- The collision: `$engine` exports `Improvement`/`ImprovementSource` (old shapes) while `$types` exports the new ones (`types/index.ts:28` from `types/improvements.ts`). Any file importing the types from `$engine` gets the wrong shape silently — currently none do, but the trap is loaded.

### Design

Delete the file and its re-export block. Nothing replaces it — `engine/improvementManager.ts` + `types/improvements.ts` are the system of record.

### Implementation steps

1. Delete `src/lib/engine/improvements.ts`; remove `engine/index.ts:57–72`. → verify: `npm run check` green (any error = a hidden consumer; investigate before deleting).
2. Grep `getStackedValue|getImprovementSummary|ImprovementTarget|getAllImprovements` across the repo including `.svelte`. → verify: zero hits.
3. Full test suite. → verify: green.

### Test plan

- No new tests. Gate: `npm run check` + `npm run test:unit` + `npm run build` all green; `grep -rn "engine/improvements" src` returns nothing.

### Dependencies

- None. Do it early (it removes review noise for #62–#68 diffs).

### Size

**S**

### Risks & edge cases

- Uncommitted in-flight work (see #99) might have added an import; run the greps on the *current working tree*, not just HEAD.
- If any `.svelte` file imported the old `Improvement` type via `$engine`, svelte-check (not tsc) is the tool that catches it — run `npm run check`, which drives svelte-check.

---

## Issue #70: Wire movement, limits, and defense calculations to improvements

**Labels:** `epic:engine2`, `priority:medium`

### Verified current state

- `calculateWalkSpeed`/`calculateRunSpeed` (`calculations.ts:160–169`): `AGI×2` / `AGI×4` — pure invention; SR4 movement is metatype-based. `Metatype.movement` exists as a display string (`types/character.ts:29`), e.g. Human `"10/25, Swim 5"`, Troll `"15/35, Swim 7"`, Dwarf `"8/20, Swim 4"` (verified in metatypes.json).
- `calculateSprintBonus` (`:172–179`) string-matches metatype names (`elf`, `centaur`).
- Limits (`:186–207`) are **SR5 mechanics** — the comment admits it ("SR4A optional rule / SR5 equivalent"). Desktop SR4 has no physical/mental/social limits and no matching improvement types.
- `calculateDefense` (`:261–263`) = REA + INT; `calculateDodge` (`:266–267`) routes through `calculateDicePool('Dodge','rea')`.
- Desktop movement (verified `clsCharacter.cs:5156–5210`): parse metatype movement string → `walk/run`; `walk += floor(walk × ValueOf(MovementPercent)/100)`; same for run. Swim: base from the `Swim N` segment with `SwimPercent`; Fly: `FlySpeed` improvements add flat speed, `FlyPercent` scales.
- Parser already produces `MovementPercent`, `SwimPercent`, `FlySpeed` (`improvementManager.ts:197–199`); `FlyPercent` is not produced (no data key found in survey — desktop node exists but no SR4 data uses it; skip).
- Data reality check: `movementpercent` appears 3× in qualities.json (e.g. Celerity +50, Satyr Legs) and 6× in desktop XML incl. cyberware; `swimpercent` 1–2×; `flyspeed` 7–8× (Drake/winged qualities and gear).

### Design

1. **Movement parser + calculations:**

```ts
// engine/calculations.ts (or utils/movement.ts if calculations grows past taste)
export interface MovementRates { readonly walk: number; readonly run: number; readonly swim: number; readonly fly: number; }
/** Parse desktop movement string "10/25, Swim 5" (fly variants: "15/45, Fly 90"). */
export function parseMovementString(movement: string): { walk: number; run: number; swim: number; fly: number };

export function calculateMovement(char: Character, metatypeMovement: string): MovementRates {
    const base = parseMovementString(metatypeMovement);
    const movePct = valueOf(char.improvements, 'MovementPercent') / 100;
    const swimPct = valueOf(char.improvements, 'SwimPercent') / 100;
    return {
        walk: base.walk + Math.floor(base.walk * movePct),
        run:  base.run  + Math.floor(base.run  * movePct),
        swim: base.swim + Math.floor(base.swim * swimPct),
        fly:  base.fly  + valueOf(char.improvements, 'FlySpeed')
    };
}
```

   **Signature problem:** `Character` stores only the metatype *name* (`identity.metatype`); the movement string lives in game data. Denormalize at `setMetatype` time — add `readonly movement: string` to `CharacterIdentity` as a **required field with a default** (populated from `metatype.movement`; migration: persistence backfills from gamedata by name, defaulting to the human string when unknown, same pattern as #65 skill meta). Declaring it required from the start (not `movement?:`) avoids `exactOptionalPropertyTypes` churn when #82 reads it for export — #70 owns the field, population, and backfill; #82 only consumes it (I3/DUP3). `calculateMovement(char)` then reads `char.identity.movement || '10/25, Swim 5'` (human fallback).
   `calculateWalkSpeed`/`calculateRunSpeed` become thin wrappers (kept for `CharacterCalculations` compat) delegating to `calculateMovement`.
2. **Sprint bonus:** delete the metatype string matching; SR4 sprinting is +2m/hit universally (SR4A p.149) — metatype does not change the per-hit bonus (the desktop has no `SprintBonus` improvement either; the current elf/centaur special case has no SR4 basis found). `calculateSprintBonus` returns 0 and is removed from the UI, or the function is deleted outright if only `calculateAll` consumes it (grep first).
3. **Limits: leave untouched.** They are a web-only SR5-style display; there are no SR4 improvement types for them. Add a JSDoc note (`/** SR5-style display value — no SR4 improvement wiring by design (see issue #70). */`). Social limit's essence term already updates via `getEssence`.
4. **Defense/dodge:** `calculateDefense` stays REA + INT (SR4 Reaction defense; attribute improvements already flow via `getAttributeTotal`). `calculateDodge` already inherits Dodge-skill improvements from #65 — **no change here** (explicitly, to avoid double-adding).
5. `CharacterCalculations` gains `swimSpeed`/`flySpeed`; `calculateAll` populates from `calculateMovement`.

### Implementation steps

1. `parseMovementString` + unit tests (pure). → verify: table test below.
2. `CharacterIdentity.movement` + `setMetatype` population + persistence backfill. → verify: type check; new save/load test.
3. `calculateMovement` + wrappers + `calculateAll` wiring. → verify: tests below.
4. Remove sprint string matching (delete or zero `calculateSprintBonus` per grep results). → verify: no `includes('elf')` remains in calculations.ts.
5. JSDoc on limits; confirm no limit-improvement expectations leak into tests. → verify: lint + suite green.

### Test plan

| Test | Setup | Expected |
| --- | --- | --- |
| `parseMovementString` | `"10/25, Swim 5"` · `"15/35, Swim 7"` · `"15/45, Fly 90"` · `"Special"` | {10,25,5,0} · {15,35,7,0} · {15,45,0,90} · {0,0,0,0} (warn) |
| `human baseline` | human, no improvements | walk 10, run 25, swim 5 |
| `troll baseline` | troll | walk 15, run 35, swim 7 |
| `dwarf baseline` | dwarf | walk 8, run 20, swim 4 |
| `Celerity +50%` | human + quality `{movementpercent:50}` | walk 10+5=15, run 25+12=37 (floor) |
| `SwimPercent` | human + `{swimpercent:50}` | swim 5+2=7; walk/run unchanged |
| `FlySpeed` | quality `{flyspeed:N}` | fly = base fly + N |
| `metatype switch updates movement` | troll → human via `setMetatype` | identity.movement string switches; rates follow |

### Dependencies

- #63 (`setMetatype` is being touched there — land #63a/#63b first and add the `movement` denormalization on top); #62b only if movement-percent cyberware tests are wanted (quality-based tests suffice); #65 for the dodge path (already covered there).

### Size

**M**

### Risks & edge cases

- Movement strings are not perfectly uniform in metatypes.json (critters/shapeshifters may carry `"Special"` or extra segments) — parser must tolerate and warn, never NaN.
- `calculateAll` consumers (`CharacterSheet.svelte`, `AttributeAllocator.svelte:164+`) currently show AGI-based numbers; the values will visibly change for every character — this is the *correction*, but flag it in the PR description for reviewer expectations.
- Persisted characters without `identity.movement` and with gamedata not yet loaded: fallback human string — same acceptable window as #65/#67 backfills.
- Wrapper removal trap: components may import `calculateWalkSpeed` directly (grep before deleting anything).

---

## Issue #71: Store→calculation integration test suite

**Labels:** `epic:engine2`, `priority:high`, `testing`

### Verified current state

- `engine/__tests__/improvementManager.test.ts` builds `Improvement[]` literals by hand and asserts `valueOf` — it never exercises store mutations. `engine/__tests__/calculations.test.ts` builds `Character` objects directly. `stores/__tests__/` (equipment, magic, character-creation) test store behavior but never assert derived-stat outcomes through `calculateAll`.
- Nothing in the repo proves: store mutation → improvement creation → changed calculation. Every issue above lands a piece of that chain; this suite is the net over the whole epic.
- Test infra: Vitest + jsdom; gamedata is loadable in tests from `static/data/*.json` via `fs` (pattern exists in data-validation scripts) or via fixture subsets — existing store tests mock gamedata minimally.

### Design

- New file: `src/lib/stores/__tests__/golden-characters.test.ts` (it is a store-level integration suite; engine stays unit-tested).
- **Gamedata loading:** load the *real* `static/data/*.json` files once in `beforeAll` (read from disk, set into the gamedata store). Golden tests must run against shipped data, not fixtures — drift between data and expectations is exactly what they exist to catch.
- **Build recipe convention:** each golden is a function of store calls only (no direct `characterStore.set`), with the desktop-verified numbers in a comment block:

```ts
/**
 * GOLDEN: Street Samurai "Blitz" (Human, 400 BP)
 * Recipe: startNewCharacter('bp') → setMetatype(Human) → BOD 4, AGI 4, REA 4, STR 3,
 *   CHA 2, INT 3, LOG 2, WIL 3, EDG 2 → addQuality(Toughness) →
 *   addCyberware(Wired Reflexes, rating 2) → addArmor(Armor Jacket, worn)
 * Desktop verification: <recorded from ChummerGenSR4 build of the same recipe — fill in
 *   actual screenshot values when recording; computed expectations below derive from
 *   verified desktop formulas and data (cyberware.xml, qualities.xml)>
 */
```

- Assert full blocks via `calculateAll(char)` plus targeted helpers, with **exact** numbers (no `toBeGreaterThan`).
- The five goldens (chosen to cover every mechanism this epic ships):

| # | Character | Exercises | Key expected values (SR4-derived) |
| --- | --- | --- | --- |
| 1 | **Street samurai** — Human; BOD 4 AGI 4 REA 4 STR 3 CHA 2 INT 3 LOG 2 WIL 3; Toughness; Wired Reflexes 2; Armor Jacket (8/6) worn | #61 #62 #64 #66 (Rating scaling, precedence1) | Essence **3.0** (WR2 = FixedValues(2,3,5)→3); REA **6**; initiative **9** (6+3); initiative dice **3** (uniqueName `initiativepass`); PhysicalCM **10**; soak ballistic **13** (4+8+1 Toughness) |
| 2 | **Adept** — Human; Adept quality (MAG enabled via addattribute/enableattribute, then raised to base 5 with `setAttribute`); REA 4 INT 3; Improved Reflexes 2 (2.5 PP) | #63 #68 (addattribute), precedence0 | MAG **5** (base 5 only — `addQuality` initializes mag base 1, `character.ts:656–660`; the `enableattribute` improvement carries val 0 per #68/desktop, so it contributes nothing to `getMagicTotal`); REA **6** (precedence0 +2); initiative **9**; dice **3**; powerPointsUsed **2.5** |
| 3 | **Samurai + adept stacking probe** — golden 1's cyberware *plus* Improved Reflexes 2 (illegal build, legal probe) | precedence0 vs precedence1 interplay (#63) | REA bonus **2** (precedence0 overrides the precedence1 sum); dice **3** (max of the `initiativepass` group, never 5) |
| 4 | **Troll bruiser** — Troll; BOD 6 WIL 3; Will to Live 1; Uneducated; Hacking 4 + Pistols 4 | #63 (metatype bonus) #64 (overflow) #67 (cost doubling) #70 (movement) | armor B/I **+1/+1** with no worn armor; reach improvement present (val 1); overflow **7** (6+1); movement walk/run **15/35**; skills BP **48** (4×4×2 + 4×4) |
| 5 | **Technomancer** — Technomancer quality (RES via addattribute); RES 5 WIL 4 INT 4; submerge once (career) → echo with `livingpersona` response bonus | #63 (echo), #68 (livingpersona + matrix formula), SpecialTab | fading resist **9** (5+4); matrix initiative **10** ((4×2)+1+1 — desktop technomancer formula `(INT×2)+1+ValueOf(LivingPersonaResponse)`, `clsCharacter.cs:3823`; requires the `calculateMatrixInitiative` formula fix specced in #68 — the current web `INT+RES` formula would read 9 and be flagged as a defect against the recorded desktop value); `LivingPersonaResponse` improvement val 1; SpecialTab `technomancer` > 0 |

- Each golden also asserts the **removal round-trip** for one of its sources (e.g. golden 1 removes Wired Reflexes → REA 4, dice 1, essence 6, zero Cyberware-sourced improvements) — symmetry is where regressions hide.
- CI: runs with the normal `npm run test:unit`; #104 (CI epic) picks it up automatically — no special wiring here.

### Implementation steps

1. Gamedata-from-disk test bootstrap (`beforeAll` loader util shared with future suites). → verify: a trivial test finds Wired Reflexes in loaded data.
2. Golden 1 + removal round-trip. → verify: passes only after #62c/#66; if written earlier, mark `.todo` with the blocking issue number — never `skip` without a pointer.
3. Goldens 2–3 (needs #63b + #68 addattribute). → verify: exact values.
4. Golden 4 (needs #63b metatype, #64 overflow, #67 costs, #70 movement). → verify.
5. Golden 5 (needs #63b echo path + #68 livingpersona). → verify.
6. Record actual desktop screenshots/values for each recipe into the comment blocks; reconcile any mismatch (mismatch = bug in web or in this spec's arithmetic — investigate, document resolution in the test comment). → verify: comments carry desktop-sourced numbers, deltas explained.

### Test plan

The suite *is* the test plan (values above). Additional meta-assertions:

| Test | Expected |
| --- | --- |
| `no orphaned improvements after full teardown` | after removing every quality/item from golden 1: `char.improvements.length === 0` |
| `improvement sources are id-keyed for equipment` | golden 1: every Cyberware-sourced improvement's sourceName matches an existing equipment id |
| `calculateAll is total` | every `CharacterCalculations` field is a finite number for all five goldens (guards NaN leaks from string bonus values) |

### Dependencies

- Hard: #61, #62 (all parts), #63, #64, #66. Golden 4 additionally needs #67 + #70; golden 5 needs #68 (livingpersona, addattribute). Land the file incrementally with `.todo` markers as issues merge — the suite should exist from the moment #62c lands, not at epic end.

### Size

**M**

### Risks & edge cases

- **The expected values above are computed from desktop formulas + data files, not from a desktop run.** Step 6 (recording real desktop values) is mandatory before the epic closes; treat any delta as a defect until explained (known candidates: #67 knowledge-skill doubling exceeds desktop; #65 defaulting divergence).
- Loading real JSON in vitest ties tests to `static/data` regeneration (#62b) — a converter change that renames a bonus key breaks goldens. That is the point; do not fixture-freeze the data.
- Store singletons leak between tests: every golden must `startNewCharacter()` in `beforeEach` and the suite must not depend on test order.
- jsdom + `console.warn` from the parser (#68 policy): assert zero warnings during golden construction — a warning means shipped data hits an unimplemented key.
- If BP validation blocks a recipe step (e.g. golden 3's illegal combo), build via the same store functions but with generous custom BP (`setCustomBuildPoints(800)`) rather than bypassing the store.

---

<!-- EPIC COMPLETE -->

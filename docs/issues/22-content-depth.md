# Epic: Content Depth (Phase 22)

Issues **#97–#98**. Source epic: [../FEATURE_PARITY_PLAN.md](../FEATURE_PARITY_PLAN.md) (Part III, lines 909–951).

**Not data-only / not parallel-safe** (D2 — the plan's line-115 "parallel-safe … Data-only" label is wrong): #98 depends on **#68** (the `weaponcategorydv` producer handler, M8) and **#80/#81** (XML serialization, M10); #97 depends on **#91** (lifestyle array migration, M11) and **#16**. Epic dependencies: **#16, #80/#81, #91.** Both issues are `priority:low`.

**Implementation order within epic:** #98 first (converter + types + store rework; the improvement handler comes from #68), #97 second (its Advanced-cost work touches `CharacterLifestyle`, which #91 migrates first — do it once the tree is stable). Both should land after #99 (working tree stabilized) and reuse the `createImprovementsFromBonus` wiring proven by the improvement engine epic (#16).

---

## Issue #98: Martial arts techniques and maneuvers

### Verified current state (corrections to the plan)

- **No `convertMartialArts` function exists.** `scripts/convert-xml-to-json.ts:52–53` lists `'martialart'`/`'maneuver'` only in the array-coercion hint list; there is no converter case and `convertMartialArts` is absent from the registry at `:1247`. `static/data/martialarts.json` (43 styles, all `techniques: []`) was produced by hand/elsewhere. The plan's "re-convert" is really "write the converter from scratch."
- **`GameMartialArt` mismatch confirmed, plan has the direction backwards.** `types/equipment.ts:350` declares `{name, cost, source, page}` — the `cost` field is fictional (JSON has no cost) and `techniques` is missing. `gamedata.ts:265` declares `{name, source, page, techniques}` and matches the JSON. Reconcile toward the gamedata shape (drop `cost`), extended with advantages.
- **XML structure** (`F:/Projects/ChummerDesktop/bin/data/martialarts.xml`): `<martialarts>/<martialart>` → `name`, `source`, `page`, `<advantages>/<advantage>` (each `name` + optional `<bonus>`). Separate top-level `<maneuvers>/<maneuver>` (`name`, `source`, `page`), 22 entries. Advantage `<bonus>` children occur in only two shapes: `weaponcategorydv` (25×; `name`+`bonus`) and `specificskill` (3×; `name`+`bonus`).
- **Maneuvers are character-global in desktop, not nested per art** (`clsUnique.cs` MartialArtManeuver 6909–7111; `_objCharacter.MartialArtManeuvers` used in frmCreate 16026). The web currently nests a single `techniques[]` under each art (`CharacterMartialArt`, `equipment.ts:358`). This conflates desktop **advantages** (nested, per style, chosen ≤ rating) with **maneuvers** (flat, character-level). Reconcile: `techniques` → per-art `advantages`; add a character-level maneuver list.
- **Cost model in the plan is right but the current constants are wrong.** Desktop: style BP = `Rating × BPMartialArt` (default **5**, `clsOptions.cs:802`; frmCreate 5332/15320); maneuver BP = `count × BPMartialArtManeuver` (default **2**, `clsOptions.cs:803`; frmCreate 16026). Rating 1–5; a style grants **one advantage per rating point**. Current web uses flat `STYLE:5` + per-technique `TECHNIQUE:2` (`character.ts:2412`, duplicated at `equipment.ts:658`) with no rating — understates multi-rating styles.
- **Two desktop limit rules the plan omits** (`frmCreate.cs`): (1) **Maneuver cap** — total maneuvers across all arts ≤ `Σ(rating × 2)` (`frmCreate.cs:5302–5313`, "2 Maneuvers per Martial Art Rating"). Modelling maneuvers as an uncapped character-global count would allow illegal builds. (2) **Positive-quality-limit tie** — martial-art BP (`Σ rating × 5`) counts toward the **35 BP positive-quality limit** alongside qualities (`frmCreate.cs:5315–5346`), not as an independent bucket. The web currently keeps `buildPointsSpent.martialArts` separate (`character.ts:2446` / `equipment.ts`), so it never trips the 35 BP cap. The advantages ≤ rating cap (`frmCreate.cs:5290–5296`) *is* already captured below.
- **`createImprovementsFromBonus` does not handle `weaponcategorydv` today** (`improvementManager.ts:184–213`; only `specificskill` at :155) — **the handler is owned by #68** (engine epic Tier-1, M8) and will exist before this issue runs; #98 only consumes it (DUP1). `WeaponCategoryDV` type and `MartialArtAdvantage` source already exist (`types/improvements.ts:33,117`).
- Desktop applies advantage bonuses via `MartialArtAdvantage.Create` → `ImprovementManager.CreateImprovements(source=MartialArtAdvantage, id=guid, bonusNode)` (`clsUnique.cs:6782–6790`).

### Design

New JSON shape (`martialarts.json`):

```jsonc
{
  "styles": [{
    "name": "Aikido", "source": "AR", "page": 156,
    "advantages": [
      { "name": "+1 die for Full Dodge" },
      { "name": "+1 DV on Club attacks",
        "bonus": { "weaponcategorydv": [{ "name": "Clubs", "bonus": 1 }] } }
    ]
  }],
  "maneuvers": [{ "name": "Blind Fighting", "source": "AR", "page": 158 }]
}
```

Types — replace both `GameMartialArt` definitions with one shared shape (export from `$types`, re-export in gamedata to kill the duplicate):

```ts
export interface GameMartialArtAdvantage {
	readonly name: string;
	readonly bonus?: MartialArtBonus; // raw bonus obj consumed by createImprovementsFromBonus
}
export interface GameMartialArt {
	readonly name: string;
	readonly source: string;
	readonly page: number;
	readonly advantages: readonly GameMartialArtAdvantage[];
}
export interface GameMartialArtManeuver {
	readonly name: string;
	readonly source: string;
	readonly page: number;
}
export interface CharacterMartialArtAdvantage {
	readonly id: string;        // improvement sourceName
	readonly name: string;
}
export interface CharacterMartialArt {
	readonly id: string;
	readonly name: string;
	readonly rating: number;    // 1–5
	readonly advantages: readonly CharacterMartialArtAdvantage[];
}
// character-level:
export interface CharacterMartialArtManeuver { readonly id: string; readonly name: string; }
```

`MartialArtBonus` = `{ weaponcategorydv?: {name,bonus}[]; specificskill?: {name,bonus,max?}[] }` (subset actually present in the XML — do not over-model).

- **Store placement (resolved by DUP4):** the martial-art store dedup is performed by **#62a/#75** (M8/M9, which run long before this issue) — by M12 the canonical module is the **equipment side** (`stores/equipment/` / `equipment/martialArts.ts`), the `character.ts` copies are already deleted, and all entry points repointed. #98 targets that surviving equipment module; it does **not** re-do the dedup and must not target `character.ts`. #98's remaining type work is reconciling the two `GameMartialArt` *types* (`types/equipment.ts:350` vs `gamedata.ts:265`) and reworking costs. Character-level maneuvers array lives on `Character.equipment.martialArtManeuvers` (new readonly array).
- **`GameData.maneuvers`** derived store + `martialArts` shape update in `gamedata.ts` (loader `:485,527`).
- **Firestore migration:** `martialArts[].techniques: string[]` → `advantages: {id,name}[]` + `rating:1`; add `equipment.martialArtManeuvers: []`. Add it as an **idempotent function in `stores/migrations.ts` chained from `migrateCharacter`** (D6 — the single backfill mechanism, not an ad-hoc loader hook); map legacy `techniques` names to advantages by name; default `rating:1`.

### Implementation steps

1. Add `convertMartialArts()` to the converter (parse styles+advantages+maneuvers, coerce advantage/bonus arrays via `toArray`); register at `:1247`. **Verify:** `npm run convert-data` then `jq '.styles[0].advantages | length, (.maneuvers|length)' static/data/martialarts.json` → non-zero, 22.
2. ~~Add `weaponcategorydv` handler~~ **Deleted (DUP1):** the `weaponcategorydv` handler in `createImprovementsFromBonus` is owned and shipped by **#68** (M8, `improvementManager.ts`) — #98 consumes the existing handler, keeping only its martial-art data/store work. **Verify:** the unit test below passes against the #68 handler.
3. Reconcile `GameMartialArt` types (single source), add advantage/maneuver types, update `gamedata.ts` loader + derived stores. **Verify:** `npm run check` clean.
4. Rework cost: `styleBP = rating × 5`, `maneuverBP = 2` each; replace flat `STYLE/TECHNIQUE` usage. Add `setMartialArtRating`, `addMartialArtAdvantage`/`remove` (append/strip improvements via `createImprovementsFromBonus`/`removeImprovements` with source `MartialArtAdvantage`, sourceName = advantage id), `addManeuver`/`removeManeuver`. Enforce three desktop caps: (a) advantages per art ≤ rating; (b) total maneuvers ≤ `Σ(rating × 2)` across all arts (`frmCreate.cs:5302–5313`); (c) martial-art BP (`Σ rating × 5`) + positive-quality BP ≤ 35 (`frmCreate.cs:5315–5346`) — see "Verified current state". **Return type:** the cap-guarded mutations (`setMartialArtRating`, `addMartialArtAdvantage`, `addManeuver`) must return `{success, error}` (project convention, and required by the cap assertion at Test-plan line "Advantage cap"). This intentionally diverges from the existing **void** martial-art siblings (`addMartialArt` etc.); either migrate the siblings to `{success,error}` too or keep the new ones as the typed outliers — but do not swallow cap failures silently. **Verify:** store tests.
5. UI: rating stepper + advantage picker (≤ rating) in the owned-art panel (`EquipmentSelector.svelte:583–600`) and detail/learn modal (`:1486–1514`); character-level maneuver picker. **Verify:** an advantage with `weaponcategorydv` creates a `WeaponCategoryDV` improvement queryable via `valueOf('WeaponCategoryDV', <category>)`. **Caveat — no sheet effect yet:** `engine/calculations.ts` has **no** weapon/unarmed DV calculation and nothing reads `WeaponCategoryDV` or `UnarmedDV` (only `improvementManager.ts:196` maps `unarmeddv→UnarmedDV`). So the improvement is stored and queryable but is **not** reflected on the sheet. Wiring it into a DV calc requires a new weapon/unarmed-DV helper that is out of scope for this data-depth issue; do **not** assert an on-sheet DV change until that helper exists (track as a follow-up).
6. XML export/import hooks (feeds #80/#81): export `<martialarts>/<martialart>` with `rating`, nested `<martialartadvantages>`, and character `<martialartmaneuvers>` per desktop `Save` (`clsUnique.cs:6546–6560`, 6800–6807); import the inverse. **Verify:** #80/#81 round-trip tests.

### Test plan

- `weaponcategorydv` bonus → `createImprovementsFromBonus('MartialArtAdvantage','adv1',{weaponcategorydv:[{name:'Clubs',bonus:1}]})` yields one `WeaponCategoryDV` improvement, `improvedName:'Clubs'`, `val:1`.
- Cost: add "Aikido" rating 2 → `buildPointsSpent.martialArts` +10; add 3 maneuvers → +6; remove art → refund 10 (advantages carry no extra BP).
- Advantage cap: attempting a 3rd advantage on a rating-2 art returns `{success:false}`.
- Maneuver cap: with one rating-2 art (cap `= 2×2 = 4`), a 5th maneuver returns `{success:false}`; lowering an art's rating below the current maneuver count is likewise rejected/clamped (`frmCreate.cs:5302–5313`).
- Positive-quality limit: martial-art BP (`Σ rating × 5`) plus positive-quality BP must not exceed 35; a rating that would push the combined total past 35 returns `{success:false}` (`frmCreate.cs:5315–5346`).
- Improvement lookup (not a sheet-render test): martial art with "+1 DV on Club attacks" advantage → `valueOf(char.improvements,'WeaponCategoryDV','Clubs')` returns 1. (No DV calc consumes this yet — see step 5 caveat — so there is no sheet assertion to make.)
- Migration: legacy character `{techniques:['X']}` loads as `{rating:1, advantages:[{name:'X'}]}` without loss.

### Dependencies

- **#16 (improvement engine), specifically #68 (hard):** reuse `createImprovementsFromBonus`/`removeImprovements`/`valueOf`. The `weaponcategorydv` handler is **#68's** (DUP1) — #98 must not re-add it.
- **#80/#81 (XML export/import):** step 6 provides the martial-art serialization those issues list as missing (`exporter.ts:324–336`, `importer.ts:190–193`).
- **#99:** land on a green tree.

### Size

**M** — converter + types reconciliation + improvement handler + store rework + migration; UI is moderate; XML defers to #80/#81.

### Risks & edge cases

- The `MARTIAL_ARTS_COSTS`/`addMartialArt` duplication is already resolved by #62a/#75 before this issue runs (DUP4) — rework the surviving `stores/equipment/` module only; if any `character.ts` remnant unexpectedly survives, flag it to #75 rather than patching it here.
- `exactOptionalPropertyTypes`: `bonus?` on advantage must be omitted, not `undefined`, when absent.
- Firestore migration must be idempotent (guard on presence of `rating`).
- Advantage improvements must be stripped on both advantage removal and whole-art removal, else orphaned improvements inflate dice pools.

---

## Issue #97: Lifestyle data expansion

### Verified current state (corrections to the plan)

- **`lifestyles.json` matching desktop is not "8 vs many."** Desktop `lifestyles.xml` `<lifestyles>` also has exactly **8** base lifestyles — identical to the current JSON. "Advanced lifestyles (Bolt Hole/Safehouse types)" are **not extra data rows**; they are `LifestyleType` enum values (`clsEquipment.cs:8834` `ConverToLifestyleType`: Standard/BoltHole/Safehouse/Advanced) plus the **Advanced Lifestyle builder** system, whose data lives in sibling XML sections: `<comforts>`, `<entertainments>`, `<necessities>`, `<neighborhoods>`, `<securities>` (each name→`lp`), plus LP→cost tables `<costs>` and `<safehousecosts>` (each `lp`→`cost`), and `<qualities>`.
- **Plan's improvement claim is wrong.** Lifestyle `<quality>` entries have **no `<bonus>`** — only `name`, `category` (Positive/Negative), `lp`, `allowed` (comma list of applicable types), `source`, `page`. They do **not** create `LifestyleCost`/`BasicLifestyleCost` improvements. `TotalMonthlyCost` (`clsEquipment.cs:9449–9463`) reads those two improvements from the **character's global** improvement set (from other sources), never from lifestyle qualities. Lifestyle qualities change **LP**, and LP maps to base **cost** via the `<costs>`/`<safehousecosts>` table for Advanced/Safehouse builds.
- **Exact desktop monthly-cost formula** (`:9454–9462`): `round( cost × (1 + modifier/100) × (1 + 0.1×roommates) × (percentage/100) )`, where `modifier = ValueOf(LifestyleCost) + [Standard only] ValueOf(BasicLifestyleCost)`. `cost` is the stored `_intCost` (base for Standard; LP-derived for Advanced).
- **Two `GameLifestyle` definitions** — `types/equipment.ts:454` and `gamedata.ts:190`, currently identical `{name,cost,dice,multiplier,source,page}` (same duplication anti-pattern as GameMartialArt). Extend once, share.
- **`CharacterLifestyle`** (`equipment.ts:464`) lacks `type` and `qualities`. **In-flight (#91/#99):** uncommitted work adds a `modules` field to `CharacterLifestyle` (plan line 788, svelte-check error) and #91 proposes changing `equipment.lifestyle` from single object to array. Align field additions with that; do not fight the migration.
- `setLifestyle` (`equipment.ts:1067–1106`) and `calculateEquipmentSpent` (`equipment.ts:70–71`) assume a single `CharacterLifestyle` with a precomputed `monthlyCost`. No LP math exists anywhere.

### Design

Scope decision (priority:low): ship the **data + type + Advanced base-cost computation**; a full comfort/entertainment/necessity/neighborhood/security builder UI is optional and can be a follow-up. Emit the data so the computation is possible.

New JSON shape (`lifestyles.json`) — additive, existing `lifestyles[]` unchanged:

```jsonc
{
  "lifestyles": [ /* unchanged 8 base entries */ ],
  "qualities": [{ "name": "Commercial Zone", "category": "Positive",
                  "lp": 1, "allowed": ["Advanced","BoltHole","Safehouse"],
                  "source": "RC", "page": 161 }],
  "costs":          [{ "lp": 0, "cost": 0 }, { "lp": 1, "cost": 100 } /* … */],
  "safehousecosts": [{ "lp": 0, "cost": 0 }, { "lp": 1, "cost": 75 }  /* … */]
}
```

(Emit `comforts`/`entertainments`/`necessities`/`neighborhoods`/`securities` too only if the builder UI is in scope; otherwise defer — the cost table + qualities suffice for the acceptance criterion.)

Types:

```ts
export type LifestyleType = 'Standard' | 'BoltHole' | 'Safehouse' | 'Advanced';
export interface GameLifestyleQuality {
	readonly name: string;
	readonly category: 'Positive' | 'Negative';
	readonly lp: number;
	readonly allowed: readonly LifestyleType[];
	readonly source: string;
	readonly page: number;
}
export interface CharacterLifestyle {
	// existing: id, name, level, monthlyCost, monthsPrepaid, location, notes
	readonly type: LifestyleType;        // default 'Standard'
	readonly qualities: readonly string[]; // quality names
}
```

New engine helper (`$engine`, keep ≤60 lines / complexity ≤10):

```ts
// Advanced/Safehouse base monthly cost from total LP.
export function lifestyleBaseCostFromLp(lp: number, type: LifestyleType, tables: LifestyleCostTables): number;
// Desktop-faithful monthly cost incl. global improvements.
export function lifestyleMonthlyCost(baseCost: number, type: LifestyleType,
	roommates: number, percentage: number, improvements: readonly Improvement[]): number;
```

`lifestyleMonthlyCost` mirrors `:9454–9462` exactly (LifestyleCost always; BasicLifestyleCost only when `type==='Standard'`; roommate/percentage multipliers; final result rounded **half-to-even** to match `Convert.ToInt32` — **not** `Math.round`; see Risks).

- **Firestore migration (MC1):** #91's single lifestyle migration function in `stores/migrations.ts` (M11, lands first) owns the lifestyle transform — **#97 adds `type:'Standard'` + `qualities:[]` into that SAME idempotent migration function**, not a second hook, so the two never double-transform. Applied per array element (the array shape exists by then). Also reconcile the cost models before landing: #97's LP→cost qualities are authoritative; #91's `modules` (RC flat-cost option) layer on top.

### Implementation steps

1. Extend `convertLifestyles()` (`scripts/convert-xml-to-json.ts:700–738`) to also emit `qualities`, `costs`, `safehousecosts` (parse `allowed` by splitting on `,`). **Verify:** `jq '.qualities|length, (.costs|length)' static/data/lifestyles.json` → >0.
2. Add `LifestyleType`, `GameLifestyleQuality`, cost-table types; extend `GameLifestyle`/`CharacterLifestyle` (single shared `GameLifestyle`). **Verify:** `npm run check` clean.
3. Add `lifestyleBaseCostFromLp` + `lifestyleMonthlyCost` in a new `engine/lifestyle.ts`. **Verify:** unit tests below.
4. Wire `setLifestyle` (`equipment.ts:1067`) to accept `type` + `qualities`; for Advanced/Safehouse compute base from LP table + quality LP, then `monthlyCost = lifestyleMonthlyCost(...)`. Keep Standard path as-is. **Verify:** store test.
5. Add `type`/`qualities` backfill into #91's existing lifestyle migration function in `migrations.ts` (MC1 — same function, not a new hook). **Verify:** legacy-fixture load test; running the migration twice equals running it once.
6. (If in scope) quality multiselect in the lifestyle section of `EquipmentSelector.svelte`, filtered by `allowed` ⊇ selected `type`. **Verify:** manual.

### Test plan

- `lifestyleMonthlyCost(2000,'Standard',0,100,[])` = 2000 (Low, no modifiers).
- With a global `LifestyleCost:-10` improvement: `lifestyleMonthlyCost(2000,'Standard',0,100,[imp])` = 1800.
- Roommates: `lifestyleMonthlyCost(5000,'Standard',2,100,[])` = 6000 (`×1.2`).
- Percentage 50%: `lifestyleMonthlyCost(5000,'Standard',0,50,[])` = 2500.
- LP: Advanced build with total LP 5 → `lifestyleBaseCostFromLp(5,'Advanced',tables)` equals `costs[lp=5].cost`; adding a `lp:1` positive quality raises total LP by 1 → next cost row.
- `BasicLifestyleCost` improvement ignored for non-Standard type.

### Dependencies

- **#91 (lifestyle upkeep / multiple lifestyles) — hard, lands first (M11):** shares `CharacterLifestyle`; #91 changes it to an array and adds `modules`; #97 extends #91's single migration function (MC1). **`lifestyleMonthlyCost` is the canonical monthly-cost computation (I5):** #91 lands `monthlyCost` with a simple `cost + Σ module.cost` version, and #97 replaces that computation — `payLifestyle` calls this helper, and the stored `monthlyCost` field becomes its result.
- **#16:** consumes `LifestyleCost`/`BasicLifestyleCost` improvements via `valueOf`.
- **#99:** stabilize (`modules` type error) first.

### Size

**M** — mostly converter + a small faithful cost engine + type/migration plumbing; UI optional.

### Risks & edge cases

- Rounding: `Convert.ToInt32(double)` (`clsEquipment.cs:9462`) uses **round-half-to-even** (banker's rounding), NOT away-from-zero: `ToInt32(1000.5)=1000`, `ToInt32(2.5)=2`, `ToInt32(0.5)=0`. JS `Math.round` rounds half **up** (`1000.5→1001`) and diverges on the `.5` boundary (reachable via e.g. odd base `cost` × 50% `percentage`). Implement round-half-to-even for the final `lifestyleMonthlyCost` result to match desktop; `Math.round` is wrong here.
- `exactOptionalPropertyTypes`: omit `type`/`qualities` overrides rather than set `undefined`; default `type:'Standard'`.
- Duplicate `GameLifestyle` must be unified or the two will drift once `type`/quality data is added.
- Don't invent per-quality cost improvements — qualities feed LP only; the acceptance test must compute cost through the LP→cost table, not a bonus.
- One lifestyle migration only (MC1): extend #91's function in `migrations.ts` — never register a second lifestyle migration.

<!-- EPIC COMPLETE -->

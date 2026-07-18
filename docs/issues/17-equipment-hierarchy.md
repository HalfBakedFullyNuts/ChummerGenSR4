# Epic: Equipment Hierarchy Completion (Phase 17)

**Issues:** #72–#79 · **Labels:** `epic:equipment2` · **Plan:** [../FEATURE_PARITY_PLAN.md](../FEATURE_PARITY_PLAN.md) (Part III, "Epic: Equipment Hierarchy Completion")

**Milestone:** M9 — every desktop nesting relationship representable and budget-counted.

## Implementation order (differs from issue numbering)

```
#75 (tree helpers + module split + child-removal bug)   ← everything else builds on this
  → #76 (unify gear nesting; migration hook)
  → #77 (capacity parser + cyberware capacity)
  → #72 (weapon accessories/mods)
  → #73 (armor mods/gear — needs parseCapacity from #77)
  → #74a (vehicle mods/gear/mounts — store + data)
  → #74b (vehicle XML round-trip)
  → #78 (recursive cost aggregation — needs the final model)
  → #79 (commlink matrix attributes)
```

#78 contains a small early-landable bug fix (see its "Early fix" note) if budget correctness is needed before the model work completes.

## Shared design decisions (apply to all issues)

1. **Store module split — and deduplication against `stores/character.ts`.** `src/lib/stores/equipment.ts` (1,149 lines today) becomes a directory in #75: `src/lib/stores/equipment/` with `index.ts` re-exporting everything. Existing import paths (`./equipment` from `src/lib/stores/index.ts:245`, `../../stores/equipment` from `EquipmentSelector.svelte:27`) resolve unchanged to `equipment/index.ts`. New modules per issue: `tree.ts` (#75), `gear.ts` (#76), `cyberware.ts` (#75/#77), `weapons.ts` (#72), `armor.ts` (#73), `vehicles.ts` (#74a), `cost.ts` (#78), `matrix.ts` (#79). Each stays under the ESLint function-size/complexity limits.
   **Critical prerequisite:** `stores/character.ts` currently contains a second, fully independent (NOT re-exported) copy of the equipment mutation suite — `setResourcesBP` (:1990), private `calculateEquipmentSpent` (:2015), `addWeapon` (:2040), `removeWeapon` (:2086), `addArmor` (:2109), `addCyberware` (:2169), `removeCyberware` (:2226), `addBioware` (:2257), `addVehicle` (:2341), `removeVehicle` (:2381), `addGear` (:2554), `removeGear` (:2638), `moveGearToContainer` (:2697), `setLifestyle` (:2783) — and that copy, not `stores/equipment.ts`, is what the wizard actually calls: `EquipmentSelector.svelte:2-26` imports the whole suite from `$stores/character`; only `addChildCyberware`/`addWeaponToVehicle` come from `../../stores/equipment` (line 27). `stores/__tests__/equipment.test.ts:10-27` likewise imports nearly everything from `../character` (only `addChildCyberware` from `../equipment`). `stores/index.ts` re-exports the `equipment.ts` versions (:218-245) but never exports `setResourcesBP` at all. Editing only `stores/equipment/` would therefore change modules the wizard never executes. **#75 deletes the `character.ts` equipment block (~:1986-2860) and repoints `EquipmentSelector.svelte` and the equipment tests at the `equipment/` modules before any behavior work in this epic** (see #75 step 2); every later issue assumes `stores/equipment/` is the single implementation.
2. **Mutation result pattern.** All NEW store mutations return the unified `MutationResult = { success: boolean; error?: string; id?: string }` (the `id` carries the new item's id for `add*` mutations — see C6 in `00-consistency-report.md`; the pattern already used by `moveGearToContainer`, `stores/equipment.ts:920-923`). Existing `void` mutations touched by an issue are upgraded to this pattern in that issue.
3. **Resolved-at-purchase costs.** Desktop stores cost *expressions* and evaluates on read; we resolve expressions (`'Weapon Cost'`, `'Rating * 250'`, `'Body * 250'`, `'Total Cost * 2'`, `FixedValues(...)`) **once at purchase time** and store a plain `number` on the character item. Catalog (`Game*`) types keep the raw string. This keeps `Character` JSON-serializable and cost recursion (#78) a plain sum. A shared `resolveCostExpression(raw: string | number, ctx: CostContext): number` lives in `src/lib/engine/costExpressions.ts` (introduced #72, extended #73/#74a). No XPath: the SR4 data uses only the finite expression shapes listed per issue (verified by grepping the catalogs).
4. **Migration.** Character-shape migrations are pure functions in `src/lib/stores/migrations.ts` (introduced in #76), called from `loadSavedCharacter` (`stores/persistence.ts:37-50`, insert at line 42 before `characterStore.set`) and from `loadImportedCharacter` (`persistence.ts:53-58`). Each migration is idempotent (safe to run on already-migrated data) because Firestore documents are only rewritten on the next save.
5. **Data pipeline.** The converter reads from `F:/Projects/ChummerWeb/bin/data` (`scripts/convert-xml-to-json.ts:19`). That directory currently holds only `books.xml`, `metamagic.xml`, `programs.xml`, `ranges.xml`. Issues with data work require copying the corresponding XML from `F:/Projects/ChummerDesktop/bin/data/` into `bin/data/` (existing convention — see untracked `bin/data/*.xml` in git status) and re-running `npm run convert-data`. Note: `vehicles.json`, `bioware.json`, `martialarts.json` exist in `static/data/` but have **no converter function** in the current script (registry at `convert-xml-to-json.ts:1236-1256` lists only Weapons/Armor/Cyberware/Gear + non-equipment) — #74a adds `convertVehicles`.

---

## Issue #72: Weapon accessories and modifications

**Labels:** `epic:equipment2`, `priority:high` · **Size: L**

### Verified current state

- `WeaponAccessory` (`src/lib/types/equipment.ts:86-91`): `{ id, name, mount, cost }`. `WeaponMod` (`types/equipment.ts:94-101`): `{ id, name, slots, damageBonus, apBonus, cost }`. The `damageBonus`/`apBonus` fields match nothing in desktop data (weapon mods there carry `rc`, `conceal`, `ammobonus` — never damage/AP).
- `CharacterWeapon.accessories`/`.modifications` (`types/equipment.ts:80-81`) are always `[]` at runtime: `addWeapon` hardcodes them empty (`stores/equipment.ts:105-106`), the XML importer hardcodes them empty (`src/lib/xml/importer.ts:462-463`), and no store function ever populates them.
- Exporter writes `<accessories />` (`src/lib/xml/exporter.ts:212`) and emits no `<weaponmods>` element at all.
- `calculateEquipmentCost` already loops `weapon.accessories` (`types/equipment.ts:521-526`) — dead code today, but proves no cost plumbing breaks when accessories appear.
- **Data:** `static/data/weapons.json` is `{ categories, weapons }` — no accessory/mod catalog. Desktop `weapons.xml` has `/chummer/accessories` (lines 16561–17288, 243 `<accessory>` entries: `name, mount, rc?, rcgroup?, conceal?, dicepool?, avail, cost, allowgear?, source, page`) and `/chummer/mods` (17289–end, ~486 `<mod>` entries: `name, category, rating, slots, conceal?, ammobonus?, rcbonus?, avail, cost, source, page`). The converter (`scripts/convert-xml-to-json.ts:791-849`) drops both sections. Zero `<bonus>` nodes exist in either catalog (verified by grep) — **accessories/mods carry no improvement data in SR4; the plan's "Smartgun → Smartlink improvement" flows from vision gear via #62, not from the accessory.**
- **Desktop behavior** (`F:/Projects/ChummerDesktop/Chummer/clsEquipment.cs`):
  - `WeaponAccessory` (7208): fields include mount, rc, rcgroup, conceal, dicepool, nested `_lstGear`. `TotalCost` (7808-7828): cost string `"Weapon Cost"` → `parent.Cost × parent.CostMultiplier`, plus attached gear's `TotalCost`.
  - `WeaponMod` (7880): `Slots` (8305). `TotalCost` (8745-8775): `"Total Cost * N"` → `parent.MultipliableCost × N` (MultipliableCost = weapon base + installed non-included mods, 6037-6056); otherwise cost expression with `"Weapon Cost"` and `"Rating"` substitution. Observed cost shapes in the catalog: plain number, `Weapon Cost`, `Rating * N`, `Total Cost * N` (e.g. weapons.xml:17553/17563/17573).
  - `Weapon.SlotsRemaining` (6523-6551): **every weapon has 6 mod slots**; installed, non-included mods consume `Slots`; each underbarrel weapon consumes 3 (underbarrel out of scope here — see Risks).
  - `Weapon.TotalCost` (6061-6112): base (10% off if black-market discount) + non-included mods + non-included accessories + underbarrel.
  - `Weapon.TotalRC` (6255+): weapon `rc` parses as `x`, `(y)`, or `x(y)`; accessory RC adds; with the RestrictRecoil option, accessories with `rcgroup` 1–5 only count the best value per group.
  - Save format (Weapon.Save, ~4389-4444): `<accessories>` containing `<accessory>` elements (shape at 7288-7335: guid, name, mount, rc, rcgroup, conceal, [dicepool], avail, cost, included, installed, [allowgear], source, page, `<gears>` children, notes, discountedcost) and `<weaponmods>` containing `<weaponmod>` elements (Save at 8042).
- Smartgun reference data: "Smartgun System, Internal" accessory — mount ``, avail `6R`, cost `Weapon Cost` (weapons.xml:17002); "Smartgun System, External" — mount `Top/Under`, avail `4R`, cost `400` (17014). Both `allowgear` Peripherals/Vision Enhancements.
- **Per-weapon mount restrictions:** desktop filters the accessory picker by the weapon's own `<accessorymounts>` list — `frmCreate.cs:8633` region reads `accessorymounts/mount` from the weapon node and passes the joined list to `frmSelectWeaponAccessory.AllowedMounts` (`frmSelectWeaponAccessory.cs:15`, :50-58 builds a `contains(mount, …)` XPath filter; accessories with empty `mount` are always allowed). Example: Ares Predator IV offers only `Barrel` and `Top` (weapons.xml:2744-2747), so a `Top/Under` accessory can only go on Top there.

### Design

Replace the two runtime types (safe: arrays are empty in every persisted character, so no migration needed):

```ts
/** types/equipment.ts — replaces lines 85-101 */
export interface WeaponAccessory {
	readonly id: string;
	readonly name: string;
	/** Mount consumed: '', 'Top', 'Under', 'Barrel', 'Side'. Resolved from slash-lists at purchase. */
	readonly mount: string;
	/** Recoil comp as printed: '', '1', '(2)', '1(2)'. */
	readonly rc: string;
	/** RC stacking group 0-5; non-zero groups don't stack with themselves. */
	readonly rcGroup: number;
	readonly conceal: number;
	/** Flat dice-pool bonus (e.g. laser sight). */
	readonly dicePool: number;
	/** Resolved nuyen cost ('Weapon Cost' already substituted). */
	readonly cost: number;
	/** Came bundled with the weapon: free, no mount conflict. */
	readonly included: boolean;
	readonly gear: readonly CharacterGear[];
}

export interface WeaponMod {
	readonly id: string;
	readonly name: string;
	readonly rating: number;
	readonly slots: number;
	readonly conceal: number;
	/** Percentage ammo capacity change (e.g. -25). */
	readonly ammoBonus: number;
	readonly cost: number; // resolved
	readonly included: boolean;
}
```

Catalog types (types/equipment.ts, alongside `GameWeapon`):

```ts
export interface GameWeaponAccessory {
	readonly name: string;
	readonly mount: string;      // may contain '/', e.g. 'Top/Under'
	readonly rc: string;
	readonly rcGroup: number;
	readonly conceal: number;
	readonly dicePool: number;
	readonly avail: string;
	readonly cost: number | string; // number or 'Weapon Cost'
	readonly allowGear: readonly string[];
	readonly source: string;
	readonly page: number;
}

export interface GameWeaponMod {
	readonly name: string;
	readonly rating: number;
	readonly slots: number;
	readonly conceal: number;
	readonly ammoBonus: number;
	readonly avail: string;
	readonly cost: number | string; // number | 'Weapon Cost' | 'Rating * N' | 'Total Cost * N'
	readonly source: string;
	readonly page: number;
}
```

`static/data/weapons.json` becomes `{ categories, weapons, accessories, mods }`; `gamedata.ts` `GameData` gains `weaponAccessories: GameWeaponAccessory[]` and `weaponMods: GameWeaponMod[]`.

Per-weapon mounts (desktop `AllowedMounts` parity): `GameWeapon` gains `readonly accessoryMounts: readonly string[]` (converter emits it from each weapon's `<accessorymounts>/<mount>` list; empty array when absent), and `CharacterWeapon` carries it (`readonly accessoryMounts: readonly string[]`, copied at purchase — persisted characters have no weapons with accessories yet, so migration is just `?? []`).

Cost resolution (`src/lib/engine/costExpressions.ts`, new):

```ts
export interface WeaponCostContext {
	readonly weaponCost: number;
	/** weapon base + already-installed non-included mod costs (desktop MultipliableCost). */
	readonly multipliableCost: number;
	readonly rating: number;
}
export function resolveWeaponCost(raw: number | string, ctx: WeaponCostContext): number;
// 'Weapon Cost' → ctx.weaponCost; 'Rating * N' → ctx.rating * N;
// 'Total Cost * N' → ctx.multipliableCost * N; numeric string/number → as-is.
```

Store functions (`src/lib/stores/equipment/weapons.ts`, new):

```ts
export function addWeaponAccessory(weaponId: string, acc: GameWeaponAccessory, chosenMount?: string): MutationResult;
export function removeWeaponAccessory(weaponId: string, accessoryId: string): MutationResult;
export function addWeaponMod(weaponId: string, mod: GameWeaponMod, rating?: number): MutationResult;
export function removeWeaponMod(weaponId: string, modId: string): MutationResult;
export function addGearToWeaponAccessory(weaponId: string, accessoryId: string, gear: GameGear, quantity?: number): MutationResult;
```

Validation rules:
- `addWeaponAccessory`: if `acc.mount` contains `/`, `chosenMount` must be one of the options (error otherwise); the resolved non-empty mount must be in `weapon.accessoryMounts` (desktop AllowedMounts filter — else `'Weapon has no <mount> mount'`; empty-mount accessories are always allowed); a non-empty mount already occupied by an installed, non-included accessory → `{ success: false, error: 'Mount already occupied' }`. Nuyen check before deduction. The accessory picker modal pre-filters by `weapon.accessoryMounts` (mirror of desktop's picker filtering).
- `addWeaponMod`: `slotsUsed + mod.slots > 6` → error `'Not enough mod slots'` (desktop SlotsRemaining, 6 base).
- `addGearToWeaponAccessory`: gear category must be in `acc.allowGear` when the list is non-empty.
- Removal refunds resolved cost (accessory removal also refunds its nested gear via `gearTotalCost` from #78, or a local recursive sum until #78 lands).

Derived helpers (pure, in `types/equipment.ts` next to the weapon types):

```ts
export function getWeaponSlotsUsed(weapon: CharacterWeapon): number;   // Σ non-included mod slots
export function getWeaponTotalRC(weapon: CharacterWeapon): number;     // numeric total: base x(y)→x+y, + accessory RC, best-per-rcGroup for groups 1-5
export function getWeaponTotalConceal(weapon: CharacterWeapon): number;
export function getWeaponDicePoolBonus(char: Character, weapon: CharacterWeapon): number;
// Σ accessory.dicePool + (weapon has a 'Smartgun System*' accessory or mod
//   ? valueOf(char.improvements, 'Smartlink') : 0)   — Smartlink produced by #62/#65
```

UI (`EquipmentSelector.svelte` weapon detail panel, currently lines 639-691): add "Accessories" and "Mods" sub-lists with remove buttons, plus "Add Accessory" / "Add Mod" buttons that open a new modal type reusing the existing `activeModal`/`attachTarget` machinery (`:44-56`). Mount choice for slash-mounts via a small `<select>` in the modal row.

XML: exporter replaces `<accessories />` (`exporter.ts:212`) with real `<accessories><accessory>…` per desktop Save shape (guid, name, mount, rc, rcgroup, conceal, dicepool?, avail=0 until #80, cost, included, installed, gears, notes) and adds `<weaponmods><weaponmod>…`. Importer parses both inside `parseWeapons` (`importer.ts:439-470`).

### Implementation steps

1. Copy `weapons.xml` from `F:/Projects/ChummerDesktop/bin/data/` to `bin/data/`; extend `convertWeapons` (`scripts/convert-xml-to-json.ts:791-849`) to emit `accessories` and `mods` arrays (mount kept raw with `/`; `allowgear/gearcategory` → `allowGear: string[]`) plus per-weapon `accessoryMounts` from `<accessorymounts>`. → verify: `npm run convert-data`, then `node -e` spot-check that weapons.json has 243 accessories incl. "Smartgun System, Internal" with `cost: "Weapon Cost"`, and Ares Predator IV has `accessoryMounts: ['Barrel','Top']`.
2. Replace `WeaponAccessory`/`WeaponMod` types and add `GameWeaponAccessory`/`GameWeaponMod`; wire into `gamedata.ts` load. → verify: `npm run check` clean.
3. Add `resolveWeaponCost` in `engine/costExpressions.ts` with unit tests for all four shapes. → verify: `npm run test:unit -- costExpressions`.
4. Implement the five store functions in `stores/equipment/weapons.ts` + re-export via `equipment/index.ts` and `stores/index.ts`. → verify: new tests below pass.
5. Add derived helpers (`getWeaponSlotsUsed` etc.) with tests.
6. UI: accessory/mod pickers + lists in the weapon detail panel. → verify: manually add Smartgun External to a Predator in the wizard; remaining nuyen drops by 400.
7. XML export/import of accessories + mods. → verify: round-trip test (export → import → deep-equal on accessory/mod names, mounts, costs).

### Test plan (`src/lib/stores/__tests__/weapon-mods.test.ts`)

- `accessory 'Weapon Cost' resolves against weapon base`: Ares Predator IV (350¥) + Smartgun System, Internal → accessory.cost === 350, nuyen −700 total.
- `fixed-cost accessory`: Predator + Smartgun System, External (400¥, chosenMount 'Top') → nuyen −750, mount === 'Top'.
- `mount conflict rejected`: second Top accessory → `{ success: false }`, nuyen unchanged.
- `mount not on weapon rejected`: Predator (accessoryMounts Barrel/Top only) + an Under-only accessory → `{ success: false, error: 'Weapon has no Under mount' }`; Smartgun External (Top/Under) on Predator with `chosenMount 'Under'` → same error, with `'Top'` → accepted.
- `slash-mount requires choice`: External without `chosenMount` → error.
- `mod slot limit`: three mods of 2 slots each accepted (6/6); a 1-slot mod then rejected with 'Not enough mod slots'.
- `'Total Cost * 2' mod`: weapon 350 + installed 100¥ mod → next mod with cost `Total Cost * 2` resolves to (350+100)×2 = 900.
- `RC grouping`: base rc '0' + Bipod (rc '(2)', rcGroup 1) + second rcGroup-1 accessory rc '(1)' → `getWeaponTotalRC` = 2 (best of group), not 3.
- `removal refunds accessory + its gear`.
- `XML round-trip`: weapon with 2 accessories (one with child gear) + 1 mod survives export→import with identical names/mounts/costs.

### Dependencies

- **#75** — store module split (`equipment/` directory) and `MutationResult` export.
- **#76** — canonical gear `children[]` model used by `WeaponAccessory.gear`.
- **#62/#65 (Engine epic)** — `Smartlink` improvement production/consumption; `getWeaponDicePoolBonus` reads `valueOf(improvements, 'Smartlink')` and returns 0 until that lands.
- **#80/#81 (XML epic)** — real `<avail>` values; this issue writes `avail` as stored (0 until #80 threads avail through the model).

### Risks & edge cases

- **Underbarrel weapons** (desktop: 3 slots each, nested `Weapon` list) are NOT in scope; `getWeaponSlotsUsed` leaves headroom for them. Document in code comment; grenade-launcher underbarrel builds will under-count slots until a follow-up.
- Accessory `rc` strings like `1(2)` must not be `parseInt`-ed naively; the RC parser needs the three desktop shapes.
- `included` accessories from weapon catalog data (per-weapon `<accessories>` blocks inside `/chummer/weapons`) are not auto-attached at purchase in this issue — weapons.json per-weapon accessory lists are not converted. Cosmetic parity gap; note in converter TODO comment (factory-standard gear like the Predator's built-in smartgun won't appear).
- Vintage mod cost-multiplier (`AccessoryCostMultiplier`, desktop 6082-6087) is ignored — the SR4 catalog only uses it for the "Vintage" mod; resolved costs make retrofitting it hard. Accepted loss, documented.
- Duplicate mods of the same name are allowed (desktop allows); only slots constrain.

---

## Issue #73: Armor modifications and armor-mounted gear

**Labels:** `epic:equipment2`, `priority:high` · **Size: M**

### Verified current state

- `CharacterArmor.modifications` (`types/equipment.ts:141`) and `ArmorModification` (`types/equipment.ts:146-152`, `{ id, name, rating, capacity, cost }`) exist but nothing ever populates them: `addArmor` hardcodes `modifications: []` (`stores/equipment.ts:226`), the importer too (`importer.ts:491`). No `addArmorMod` exists anywhere (grep confirms).
- Armor→Gear is not modeled: `CharacterArmor` has no `gear` field.
- `capacity`/`capacityUsed` (`types/equipment.ts:137-138`) are populated from the catalog (`addArmor`, `stores/equipment.ts:222-223`) but never checked or mutated.
- Armor value calc ignores mods: `calculateArmorBallistic`/`calculateArmorImpact` (`src/lib/engine/calculations.ts:271-313`) read only `armor.ballistic`/`armor.impact`.
- Exporter writes `<armormods />` (`exporter.ts:234`); no nested gear.
- **Data:** `static/data/armor.json` is `{ categories, armor }` — no mod catalog. Desktop `armor.xml` `/chummer/mods` (lines 2449–end, 62 entries): `name, category, b, i, maxrating, armorcapacity, avail, cost`. `armorcapacity` shapes: `[2]`, `[Rating]`, `FixedValues([1],[1],[1],[2],[2],[2])`. `cost` shapes: number, `Rating * 250`. 13 mods carry `<bonus>` nodes (Responsive Interface Gear helmets, YNT SoftWeave, Mobility/Strength Upgrade, Feywear skill bonuses) — verified by grep; **Nonconductivity has NO bonus node** (b/i-neutral, situational rule).
- **Desktop behavior** (`clsEquipment.cs`):
  - `Armor.TotalBallistic` (1652-1673) = base B + Σ equipped mods' `b` − damage; `TotalImpact` (1678-1695) analogous.
  - `Armor.TotalCost` (1700-1719) = own + Σ mod `TotalCost` + Σ gear `TotalCost`.
  - `ArmorMod.TotalCost` (852-884): `Armor Cost` / `Rating` expression substitution, ceil-rounded.
  - `Armor.CalculatedCapacity` (1889-1921): **both armor-capacity rules are optional and default OFF in desktop.** With `ArmorSuitCapacity` on, catalog `armorcapacity` is used; with `MaximumArmorModifications` on and no catalog capacity, capacity = max(6, ceil(1.5 × max(B, I))).
  - `Armor.CapacityRemaining` (1926-1999): suit mode deducts bracketed mod/gear `armorcapacity`; max-mods mode deducts `rating` (or 1 if unrated).
  - Gear consumes armor capacity via its own `<armorcapacity>` (e.g. gear.xml CMT Clip: `armorcapacity [2]`, gear.xml:588).

### Design

Type changes (`types/equipment.ts`):

```ts
/** replaces lines 145-152 */
export interface ArmorModification {
	readonly id: string;
	readonly name: string;
	readonly rating: number;
	readonly ballisticBonus: number;  // desktop <b>
	readonly impactBonus: number;     // desktop <i>
	/** Armor capacity consumed (resolved from '[2]' / '[Rating]' / FixedValues at purchase). */
	readonly capacityCost: number;
	readonly cost: number;            // resolved
	readonly equipped: boolean;
}

/** CharacterArmor gains: */
readonly gear: readonly CharacterGear[];
```

Migration (added to `migrations.ts` from #76): `armor.gear ?? []`. `modifications` entries are impossible in existing saves (no producer), so no field mapping needed. Idempotent.

Catalog type + data:

```ts
export interface GameArmorMod {
	readonly name: string;
	readonly category: string;
	readonly ballistic: number;
	readonly impact: number;
	readonly maxRating: number;
	readonly capacity: string;        // raw notation: '[2]', '[Rating]', 'FixedValues(...)'
	readonly avail: string;
	readonly cost: number | string;   // number | 'Rating * N'
	readonly bonus?: unknown;         // raw bonus JSON for the 13 bonus-carrying mods
	readonly source: string;
	readonly page: number;
}
```

`armor.json` becomes `{ categories, armor, mods }`; `GameData` gains `armorMods`.

Capacity rule (**product decision — see epic openQuestions; recommended default below**): desktop defaults both capacity rules OFF, but the plan requires enforcement. Recommended: enforce **suit capacity when the armor's catalog `capacity > 0`** (deduct resolved bracketed `capacityCost`), otherwise the SR4 RAW mod limit **capacity = ballistic + impact**, each mod consuming `max(rating, 1)`:

```ts
// types/equipment.ts
export function getArmorCapacityTotal(armor: CharacterArmor): number;   // capacity > 0 ? capacity : ballistic + impact
export function getArmorCapacityUsed(armor: CharacterArmor): number;    // Σ mod capacityCost + Σ gear armor-capacity costs
```

`capacityUsed` stops being independent state — keep the stored field for Firestore compatibility but recompute via the helper and write through on mutation.

Store (`src/lib/stores/equipment/armor.ts`):

```ts
export function addArmorMod(armorId: string, mod: GameArmorMod, rating?: number): MutationResult;
export function removeArmorMod(armorId: string, modId: string): MutationResult;
export function addGearToArmor(armorId: string, gear: GameGear, quantity?: number): MutationResult;
export function removeGearFromArmor(armorId: string, gearId: string): MutationResult;
```

- `capacityCost` resolved via `parseCapacity` (#77); `FixedValues([1],...)` indexes by rating.
- Cost resolved via `resolveCostExpression` (#72's module, `Rating` context).
- `rating > mod.maxRating` → error. Over capacity → error `'Not enough armor capacity'`.
- Gear-in-armor needs `GameGear.armorCapacityCost` (converter: carry `<armorcapacity>` from gear.xml — new optional field).

Calculations (`engine/calculations.ts:271-313`): per-armor value becomes `armor.ballistic + Σ equipped mods' ballisticBonus` (ditto impact) *before* the layering max/half logic. Extract a local `effectiveBallistic(armor)` helper to stay within complexity limits. **This helper must preserve #64's `valueOf(char.improvements, 'BallisticArmor')`/`'ImpactArmor'` improvement term (added in M8) rather than replace the function body — #73's mod bonuses layer on top of #64's improvement reads (C3). Regenerate #71 soak goldens after this lands.**

Improvements: for the 13 bonus-carrying mods, call `createImprovementsFromBonus('ArmorMod', mod.name, bonusData, rating)` (`engine/improvementManager.ts:102`) on add, `removeImprovements` on remove (mirrors #62's pattern; gate on #62's equipment-source wiring if not yet landed).

XML: exporter replaces `<armormods />` (`exporter.ts:234`) with `<armormods><armormod>` elements (desktop ArmorMod.Save shape: guid, name, category, armor `b`, armorcapacity, maxrating, rating, avail, cost, bonus?, source, page, included, equipped, extra, notes) and adds `<gears>` under `<armor>`; importer parses both in `parseArmor` (`importer.ts:475-498`).

### Implementation steps

1. Copy `armor.xml` + `gear.xml` into `bin/data/`; extend `convertArmor` to emit `mods` (raw `capacity` string + `bonus` passthrough) and `convertGear` to emit `armorCapacityCost`. → verify: armor.json has 62 mods; Fire Resistance has `capacity: 'FixedValues([1],[1],[1],[2],[2],[2])'`, `cost: 'Rating * 100'`.
2. Type changes + migration entry. → verify: `npm run check`; migration unit test (armor without `gear` field loads with `[]`).
3. Store functions with capacity/cost resolution. → verify: tests below.
4. Armor calculations include equipped-mod bonuses. → verify: calculations test.
5. Improvements wiring for bonus-carrying mods. → verify: adding YNT SoftWeave creates an improvement; removal cleans up.
6. UI: mods + gear lists in the armor detail panel (`EquipmentSelector.svelte:692-721`), pickers via the existing modal machinery.
7. XML round-trip. → verify: exporter/importer tests.

### Test plan (`src/lib/stores/__tests__/armor-mods.test.ts`)

- `rating-cost mod`: Armor Jacket (8/6, 900¥) + Fire Resistance rating 4 → cost 400 (4×100), capacityCost 2 (FixedValues index 4), nuyen −1,300.
- `b/i bonus`: Armor Jacket + Gel Packs (b1/i1, 1,500¥, [1]) equipped → `calculateArmorBallistic` = 9, impact = 7.
- `capacity rejection (RAW mode)`: Armor Jacket capacity total = 14 (8+6); mods totaling 14 accepted, next rejected. Document in the test comment that 14 is our SR4-RAW `B + I` default and **deliberately diverges from desktop**, which either enforces nothing (both rules OFF by default) or, with `MaximumArmorModifications` on, computes `max(6, ceil(1.5 × max(B, I)))` = 12 for the Armor Jacket (`clsEquipment.cs:1889-1921`) — see Risks.
- `suit capacity mode`: armor with catalog capacity 8 → only bracketed costs count; exceeding 8 rejected.
- `maxrating enforced`: Fire Resistance rating 7 → error (maxrating 6).
- `gear in armor`: CMT Clip commlink (300¥, armorcapacity [2]) into armor → capacity used +2, nuyen −300; remove refunds.
- `unequipped mod adds no B/I` but still consumes capacity and cost.
- `XML round-trip` with 2 mods + 1 gear.

### Dependencies

- **#77** — `parseCapacity` (implementation order puts #77 first).
- **#76** — `CharacterGear` tree model + `migrations.ts`.
- **#72** — `resolveCostExpression` module.
- **#62 (Engine epic)** — equipment-source improvement lifecycle for the 13 bonus-carrying mods.

### Risks & edge cases

- The capacity-rule default diverges from desktop's out-of-box behavior (both rules OFF there) — and the recommended `B + I` fallback formula ALSO differs from desktop's `MaximumArmorModifications` formula (`max(6, ceil(1.5 × max(B, I)))`, `clsEquipment.cs:1889-1921`): Armor Jacket = 14 ours vs 12 desktop's. A third behavior matching neither desktop mode is a deliberate product choice (epic open question); keep the helper pure so a future settings toggle can switch modes, and flag the divergence in the test comments so #71 golden-character parity runs don't treat it as a regression.
- `convertArmor` coerces `armorcapacity` with `Number(a['armorcapacity'] ?? 0)` (`convert-xml-to-json.ts:897`) — base armors use plain numbers so this is safe; only the new mods array carries notation strings.
- Damaged-armor (`_intBDamage`) and career-mode selling are out of scope.
- The layering rule in `calculateArmorBallistic` (`calculations.ts:280-287`) is itself a simplification vs SR4 encumbrance — do not touch beyond injecting mod bonuses (Engine epic #66 owns encumbrance).

---

## Issue #74: Vehicle modifications, vehicle gear, and XML round-trip

**Labels:** `epic:equipment2`, `priority:high` · Split into **#74a (model/store/data — Size L)** and **#74b (XML — Size M)**. Keep both under issue #74 on the tracker; land as two PRs.

### Verified current state

- `VehicleMod` (`types/equipment.ts:337-343`): `{ id, name, rating, slots, cost }` — no add function anywhere; `removeVehicle` refunds mod costs that can never exist (`stores/equipment.ts:562-565`).
- `CharacterVehicle.gear` (`types/equipment.ts:332`) is type-only; initialized `[]` (`stores/equipment.ts:537`), never written.
- `addWeaponToVehicle` (`stores/equipment.ts:581-622`) attaches weapons directly to `vehicle.weapons` — **and deducts nuyen even when `vehicleId` matches nothing** (the `map` at 613-615 no-ops but `nuyen: char.nuyen - weapon.cost` at 617 runs unconditionally). Same defect family as #75's `addChildCyberware`.
- Vehicles are dropped on XML export — `<vehicles />` hardcoded (`exporter.ts:336`) — and never imported (`importer.ts:191`).
- `stores/gamedata.ts:247` re-declares `GameVehicle`, duplicating `types/equipment.ts:279-293` — consolidate while touching this area.
- **Data:** `static/data/vehicles.json` (`{ categories, vehicles }`, entries carry `seats` which the `GameVehicle` type lacks) came from an older script — the current converter has **no `convertVehicles`** (registry `convert-xml-to-json.ts:1236-1256`). Desktop `vehicles.xml`: `/chummer/limits` (31-44), `/chummer/mods` (12113–end, ~321 entries: `name, category, rating, slots, limit?, avail, cost, source, page`; cost shapes: number, `Rating * N`, `Body * 250`, `Vehicle Cost`, `Speed`/`Accel` substitutions), and per-vehicle stock `<mods>`/`<gears>`/`<weapons>` name lists (e.g. GM-Nissan Doberman, vehicles.xml:4115-4129: body 3, 3,000¥, stock mods "Walker Mode" + "Weapon Mount (Normal, External, Turret, Remote)").
- **Desktop behavior** (`clsEquipment.cs`):
  - `Vehicle.Slots` (15313-15323) = `max(TotalBody, 4) + addslots`. `SlotsUsed` (15598-15612) = Σ installed, non-included mods' `CalculatedSlots` (slots string with `Rating` substitution, 14286).
  - `VehicleMod` holds `Weapons` and `Cyberware` lists; `TotalCost` (~14202) substitutes `Rating`, `Vehicle Cost`, `Body` (2 when body missing), `Speed`, `Accel(Running)`, `Accel`.
  - **Weapons mount on mods, not the vehicle**: `Vehicle.Create` attaches data weapons to the first free mod whose name starts with `"Weapon Mount"` (region 14545-14571); if none free, it uses the first mount found "and lets the player deal with it".
  - `Vehicle.TotalCost` (15617-15656) = own + non-included mods' TotalCost + weapons/cyberware of included mods + vehicle gear.
  - Weapon-mount catalog example: "Weapon Mount (Normal, External, Fixed, Manual)" — 2 slots, 1,500¥, avail 8F.
  - `Vehicle.Save` (14638-14704): `guid, name, category, handling, accel, speed, pilot, body, armor, sensor, devicerating, avail, cost, addslots, source, page, physicalcmfilled, vehiclename, homenode, <mods>, <gears>, <weapons>, notes, discountedcost, [locations]`.
  - `VehicleMod.Save` (13469-13508): `guid, name, category, limit, slots, rating, maxrating, response, system, firewall, signal, pilot, avail, cost, extra, source, page, included, installed, subsystems, <weapons>, [<cyberwares>], [bonus], notes, discountedcost`.

### Design (#74a — model, store, data)

```ts
/** replaces types/equipment.ts:336-343 */
export interface VehicleMod {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly rating: number;
	readonly slots: number;          // resolved ('Rating' substituted)
	readonly cost: number;           // resolved
	/** Part of the stock configuration: costs nothing, consumes no slots. */
	readonly included: boolean;
	readonly weapons: readonly CharacterWeapon[];
	readonly notes: string;
}

export interface GameVehicleMod {
	readonly name: string;
	readonly category: string;
	readonly rating: number;
	readonly slots: number | string;   // 'Rating' possible
	readonly limit: string;            // e.g. 'Groundcraft Only' — informational for now
	readonly avail: string;
	readonly cost: number | string;
	readonly source: string;
	readonly page: number;
}
```

`CharacterVehicle` (`types/equipment.ts:318-334`): **remove the `weapons` field** — weapons live only under mods (desktop parity, single cost path). Migration (`migrations.ts`): legacy `vehicle.weapons` entries move into a synthesized mod `{ name: 'Weapon Mount (Imported)', category: 'Standard', rating: 0, slots: 0, cost: 0, included: true, weapons: [...], notes: '' }`. Idempotent (field absent after first run). `gear` stays and becomes live. Desktop's mod-hosted `Cyberware` (Mechanical Arm plugins) is **out of scope** — documented in a code comment; nothing in the wizard can produce it.

Store (`src/lib/stores/equipment/vehicles.ts` — also move the existing vehicle functions here from `stores/equipment.ts:517-650`):

```ts
export function addVehicleMod(vehicleId: string, mod: GameVehicleMod, rating?: number): MutationResult;
export function removeVehicleMod(vehicleId: string, modId: string): MutationResult;   // refunds mod + its weapons
export function addGearToVehicle(vehicleId: string, gear: GameGear, quantity?: number): MutationResult;
export function removeGearFromVehicle(vehicleId: string, gearId: string): MutationResult;
export function addWeaponToVehicleMount(vehicleId: string, modId: string, weapon: GameWeapon): MutationResult;
export function removeWeaponFromVehicleMount(vehicleId: string, modId: string, weaponId: string): MutationResult;
```

- Slot validation: `Σ non-included installed mod slots + new > max(body, 4)` → error `'Not enough slots'` (`addslots` not modeled yet — no converter source; noted in code).
- Cost resolution: extend `CostContext` with `{ vehicleCost, body, speed }`; `Body` substitutes 2 when `body === 0`.
- `addWeaponToVehicleMount` requires `mod.name.startsWith('Weapon Mount')` and `mod.weapons.length === 0`, else `'Not a weapon mount'` / `'Mount occupied'`. The old `addWeaponToVehicle` is **deleted**; `EquipmentSelector.svelte:837-844` ("Mount Weapon") becomes a per-mount button in the vehicle detail panel. Fix the unconditional-nuyen-deduction defect as part of the rewrite (validate target exists before building `updated`).
- `removeVehicle` refund becomes recursive: vehicle + non-included mods + their weapons (incl. #72 accessories) + gear.

Data: add `convertVehicles` (current vehicle fields + `deviceRating`, plus `mods` catalog and `limits`) and register it in the converter list. **`seats` is dropped:** desktop `vehicles.xml` contains no `<seats>` element anywhere (the only "seats" matches are the "Ejection Seats" mod name — verified by grep; `<devicerating>` does exist, 485 occurrences). The `seats` strings in the current `static/data/vehicles.json` came from an older pipeline and have no source in this converter. `GameVehicle` in `types/equipment.ts` (:279-293, which already has no `seats`) gains `deviceRating: number`; delete the duplicate `GameVehicle` in `stores/gamedata.ts:247` (which declares `seats: string`) and import from `$types`. The only `seats` consumer is the browse page (`routes/browse/+page.svelte:713-714`, already guarded by `{#if vehicle.seats}`) — remove that display block when the field goes.

UI: vehicle detail panel (`EquipmentSelector.svelte:795-852`) gains: mods list with "3/4 slots" indicator, Add Mod button (new modal over `gameData.vehicleMods`), gear list + Add Gear (reuse gear modal + `attachTarget`), per-mount weapon rows with Mount Weapon buttons.

### Design (#74b — XML round-trip)

Exporter: replace `<vehicles />` (`exporter.ts:336`) with a `<vehicles>` section mirroring desktop `Vehicle.Save` element-for-element (unmodeled values: `devicerating` from catalog or 0, `addslots` 0, `physicalcmfilled` 0, `vehiclename` '', `homenode` False). Mods per `VehicleMod.Save` (unmodeled: `limit` '', `maxrating` '0', response/system/firewall/signal/pilot 0, `subsystems` '', `installed` True). Extract `exportWeapon(lines, weapon, indent)` from the inline block at `exporter.ts:186-217` so top-level and mount weapons share one writer (including #72 accessories/mods). Vehicle gear reuses `exportGear` (`exporter.ts:408-433`).

Importer: `parseVehicles(data.vehicles)` replaces the hardcode at `importer.ts:191`; parses `mods/mod` (with nested `weapons/weapon`), `gears/gear` via existing `parseGear`, and maps vehicle-level `<weapons>` through the same legacy rule (synthesized included 'Weapon Mount (Imported)') so desktop files load faithfully.

### Implementation steps

1. (#74a) Copy `vehicles.xml` to `bin/data/`; write `convertVehicles` emitting `{ categories, limits, vehicles, mods }`; align `GameVehicle`. → verify: vehicles.json has ~321 mods; "Weapon Mount (Normal, External, Fixed, Manual)" = slots 2, cost 1500.
2. Type changes + legacy-weapons migration. → verify: migration unit test.
3. Store functions + recursive `removeVehicle` refund + delete `addWeaponToVehicle`. → verify: tests below; `npm run check` surfaces all stale imports (`stores/index.ts:235`, `EquipmentSelector.svelte:27`).
4. UI mount/mod/gear flows. → verify: manual — buy Doberman (3,000¥, body 3 → 4 slots), add Fixed Manual mount (2 slots, 1,500¥), mount a weapon; budget = 3,000 + 1,500 + weapon.
5. (#74b) `exportWeapon` extraction + vehicle export. → verify: existing exporter tests pass; new vehicle export test.
6. `parseVehicles` import. → verify: round-trip test.

### Test plan (`vehicle-mods.test.ts`; round-trip in `src/lib/xml/__tests__/`)

- `slots`: Doberman (body 3) → 4 slots; 2-slot mount ok; adding a 3-slot mod after → rejected (5 > 4).
- `Body-cost mod`: cost `Body * 250` on Doberman → 750¥.
- `mount rules`: mount on non-mount mod → error; occupied mount → error.
- `no free-money defect`: add to nonexistent vehicleId → `{ success: false }`, nuyen unchanged (regression for `stores/equipment.ts:617`).
- `recursive refund`: Doberman 3,000 + mount 1,500 + mounted Vehicle-Weapons-category gun → `removeVehicle` refunds all three.
- `round-trip` (plan acceptance criterion): rigger drone with mount + mounted weapon (one accessory) + Vehicle Sensor gear survives export → import with identical names/costs/nesting.
- `legacy import`: XML with vehicle-level `<weapons>` yields the synthesized included mount.

### Dependencies

- **#75** — module split, `MutationResult`.
- **#72** — weapon accessory shape inside mounts; `resolveCostExpression`; shared `exportWeapon`.
- **#76** — gear tree for vehicle gear.
- **#78** — consumes the final vehicle shape.
- **#80/#81 (XML epic)** — avail preservation, `<locations>`.

### Risks & edge cases

- Stock (included) mods from per-vehicle catalog lists (Doberman's turret) are not auto-created at purchase in #74a — a stock Doberman has no mount until one is bought. Parity gap; converter support for per-vehicle `<mods>` lists is a flagged follow-up.
- Micro drones with `body 0` → slot base `max(0,4) = 4`; the desktop `Body→2` fallback applies only inside cost expressions.
- `limit` strings are stored, not enforced (needs a category→craft-type mapping that doesn't exist).
- Stat-altering mods (armor, handling, sensor upgrades) do not yet change displayed vehicle stats — only cost/slots/nesting are in scope here.

---

## Issue #75: Deep nesting recursion + fix child-cyberware removal defect

**Labels:** `epic:equipment2`, `priority:high`, `bug` · **Size: M** · **First issue in the epic's implementation order.**

### Verified current state

- `addChildCyberware` (`stores/equipment.ts:346-403`) maps only over top-level cyberware (`char.equipment.cyberware.map(c => c.id === parentId ? …)`, lines 390-392) — grandchildren unreachable. **Worse: essence and nuyen are deducted even when `parentId` matches nothing** (the spread at 386-402 always runs) — installing into a child via the UI silently burns money and essence with no item added.
- `removeChildCyberware` (`stores/equipment.ts:406-435`) likewise only finds children of top-level parents.
- `addGearToGear` (`stores/equipment.ts:995-1032`) and `removeGearFromGear` (`:1035-1060`) have the identical one-level + unconditional-deduction problems.
- UI defect: the cyberware detail panel's remove button calls top-level `removeCyberware(cyber.id)` for ANY selected node — the comment at `EquipmentSelector.svelte:756-758` admits it ("We'd need to properly handle removing child vs parent"). Selecting a child (rendered recursively by `EquipmentNode.svelte:38-42`) and clicking Remove silently does nothing. The "Install Plugin/Mod" button (`EquipmentSelector.svelte:744-751`) passes any selected node (including children) as `attachTarget`, and the modal dispatches `addChildCyberware(attachTarget.id, …)` (`:1335-1339`) — triggering the money-burning path for grandchild installs.
- `removeCyberware` (`stores/equipment.ts:321-343`) refunds only the node's own `essence`/`cost` — a parent removed with children refunds neither the children's essence nor cost (children were paid for and deducted essence individually at add time).
- `sumEssenceRecursive`/`calculateEssenceCost` already exist (`types/equipment.ts:569-583`) for the recursive essence sum.
- `src/lib/components/ui/NestedItemList.svelte` is dead code (zero importers — verified by grep); `EquipmentNode.svelte` is the live recursive renderer.
- **Duplicate mutation suite in `stores/character.ts`** (see shared decision 1): the wizard's live add/remove path for weapons/armor/cyberware/bioware/vehicles/gear/lifestyle is the independent copy inside `character.ts` (:1986-2860), imported by `EquipmentSelector.svelte:2-26` and by `stores/__tests__/equipment.test.ts:10-26`. `stores/equipment.ts` is only live for `addChildCyberware`/`addWeaponToVehicle` (via `EquipmentSelector.svelte:27`) and the `stores/index.ts` re-exports. The two copies have drifted (e.g. `character.ts:1996` uses the tiered `bpToNuyen` from `$types` while `equipment.ts:36-38` shadows it with a dead linear copy).

### Design

**Module split (epic-wide prep, done here):** convert `stores/equipment.ts` into `stores/equipment/` — `index.ts` re-exports everything so `./equipment` and `../../stores/equipment` imports keep working; move existing code unchanged into `resources.ts` (setResourcesBP/calculateEquipmentSpent), `weapons.ts`, `armor.ts`, `cyberware.ts`, `vehicles.ts`, `gear.ts`, `lifestyle.ts`, `martialArts.ts`, `foci.ts`, `derived.ts` (the three derived stores). Pure file moves; no behavior change; existing tests must pass unmodified. (Note: that check is weak on its own — the current tests mostly exercise the `character.ts` duplicates, not `stores/equipment.ts`; the dedup step below is what makes the suite meaningful.)

**Deduplication (epic-wide prep, done here — see shared decision 1):** delete the duplicate equipment mutation block in `stores/character.ts` (~:1986-2860) and repoint its consumers at the `equipment/` modules: `EquipmentSelector.svelte:2-27` (import the suite from `$stores` or `../../stores/equipment` instead of `$stores/character`) and `stores/__tests__/equipment.test.ts:10-27`. Before deleting, diff each `character.ts` function against its `equipment.ts` counterpart and keep the **character.ts behavior** wherever they drifted — it is what users currently see (known drift: `character.ts` `setResourcesBP` uses the tiered `bpToNuyen` from `$types`; `equipment.ts:36-38` has a dead linear shadow copy, which is deleted here). Add `setResourcesBP` to the `stores/index.ts` re-export block (it is currently not exported from `index.ts` at all). `npm run check` surfaces every stale import.

**Tree helpers** (`src/lib/stores/equipment/tree.ts`, new — pure, generic over anything with `id` + `children`):

```ts
export interface MutationResult {
	readonly success: boolean;
	readonly error?: string;
	/** New item's id for `add*` mutations (unified per C6 in 00-consistency-report.md). */
	readonly id?: string;
}

interface TreeNode<T> {
	readonly id: string;
	readonly children: readonly T[];
}

/** Depth-first find anywhere in the forest. */
export function findInTree<T extends TreeNode<T>>(items: readonly T[], id: string): T | null;

/** Immutably rebuild the path to `id`, applying `update` to the matched node. Returns null if not found. */
export function updateInTree<T extends TreeNode<T>>(
	items: readonly T[],
	id: string,
	update: (node: T) => T
): readonly T[] | null;

/** Remove the node with `id` at any depth. */
export function removeFromTree<T extends TreeNode<T>>(
	items: readonly T[],
	id: string
): { readonly items: readonly T[]; readonly removed: T | null };

/** The node plus all descendants, flattened. */
export function flattenTree<T extends TreeNode<T>>(items: readonly T[]): readonly T[];
```

Works for `CharacterCyberware` (children at `types/equipment.ts:220`) and `CharacterGear` (`:426`). Recursion depth is bounded by real data (cyberarm → cyberhand → plugin ≈ 3); ESLint `max-depth: 3` is about lexical block nesting, so implement with recursion, not nested loops.

**Reworked mutations** (`equipment/cyberware.ts`, `equipment/gear.ts`) — all now `MutationResult`, all validate the target exists BEFORE any deduction:

```ts
export function addChildCyberware(parentId: string, cyber: GameCyberware, grade?: CyberwareGrade): MutationResult;
// (#77 later appends a rating?: number parameter)
// findInTree(equipment.cyberware, parentId) — null → { success:false, error:'Parent cyberware not found' }
// then updateInTree to append; essence/nuyen deducted only on success.

export function removeCyberware(cyberId: string): MutationResult;
// Unified top-level + child removal: removeFromTree; refund = node cost + Σ descendant costs,
// essence refund = calculateEssenceCost([removed]) (node + descendants).
// removeChildCyberware(parentId, childId) kept as a thin deprecated wrapper calling removeCyberware(childId).

export function addGearToGear(parentId: string, gear: GameGear, quantity?: number): MutationResult; // any-depth via updateInTree
export function removeGearFromGear(childId: string): MutationResult;                                 // any-depth via removeFromTree; refunds subtree cost·qty
```

Note: `removeGearFromGear`'s signature drops the now-redundant `parentId` (tree search finds it); update the one call path (the `stores/index.ts:231` re-export, no current UI caller passes it — verified by grep).

**UI fixes** (`EquipmentSelector.svelte`):
- Remove button (`:752-763`): call the unified `removeCyberware(cyber.id)` and surface `result.error` (reuse the existing over-budget banner styling for a transient error line); delete the stale comment.
- Child-install already flows through `addChildCyberware(attachTarget.id, …)` (`:1335-1339`) — now correct at any depth.

**Improvement cleanup:** removal collects `flattenTree([removed]).map(n => n.id)` and calls `removeImprovements(char.improvements, source, id)` (`engine/improvementManager.ts:75`) for each — a no-op until #62 makes equipment create improvements, but the hook lands here so #62 doesn't have to re-open removal code. Coordinate the `sourceName`/id convention with #62 (recommend: improvement `sourceName` = character item `id`, not display name).

### Implementation steps

1. Directory split with pure moves + `index.ts`. → verify: `npm run check` and `npm run test:unit` pass with zero source-file edits outside `stores/equipment*` and import lines.
2. Deduplicate: delete whatever equipment mutations #62a left behind in `character.ts` (weapons/vehicles/resources/`moveGearToContainer`/lifestyle — #62a already owns and removes cyberware/bioware/gear/armor, so do **not** assume the full ~:1986-2860 block is still present; see C1 in `00-consistency-report.md`) and perform the directory split, reconciling any remaining drift in favor of `character.ts` behavior. Repoint `EquipmentSelector.svelte:2-27` and `stores/__tests__/equipment.test.ts:10-27`, export `setResourcesBP` from `stores/index.ts`. → verify: `npm run check` clean; full test suite passes and now exercises `stores/equipment/`; manual smoke — buy/remove a weapon in the wizard, budget updates.
3. `tree.ts` helpers + unit tests (3-level synthetic trees, immutability assertions: untouched branches keep referential identity). → verify: `npm run test:unit -- tree`.
4. Rework the four mutations + unified `removeCyberware`; fix validate-before-deduct. → verify: tests below.
5. UI remove/install fixes. → verify: manual — build cyberarm → cyberhand → plugin chain in the wizard; remove the middle node; essence and nuyen restore exactly.
6. Improvement-cleanup hook. → verify: unit test with a synthetic improvement whose sourceName is the removed child's id.

### Test plan (extend `src/lib/stores/__tests__/equipment.test.ts`)

- `3-level add`: Cyberarm (top) → add child at depth 1 → add grandchild via depth-1 child's id → grandchild present, essence = Σ all three (pre-#77 semantics), nuyen decremented three times.
- `grandchild removal`: remove the depth-2 node → only it disappears; its essence + cost refunded.
- `mid-tree removal refunds subtree`: remove depth-1 node → it and grandchild gone; refund = both costs, essence = both essences.
- `invalid parent burns nothing` (regression for `stores/equipment.ts:386-402`): `addChildCyberware('no-such-id', …)` → `{ success: false }`, essence and nuyen unchanged.
- `gear grandchild add/remove` mirror tests.
- `immutability`: after a depth-2 update, the sibling top-level cyberware object is reference-equal to before.

### Dependencies

None (first in order). Coordinates with **#62 (Engine epic)** on the improvement `sourceName` convention.

### Risks & edge cases

- Unifying `removeCyberware` changes refund behavior for parents-with-children (previously under-refunded). This is a bug fix, but any test asserting the old partial refund must be updated deliberately, not silenced.
- `removeChildCyberware` is exported from `stores/index.ts:225` — keep the deprecated wrapper one release to avoid breaking `$stores` consumers (note: `character.ts` does NOT re-export it or anything else from `equipment.ts` — the only consumers are the `stores/index.ts` re-export and direct `../equipment` imports), then fold into a cleanup.
- Cycle safety: `updateInTree` assumes acyclic data; `moveGearToContainer` (#76) is the only operation that could create a cycle and it guards there.
- Delete `NestedItemList.svelte`? No — out of scope (pre-existing dead code, per project rules only mention it): flagged for a cleanup task.

---

## Issue #76: Unify the two gear nesting models

**Labels:** `epic:equipment2`, `priority:medium`, `refactor` · **Size: M**

### Verified current state

Two coexisting nesting mechanisms on `CharacterGear` (`types/equipment.ts:406-427`):

1. **Flat container model** — `containerId` (:422), `containedItems` (:424), with capacity enforcement in `addGear` (`stores/equipment.ts:800-805`) and `moveGearToContainer` (`:920-992`). Contained items stay in the top-level `equipment.gear` array, so `EquipmentSelector.svelte`'s `ownedGear` list (`:567-577`) renders them as unrelated top-level rows.
2. **Tree model** — `children[]` (:426), used by `addGearToGear` (`stores/equipment.ts:995-1032`, **no capacity check**), by XML export (`exporter.ts:421-429`) and import (`importer.ts:572-575`), and by the recursive renderer `EquipmentNode.svelte:38-42`.

They don't interoperate: the importer hardcodes `capacity: 0, capacityUsed: 0, capacityCost: 0, containerId: null, containedItems: []` (`importer.ts:587-591`); `removeGear` (`stores/equipment.ts:867-917`) recursively removes/refunds via `containerId` but ignores `children[]` (a tree child's cost is silently lost on parent removal).

Additional finding: the container path is dead in practice — `GameGear.capacity`/`capacityCost`/`isContainer` (`types/equipment.ts:400-402`) are **never emitted by the converter** (`convertGear`, `scripts/convert-xml-to-json.ts:1092-1100` outputs only name/category/rating/avail/cost/source/page), so every purchased gear has `capacity 0` and `addGear`'s container branch can't trigger with catalog data. Desktop gear capacity notation lives in gear.xml `<capacity>` (`1`, `Rating * 0.5`, `[x]`, `x/[y]` — samples at gear.xml:1233+); desktop `Gear.CapacityRemaining` (`clsEquipment.cs:11748+`) deducts children's bracketed capacity.

### Design

**Canonical model: the `children[]` tree** (matches desktop + XML). Delete `containerId` and `containedItems` from `CharacterGear`; keep `capacity` (own container space), `capacityUsed` (recomputed convenience), `capacityCost` (space consumed in a parent).

```ts
/** types/equipment.ts — CharacterGear after this issue */
export interface CharacterGear {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly rating: number;
	readonly quantity: number;
	readonly cost: number;
	readonly location: string;
	readonly notes: string;
	readonly capacity: number;      // container space this gear offers
	readonly capacityUsed: number;  // Σ children capacityCost (maintained on mutation)
	readonly capacityCost: number;  // space consumed when nested in a parent
	readonly children: readonly CharacterGear[];
}
```

Store (`stores/equipment/gear.ts`):
- `addGear(gear, quantity?, parentId?)` — `parentId` replaces `containerId`; delegates to `addGearToGear` when set. Top-level same-name stacking (current `stores/equipment.ts:807-816`) becomes restricted to top-level, unrated, childless items. **This is a deliberate tightening, not unchanged behavior:** the current merge condition is name + `containerId === null` only (`stores/equipment.ts:809`) — today a rating-1 and a rating-3 item of the same name merge into one stack (a latent bug). Test the new restriction explicitly (see Test plan).
- `addGearToGear` (from #75, any-depth) gains the capacity check: `canFitInContainer(parent, child)` (`types/equipment.ts:440-444` — keep, works on the tree) → error `'Not enough capacity'`; on success also bump parent's `capacityUsed`.
- `moveGearToContainer(gearId, newParentId | null)` reimplemented on the tree: `removeFromTree` → cycle guard (`flattenTree([moved])` must not contain `newParentId`) → capacity check → insert. Signature and `MutationResult` unchanged.
- `removeGear(gearId)` — tree removal at any depth; refund = Σ subtree `cost × quantity` (this fixes the lost-children-refund bug).

**Migration** (`src/lib/stores/migrations.ts`, new — this issue creates the module and the `loadSavedCharacter`/`loadImportedCharacter` call sites, `persistence.ts:42/:54`):

```ts
export function migrateCharacter(raw: Character): Character; // chains all migrations
function migrateGearContainers(equipment: CharacterEquipment): CharacterEquipment;
// For each gear with legacy containerId: splice it into the container's children[],
// set nothing else (capacityCost already stored); recompute each container's capacityUsed
// from children; strip containerId/containedItems from all nodes. Orphaned containerId
// (container missing) → keep at top level. Idempotent: no containerId ⇒ no-op.
```

`migrateCharacter` accepts the legacy shape via a local `LegacyCharacterGear` type (with optional `containerId`/`containedItems`) — do not weaken the public `CharacterGear` type.

**Data:** extend `convertGear` to emit capacity from gear.xml `<capacity>`: plain number → `capacity`; `[x]` → `capacityCost: x`; `x/[y]` → both; `Rating * k` → resolved per rating at purchase (keep raw string in a `capacityFormula` field; resolution reuses `parseCapacity` from #77 — if #77 hasn't landed, emit only numeric cases and file the formula cases with #77).

**UI:** the flat-list rendering bug disappears automatically (children render nested via `EquipmentNode`); `ownedGear` (top-level array) now contains only roots. Add an "Add Gear Inside" button to the gear detail panel (`EquipmentSelector.svelte:853-886`) using `attachTarget` + `addGearToGear` — this closes the "no UI to add child gear" gap from the plan's Part I table.

### Implementation steps

1. `migrations.ts` + `migrateGearContainers` + wiring into `persistence.ts`. → verify: unit test with a fixture character using containerId nesting → loads as tree, capacityUsed correct.
2. Remove `containerId`/`containedItems` from the type; rewrite `addGear`/`removeGear`/`moveGearToContainer` on the tree; capacity check in `addGearToGear`. → verify: `npm run check`; rewrite the container tests in `stores/__tests__/equipment.test.ts` (they currently assert flat-model behavior).
3. Importer: populate `capacity`/`capacityCost` on parsed gear instead of hardcoded zeros (`importer.ts:587-591` — from catalog lookup by name where available, else 0). → verify: importer test.
4. Converter capacity emission. → verify: gear.json spot-check (an item with `[2]` capacity).
5. UI child-gear flow. → verify: manual — nest a Spare Clip inside a container gear; renders indented; budget correct.

### Test plan

- `capacity enforced on tree`: container capacity 5; child capacityCost 3 ok; second child capacityCost 3 → `{ success:false, error:'Not enough capacity' }`.
- `rated gear no longer stacks` (regression for the stacking tightening): add same-name gear at rating 1, then rating 3 → two separate items, not one merged stack; same-name unrated childless gear still merges (quantity bumps).
- `move with cycle guard`: A→B nested; `moveGearToContainer(A, B.id)` (into own descendant) → error 'Cannot move container into itself/descendant'.
- `move updates capacityUsed on both ends`.
- `remove refunds subtree` (regression): parent (100¥) + child (50¥, qty 2) → removeGear(parent) refunds 200.
- `migration`: legacy flat character {backpack, containerId-linked medkit} → tree with medkit in backpack.children, no containerId fields, second run is a no-op.
- `XML round-trip preserves capacity`: export → import keeps children AND capacityCost (extend `exportGear`/`parseGear` with a `<capacitycost>`? No — desktop stores capacity notation in `<capacity>`; write the resolved capacityCost as bracketed `<capacity>[2]</capacity>` for children, plain for containers, matching desktop conventions).

### Dependencies

- **#75** — tree helpers, module split, any-depth `addGearToGear`/`removeGear`.
- **#77** — `parseCapacity` for formula-based capacity emission (partial data work can precede it).

### Cross-issue note

`WeaponAccessory.gear` (#72), `CharacterArmor.gear` (#73), `CharacterVehicle.gear` (#74a) all reuse this canonical tree; they must NOT re-introduce parallel container bookkeeping.

### Risks & edge cases

- Same-name stacking (`addGear` merge, `stores/equipment.ts:807-816`) must never merge items with children or nonzero capacityUsed — merging would orphan children.
- Firestore documents keep legacy fields until next save; any code reading `containerId` after this issue is a bug — grep for both field names post-change (`Grep containerId src/` must return only migrations.ts).
- `quantity > 1` on containers is ambiguous (5 backpacks, one child?) — reject nesting into gear with `quantity > 1` (error `'Split the stack first'`); desktop sidesteps this by unit quantities on containers.

---

## Issue #77: Capacity enforcement for cyberware and armor containers

**Labels:** `epic:equipment2`, `priority:medium` · **Size: M** (armor half lives in #73; this issue owns the parser + cyberware)

### Verified current state

- `CharacterCyberware.capacity`/`capacityUsed` (`types/equipment.ts:217-218`) exist but `addCyberware`/`addChildCyberware` always write `capacity: 0, capacityUsed: 0` (`stores/equipment.ts:296-297, 379-380`) — the catalog value never reaches the character.
- `addChildCyberware` charges full essence for children (`stores/equipment.ts:364-369`) — the comment at :363 and :368 admits capacity is unhandled.
- `GameCyberware.capacity` is a string (`types/equipment.ts:198`); the converter preserves notation via `parseOrString` (`convert-xml-to-json.ts:1005`). Catalog shapes (verified in cyberware.xml): `[2]`, `[Rating]`, `Rating * 4`, `(Rating * 0.1)…` (ess only), `FixedValues(...)`, dual `x/[y]`, `[*]`. Example rows: Vision Enhancement — `ess 0.1`, `capacity [Rating]`, `cost Rating * 1500` (cyberware.xml:635-644); Cyberears — `rating 4`, `ess (Rating * 0.1) + 0.1`, `capacity Rating * 4`, `cost FixedValues(500,750,1000,1500)` (:656-662).
- Parent subsystem restriction exists in data (`<subsystems><subsystem>Earware</subsystem>…`, cyberware.xml:663-665) and is enforced by desktop's picker; the converter drops it.
- **No rating selection exists anywhere:** neither `addCyberware` nor `addChildCyberware` accepts a rating — both hardcode `rating: cyber.rating || 1` (`stores/equipment.ts:296, 376`), and the catalog `rating` field is the item's MAXIMUM rating (4 for Cyberears), not a chosen one. The install modals have no rating picker. Any `[Rating]`/`Rating * k` resolution needs a rating source that does not exist yet — this issue adds it (see Design).
- **The converter flattens rating formulas, so the JSON cannot produce per-rating values today** (verified against `static/data/cyberware.json`): Cyberears has `ess: 0.1` (the desktop `(Rating * 0.1) + 0.1` formula is lost — ess 0.3 at rating 2 is unreachable) and `cost: 500` alongside a `costByRating: [500, 750, 1000, 1500]` array; Vision Enhancement has `cost: 1500` (the `Rating * 1500` formula is dropped entirely, no `costByRating`). And `GameCyberware` (`types/equipment.ts:194-206`) declares `ess: number` / `cost: number` with no `costByRating`/formula fields, so even the extra JSON data is invisible under strict TS. This issue extends the converter output and the type (see Design) — without that, the pinned test values below are unreachable.
- **Desktop behavior:**
  - `Cyberware.CalculatedCapacity` (`clsEquipment.cs:3524-3617`): evaluates notation; bracketed = consumes parent capacity; dual `x/[y]` = offers x, consumes y.
  - `Cyberware.CapacityRemaining` (:4006-4053): own capacity − Σ children's bracketed capacity; a node whose own capacity is purely bracketed offers 0.
  - **Child cyberware costs ZERO essence in desktop**: `Character.Essence` (`clsCharacter.cs:3549-3589`) iterates only the top-level `_lstCyberware`; plugins are added exclusively to `parent.Children` (`frmCreate.cs:17995`, `:20260`) and never to the character list. Capacity is the accounting mechanism for children, full stop.
  - Child cost still counts (parent `TotalCost` includes children, `clsEquipment.cs:3793-3818`; `[*]`-capacity children excluded, child cost `*N` multiplies parent base).

### Design

**Capacity parser** (`src/lib/engine/capacity.ts`, new — shared with #73/#76):

```ts
export interface ParsedCapacity {
	/** Container space this item offers. */
	readonly holds: number;
	/** Space consumed inside a parent container. */
	readonly consumes: number;
}
export function parseCapacity(raw: string | number, rating: number): ParsedCapacity;
// number | 'n'            → { holds: n, consumes: 0 }
// '[n]' | '[Rating]'      → { holds: 0, consumes: n }
// 'Rating * k'            → { holds: rating * k, consumes: 0 }
// 'FixedValues([a],[b]..)'→ consumes = value at index rating-1 (bracket style preserved)
// 'x/[y]'                 → { holds: x, consumes: y }   (both sides may use Rating)
// '[*]' | '' | '*'        → { holds: 0, consumes: 0 }
```

Arithmetic support limited to `Rating` substitution + `* / + -` on two operands — the catalog uses nothing richer (audit step 1 confirms; no XPath).

**Rating + formula plumbing** (prerequisite for everything below — see Verified current state):

- `GameCyberware` gains `readonly essFormula?: string`, `readonly costFormula?: string`, `readonly costByRating?: readonly number[]`, `readonly subsystems?: readonly string[]`. Converter: when `<ess>`/`<cost>` are non-numeric, emit the raw string into the `*Formula` field (keep the existing flattened numeric fallback for compatibility); keep emitting `costByRating` for `FixedValues(...)` costs (already produced for Cyberears).
- `addCyberware(cyber, grade?, rating?)` and `addChildCyberware(parentId, cyber, grade?, rating?)` gain a `rating` parameter (default 1, clamped to `minRating..maxRating`). Ess/cost resolve **once at purchase** (shared decision 3): `costByRating[rating - 1]` when present, else `costFormula`/`essFormula` with `Rating` substituted (reuse the two-operand evaluator from `parseCapacity`), else the flat numbers. Grade multipliers apply after.
- UI: both cyberware install modals gain a rating `<select>` (`minRating..maxRating`) shown when `maxRating > 1`, live-updating the displayed ess/cost.

**Cyberware changes** (`stores/equipment/cyberware.ts`):

- `CharacterCyberware` gains `readonly capacityCost: number` (migration: default 0 — added to `migrateCharacter`).
- `addCyberware` (top-level): store `capacity: parseCapacity(gameCyber.capacity, rating).holds`, `capacityCost: 0`; essence path unchanged (apart from formula resolution above).
- `addChildCyberware`: let `parsed = parseCapacity(child.capacity, rating)` (rating = the new parameter), `parentHolds = parent.capacity`.
  - If `parentHolds > 0`: require `parsed.consumes > 0` (else error `'Item cannot be installed in this parent'` — matches desktop picker filtering); require `parent.capacityUsed + parsed.consumes <= parentHolds` (else `'Not enough capacity'`); **essence charge = 0** (desktop parity); nuyen still charged; write child `capacityCost = parsed.consumes`, bump parent `capacityUsed`.
  - If `parentHolds === 0`: keep current essence-charging behavior (covers legacy/odd parents).
- `removeCyberware` (unified from #75): refund essence only for nodes with `capacityCost === 0`; decrement parent `capacityUsed` when removing a capacity child.
- Subsystem restriction: `GameCyberware` gains `readonly subsystems?: readonly string[]`; converter carries `<subsystems>`; `addChildCyberware` rejects children whose `category` is not in a non-empty parent `subsystems` list (`'Parent does not accept <category> subsystems'`). UI: the child-install modal (`EquipmentSelector.svelte:1301-1350`) pre-filters `filteredCyberware` by the attach target's subsystems.

**UI:** cyberware detail panel shows `capacityUsed / capacity` for containers; the install button's `disabled={$currentEssence < adjustedEss}` check (`EquipmentSelector.svelte:1333`) becomes capacity-aware (no essence gate for capacity children).

### Implementation steps

1. Audit distinct `<capacity>` strings: `grep -o '<capacity>[^<]*</capacity>' bin/data/cyberware.xml | sort -u` — confirm the parser grammar covers every shape; paste the audit into the PR description. → verify: audit list ⊆ grammar.
2. `parseCapacity` + exhaustive unit tests (one per shape, incl. `FixedValues` bracket indexing and `x/[y]` with Rating on both sides).
3. Converter: emit `subsystems` and the raw `essFormula`/`costFormula` strings for non-numeric `<ess>`/`<cost>` (keep flattened numeric fallbacks + `costByRating`); keep capacity raw string (already does via `parseOrString`). → verify: cyberware.json Cyberears has `subsystems: ['Earware','Nanocybernetics']` and `essFormula: '(Rating * 0.1) + 0.1'`; Vision Enhancement has `costFormula: 'Rating * 1500'`.
4. Types (`GameCyberware` formula/`costByRating`/`subsystems` fields; `CharacterCyberware.capacityCost`) + migration (`capacityCost` default 0). → verify: migration test; `npm run check`.
5. Store changes (rating parameter on `addCyberware`/`addChildCyberware`, purchase-time ess/cost formula resolution, capacity/essence accounting, removal symmetric). → verify: tests below.
6. UI: rating `<select>` in both install modals, capacity display, filtered child picker. → verify: manual — Cyberears at rating 2 shows ess 0.30 / cost 750 and "0/8"; installing a [2] child shows "2/8" and essence untouched.

### Test plan (SR4 numbers, extend `equipment.test.ts`)

- `capacity child costs no essence`: Cyberears rating 2 (ess 0.3, capacity `Rating * 4` → 8, cost 750) at 6.00 ESS → 5.70; add child with capacity `[2]` and ess 0.2 → **essence stays 5.70**, parent capacityUsed 2, child capacityCost 2, nuyen down by child cost.
- `over-capacity rejected`: children totaling consumes 8 accepted; next `[1]` child → `{ success:false, error:'Not enough capacity' }`, nothing deducted.
- `[Rating] resolution`: Vision Enhancement rating 3 → consumes 3, cost 4,500 (Rating × 1500).
- `plain-capacity child into container rejected`: child with capacity `4` (holds-type) into a capacity parent → 'Item cannot be installed in this parent'.
- `subsystem filter`: Eyeware child into Cyberears (subsystems Earware/Nanocybernetics) → rejected.
- `removal symmetry`: remove the [2] child → parent capacityUsed back to 0, essence unchanged (was never charged), cost refunded.
- `grade multiplier on capacity child cost`: Alphaware [2] child → cost ×2, essence still 0.
- `dual capacity 'x/[y]'`: synthetic item holds x for its own children while consuming y in its parent.

### Dependencies

- **#75** — any-depth tree mutations (capacity math must work at depth ≥ 2: cyberhand inside cyberarm has its own holds/consumes).
- **#73** consumes `parseCapacity` for armor.
- **#62 (Engine epic)** — unrelated to capacity but shares `addCyberware` edit surface; land sequentially to avoid conflicts.

### Risks & edge cases

- Desktop charges zero essence for **all** children (even into `parentHolds === 0` parents) because `Character.Essence` never sees children. We deliberately keep essence-charging for zero-capacity parents (web's historical behavior; prevents a free-essence exploit through parents that desktop's picker would never allow). Divergence documented in code.
- The desktop cyber/bioware "full + half of lower" essence rule (`clsCharacter.cs:3571-3574`) is NOT implemented web-side (both charge full) — pre-existing gap, out of scope, flagged for the Engine epic's derived-stat work (#66/#71 golden characters will surface it).
- Essence-hole / grade-upgrade flows don't exist yet; nothing here blocks them.
- Rounding: essence math stays `number`; SR4 uses 2-decimal essence — existing `.toFixed(2)` display only. Do not introduce rounding in storage.

---

## Issue #78: Recursive cost aggregation

**Labels:** `epic:equipment2`, `priority:high`, `bug` · **Size: M**

### Verified current state

- `calculateEquipmentSpent` sums only top-level weapons, armor, cyberware, gear (×qty), lifestyle. Missing entirely: **bioware, vehicles, foci**, cyberware children, gear children, and (once #72-#74 land) accessories/mods/mounted weapons. It exists twice (shared decision 1): the **live** copy is the private function in `stores/character.ts:2015-2035`, feeding the live budget via `character.ts`'s `setResourcesBP` (:1990-2010, the one `EquipmentSelector.svelte:7` imports); `stores/equipment.ts:63-75` is the identically-partial module copy that becomes the single implementation after #75's dedup. Both have the same missing collections.
- **Concrete money-printing bug today:** buy a vehicle (nuyen deducted by the live `addVehicle`, `character.ts:2341` / module copy `stores/equipment.ts:547`), then change Resources → `setResourcesBP` recomputes `nuyen = newStarting − calculateEquipmentSpent(char)` (`character.ts:2005`) which ignores vehicles — the vehicle becomes free. Same for bioware and foci.
- **Second budget bug — karma builds only (the linear BP conversion is dead code):** `stores/equipment.ts:36-38` holds a linear `bpToNuyen(bp) = bp * 5000`, but that module's `setResourcesBP` is unreachable today — `stores/index.ts` never exports it, and the only UI consumer (`EquipmentSelector.svelte:7`) imports `setResourcesBP` from `$stores/character`, whose live implementation (`character.ts:1990-2010`) already calls the **tiered** `bpToNuyen` from `$types` (`BP_TO_NUYEN_RATES`, `types/equipment.ts:617-625`: 5→20,000; 10→50,000; 20→90,000; 30→150,000; 40→225,000; 50→275,000). So a 5 BP build already grants the correct 20,000¥ that the wizard's +/- buttons (`EquipmentSelector.svelte:184-212`) and footer (`:397`) promise; the linear shadow copy is deleted by #75's dedup. The **live** bug is the karma path: for karma builds `resourcesBP` holds karma and the correct rate is 2,500¥/karma (`KARMA_BUILD_COSTS.NUYEN_PER_KARMA`, `stores/character.ts:107`), but the live `setResourcesBP` applies the BP tier table unconditionally — 10 karma grants 50,000¥ instead of 25,000¥.
- `calculateEquipmentCost` (`types/equipment.ts:518-566`) is a second, differently-partial implementation (has accessories/armor-mods/vehicle-mods/bioware/foci loops but no children, no vehicle weapons/gear, no armor gear, no weapon mods).
- Per-node `cost` is always the resolved purchase price (grade multipliers applied at purchase: `stores/equipment.ts:283, 365, 454`), so recursion is a plain sum — no re-derivation needed. Desktop cross-check: `Weapon.TotalCost` (`clsEquipment.cs:6061-6112`), `Armor.TotalCost` (:1700-1719), `Cyberware.TotalCost` (:3744-3856), `Gear.TotalCost` (:11515-11605, ×qty), `Vehicle.TotalCost` (:15617-15656) — all "own + children", matching a stored-resolved-cost sum.

### Early fix (landable before the model issues)

Steps 1-2 below (karma-rate fix + adding bioware/vehicles/foci/children to the sum against the CURRENT model) fix real budget bugs and need nothing from #72-#77 — but they DO need #75's dedup (shared decision 1), or they must be applied to the **live** copies in `stores/character.ts` (`setResourcesBP` :1990, `calculateEquipmentSpent` :2015): patching only `stores/equipment.ts` fixes code the wizard never calls. If the epic stalls, ship them alone against whichever copy is live at that point.

### Design

One family of pure per-item helpers + one aggregator, in `types/equipment.ts` (replacing `calculateEquipmentCost`'s body; it stays the single source of truth):

```ts
export function gearTotalCost(g: CharacterGear): number;
// g.cost * g.quantity + Σ children gearTotalCost

export function weaponTotalCost(w: CharacterWeapon): number;
// w.cost + Σ non-included accessories (acc.cost + Σ acc.gear gearTotalCost)
//        + Σ non-included mods' cost

export function armorTotalCost(a: CharacterArmor): number;
// a.cost + Σ mods' cost + Σ gear gearTotalCost

export function cyberwareTotalCost(c: CharacterCyberware): number;
// c.cost + Σ children cyberwareTotalCost   (grade already baked into each node's cost)

export function vehicleTotalCost(v: CharacterVehicle): number;
// v.cost + Σ non-included mods (mod.cost + Σ mod.weapons weaponTotalCost)
//        + Σ included mods' weapons weaponTotalCost      (desktop 15641-15646)
//        + Σ gear gearTotalCost

export function calculateEquipmentCost(equipment: CharacterEquipment): number;
// Σ all of the above over the five collections + Σ bioware cost + Σ foci cost
// + lifestyle monthlyCost × monthsPrepaid   (martial arts are BP, excluded — existing comment :562)
```

`calculateEquipmentSpent(char)` (`stores/equipment/resources.ts`) becomes `return calculateEquipmentCost(char.equipment);` — delete its private loop. Each helper is ≤10 lines; the aggregator stays under the 60-line ESLint cap.

`setResourcesBP` fix:

```ts
function resourcesToNuyen(amount: number, buildMethod: BuildMethod): number {
	return buildMethod === 'karma'
		? amount * KARMA_BUILD_COSTS.NUYEN_PER_KARMA  // 2,500
		: bpToNuyen(amount);                          // tiered table, types/equipment.ts:628-637
}
```

(The tiered `bpToNuyen` already exists at `types/equipment.ts:628-637` and the live `setResourcesBP` already uses it for BP builds — this fix adds the missing karma branch. The dead linear shadow at `stores/equipment.ts:36-38` is deleted in #75's dedup.)

**No-double-count invariant:** every purchasable node deducts nuyen exactly once at purchase and appears exactly once in the recursion (children live ONLY under their parent after #76; vehicle weapons ONLY under mods after #74a). Property test: after any sequence of adds, `startingNuyen − calculateEquipmentSpent(char) === char.nuyen`.

### Implementation steps

1. Fix `resourcesToNuyen` (tiered BP / 2,500-per-karma) in `setResourcesBP`. → verify: test — karma build 10 → 25,000¥ (the actual fix: live code grants 50,000¥ today); BP build 5 BP → 20,000¥ (regression guard — the live path already passes this; it only fails if the dead linear copy in `stores/equipment.ts:36-38` accidentally becomes live during #75's split).
2. Add bioware/vehicles/foci + existing children to the spent sum (pre-model early fix). → verify: vehicle-then-resources-change regression test below.
3. After #72-#77/#74a land: implement the five helpers + aggregator; delegate `calculateEquipmentSpent`. → verify: whole suite; grep confirms no other cost loops remain (`Grep "for (const weapon of" src/lib` finds only the helpers).
4. Add the budget-invariant property test (a scripted build touching every collection).
5. Wire the same helpers into any UI cost badges that currently do `cost * quantity` locally (`EquipmentSelector.svelte:873-876`, `EquipmentNode.svelte:33`). → verify: visual check of nested totals.

### Test plan (`src/lib/types/__tests__/equipment-cost.test.ts` + store regression tests)

- `vehicle no longer free` (regression for the partial spent-sum, live at `character.ts:2015-2035` / module copy `stores/equipment.ts:63-75`): resources 10 BP (50,000¥) → buy Doberman 3,000 → `setResourcesBP(20)` → remaining = 90,000 − 3,000, not 90,000.
- `tier/karma fix`: karma 10 → 25,000 (the fix); 5 BP → 20,000 and 20 BP → 90,000 (regression guards — live path already tiered).
- `nested weapon`: Predator 350 + Smartgun Internal 350 (Weapon Cost) + accessory gear 100 → `weaponTotalCost` = 800.
- `cyberware tree`: Cyberears R2 750 + child 500 (Alphaware ×2 → 1,000) → `cyberwareTotalCost` = 1,750.
- `gear quantity recursion`: parent qty 1 cost 100 with child qty 2 cost 50 → 200 total... (100 + 2×50 = 200).
- `vehicle full stack`: Doberman 3,000 + mount 1,500 + mounted gun 1,000 + Vehicle Sensor 100 → 5,600; included stock mod's weapon still counts (desktop 15641-15646 parity).
- `budget invariant property test`: scripted build with one of each collection; assert `startingNuyen − spent === nuyen` after every step.
- `desktop parity check` (documented in test comment): hand-computed desktop TotalCost for the vehicle full stack case matches.

### Dependencies

- Steps 1-2: none. Steps 3-5: **#72, #73, #74a, #75, #76, #77** (final shapes).
- **#71 (golden characters, Engine epic)** will re-assert these totals end-to-end.

### Risks & edge cases

- The karma-rate fix alters existing karma-build characters' budgets on their next resources change — that is the correct SR4 value, but expect user-visible deltas; note in changelog. (BP builds are unaffected: the live path is already tiered.)
- Included (stock/imported) mods and accessories must be excluded from cost but their mounted weapons included — easy to invert; the vehicle test pins it.
- `calculateEquipmentSpent` in `character.ts` is a private duplicate — not exported, not a re-export — and no test imports the name (grep confirms), so there is no export-name-stability constraint. The real constraint is sequencing: land #75's dedup first so there is exactly ONE implementation to fix; otherwise apply every change to both copies.
- Foci `improvements` field (`types/equipment.ts:488`) is irrelevant to cost; don't touch.

---

## Issue #79: Commlink specialization and matrix attributes

**Labels:** `epic:equipment2`, `priority:medium` · **Size: M**

### Verified current state

- Commlinks are plain gear — only category strings exist (`GearCategory`, `types/equipment.ts:369-389`: 'Commlink', 'Commlink Operating System', 'Commlink Upgrade', …). No matrix stats anywhere on `CharacterGear`.
- `calculateMatrixInitiative` (`engine/calculations.ts:360-364`) = `INT + RES + MatrixInitiative improvements` — wrong for everyone: mundane deckers have no commlink Response source, and technomancers should not add improvements-typed `MatrixInitiative` this way.
- `calculateMatrixInitiativeDice` (`calculations.ts:366-368`) = `3 + MatrixInitiativePass + MatrixInitiativePassAdd` — **wrong for mundane characters**: desktop `MatrixInitiativePasses` (`clsCharacter.cs:3849-3874`) gives standard characters `1 + ValueOf(MatrixInitiativePass)` and only technomancers `3 + ValueOf(MatrixInitiativePass)`, with `MatrixInitiativePassAdd` added for both (A.I./Technocritters/Protosapients are forced to 3 — no web metatype support, out of scope). A mundane decker gets 3 matrix IP web-side vs 1 desktop-side today.
- **Data:** gear.json items carry no matrix fields (`convertGear` output, `convert-xml-to-json.ts:1092-1100`). gear.xml has `<response>`/`<signal>` on Commlink entries (CMT Clip: response 1, signal 3 — gear.xml:585-595) and `<firewall>`/`<system>` on 'Commlink Operating System' entries (Renraku Ichi: firewall 2, system 2 — :866-875).
- **Desktop behavior:**
  - `Commlink : Gear` (`clsEquipment.cs:11931`) adds `response`, `signal`, `active` (IsActive :12562-12571); `OperatingSystem : Gear` (:12800) adds `system`, `firewall`. Save writes them as extra elements on the `<gear>` node (:12249-12251, active at :12277).
  - `Commlink.TotalResponse` (:12579-12600): max of own response and any child gear of category 'Commlink Upgrade' with a higher response.
  - `Character.MatrixInitiative` (`clsCharacter.cs:3797-3837`): **mundane** = `INT.TotalValue + activeCommlink.TotalResponse + ValueOf(MatrixInitiative)`; **technomancer** = `INT × 2 + 1 + ValueOf(LivingPersonaResponse)`; plus wound modifiers, floored at 0.
  - Programs: desktop keeps SR4 programs both as a character-level `<programs>` list and as gear children under commlinks; the plan directs the gear-children route for the web (character-level `<programs>` export stays #80's concern).

### Design

Types (`types/equipment.ts`) — one optional object beats five optional fields under `exactOptionalPropertyTypes`:

```ts
export interface GearMatrixStats {
	readonly response: number;
	readonly signal: number;
	readonly system: number;
	readonly firewall: number;
	/** This commlink is the character's active one (drives matrix initiative). */
	readonly active: boolean;
}

/** CharacterGear gains: */
readonly matrix?: GearMatrixStats;

/** GameGear gains: */
readonly response?: number;
readonly signal?: number;
readonly system?: number;
readonly firewall?: number;
```

Populated when `category === 'Commlink'` (response/signal, system/firewall 0) or `'Commlink Operating System'` / `'Commlink Upgrade'` (their respective stats). Migration: none needed (`matrix` optional; absent = plain gear).

Effective stats helper (`types/equipment.ts`):

```ts
export function getCommlinkStats(commlink: CharacterGear): GearMatrixStats | null;
// null unless commlink.matrix set. Effective values:
//  response = max(own, children 'Commlink Upgrade' response)   (desktop TotalResponse)
//  signal   = max(own, upgrade children signal)                (desktop TotalSignal, same pattern)
//  system/firewall = max(own, children 'Commlink Operating System' values)
//  — OS installs as child gear, mirroring desktop's separate-purchase model
```

Store (`stores/equipment/matrix.ts`):

```ts
export function setActiveCommlink(gearId: string): MutationResult;
// finds the gear via findInTree, requires matrix stats; sets active=true on it,
// active=false on every other matrix gear (single-active invariant).
```

`addGear`/`addGearToGear` populate `matrix` from the catalog fields; the first commlink a character buys becomes active automatically.

Calculations (`engine/calculations.ts:360-368`, desktop-parity rewrite — **#79 owns this rewrite (C2)**; #68 (engine epic) only *produces* the `LivingPersonaResponse` improvement and leaves the technomancer-branch formula to this issue. Flag the shared `calculations.ts:360-368` range in both PRs; the #71 golden-5 value `(4×2)+1+1` must hold):

```ts
export function calculateMatrixInitiative(char: Character): number {
	if (char.resonance) {
		return getAttributeTotal(char, 'int') * 2 + 1
			+ valueOf(char.improvements, 'LivingPersonaResponse');
	}
	const commlink = findActiveCommlink(char.equipment.gear); // tree search
	const response = commlink ? getCommlinkStats(commlink)!.response : 0;
	return getAttributeTotal(char, 'int') + response
		+ valueOf(char.improvements, 'MatrixInitiative');
}
```

`calculateMatrixInitiativeDice` gets the same desktop-parity treatment (it does NOT already match — see Verified current state):

```ts
export function calculateMatrixInitiativeDice(char: Character): number {
	const base = char.resonance ? 3 : 1; // desktop clsCharacter.cs:3849-3874
	return base
		+ valueOf(char.improvements, 'MatrixInitiativePass')
		+ valueOf(char.improvements, 'MatrixInitiativePassAdd');
}
```

(Wound modifiers stay out — no calculation in this module applies them to initiative today; parity for wounds is Engine-epic scope.)

Programs: the gear modal gains a 'Matrix Programs' path — `gameData.programs` (programs.json already loads, `gamedata.ts`) rendered when the attach target is a commlink; chosen programs become child gear `{ category: 'Matrix Programs', rating, cost }` under the commlink (nesting from #76). Loaded/running state: SR4 running programs affect Response degradation — out of scope; store only ownership (children). Document in the panel copy.

UI: gear detail panel (`EquipmentSelector.svelte:853-886`) shows a matrix block (R/S/F/Sy from `getCommlinkStats`), an "Set Active" button, an "Install OS / Add Program" flow via `attachTarget`; `CharacterSheet.svelte`'s matrix initiative display picks up the corrected calculation automatically.

XML: `exportGear` (`exporter.ts:408-433`) writes `<response>`, `<signal>`, `<active>` for commlink-category gear and `<system>`/`<firewall>` for OS gear (desktop Commlink/OperatingSystem Save shapes); `parseGear` (`importer.ts:558-598`) reads them back into `matrix`.

### Implementation steps

1. Converter: emit response/signal/system/firewall on gear entries that have them. → verify: gear.json CMT Clip has `response: 1, signal: 3`; Renraku Ichi has `system: 2, firewall: 2`.
2. Types + `getCommlinkStats` + unit tests.
3. Store: matrix population in add-paths, `setActiveCommlink`, auto-activate first commlink. → verify: tests below.
4. Rewrite `calculateMatrixInitiative` AND `calculateMatrixInitiativeDice` (mundane base 1, technomancer base 3 — the current code returns `3 + bonuses` for everyone, `calculations.ts:366-368`). → verify: calculations tests.
5. Programs-into-commlink UI + OS install flow. → verify: manual — buy CMT Clip, install Renraku Ichi, add Analyze program; nested render + budget correct.
6. XML round-trip of matrix fields. → verify: exporter/importer tests.

### Test plan

- `mundane decker`: INT 4, active CMT Clip (response 1) → matrix initiative 5; swap active to a response-3 commlink → 7.
- `no commlink`: mundane, none active → 4 (INT only).
- `technomancer`: INT 5, resonance set → 11 (5×2+1); LivingPersonaResponse +1 improvement → 12; commlinks ignored.
- `upgrade child raises response`: commlink response 1 + child 'Commlink Upgrade' response 3 → effective 3 (desktop TotalResponse parity).
- `OS install`: CMT Clip + Renraku Ichi child → system 2 / firewall 2 effective.
- `single-active invariant`: activating commlink B deactivates A.
- `matrix passes`: mundane decker → 1 IP; technomancer → 3 IP (desktop `MatrixInitiativePasses` parity, regression for `calculations.ts:366-368`).
- `program nesting cost`: program child cost counts via `gearTotalCost` (#78).
- `XML round-trip`: commlink with OS + program keeps R/S/F/Sy + active flag.

### Dependencies

- **#76** — children as the canonical nesting (OS/programs/upgrades are child gear).
- **#78** — program/OS costs flow through `gearTotalCost`.
- **#65 (Engine epic)** — `LivingPersonaResponse` / `MatrixInitiative` improvement production; `valueOf` reads return 0 until then (calculation is still correct for commlink users).
- **#80 (XML epic)** — character-level `<programs>` element export (distinct from gear children) stays there.

### Risks & edge cases

- `matrix` on non-commlink categories: importer must not fabricate stats for plain gear (only map when elements are present or category matches).
- Two commlinks marked active in a hand-edited save → migration/normalizer keeps the first, clears the rest (add to `migrateCharacter`).
- Signal/response 0 is legitimate (cheap commlinks) — `active` flag, not truthiness, decides participation.
- Response degradation from running programs (SR4 p.228) intentionally unmodeled; document next to `getCommlinkStats`.

---

<!-- EPIC COMPLETE -->

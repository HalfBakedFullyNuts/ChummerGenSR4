# ChummerWeb vs Desktop Chummer — Fidelity Comparison

> Cross-referencing the [ChummerWeb audit](file:///f:/Projects/ChummerWeb/.claude/audit_report.md) against the [desktop Chummer analysis](file:///f:/Projects/ChummerWeb/.claude/ChummerWeb%20Analysis).

---

## 1. Architecture Mapping

| Desktop (C# / WinForms)             | Web (SvelteKit / TypeScript)                                                  | Faithful?                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `clsCharacter.cs` (6,006 lines)     | `stores/character.ts` (4,337 lines)                                           | ⚠️ Similar "god object" pattern — but the web version is actually **smaller** and missing fields |
| `clsImprovement.cs` (2,819 lines)   | `engine/improvements.ts` (560 lines) + `stores/qualityBonuses.ts` (444 lines) | ❌ **Severely incomplete** — see Section 3                                                       |
| `clsUnique.cs` (8,606 lines)        | `types/character.ts` + `types/skills.ts` + `types/attributes.ts`              | ⚠️ Core types exist but many unique classes missing                                              |
| `clsEquipment.cs` (15,950 lines)    | `types/equipment.ts` (572 lines)                                              | ❌ **Flat structure** — missing nesting, see Section 4                                           |
| `clsCommon.cs` (1,367 lines)        | `utils/` (5 files)                                                            | ✅ Adequate — different approach (no TreeView to search)                                         |
| `clsOptions.cs` (3,977 lines)       | Not implemented                                                               | ❌ No settings system exists                                                                     |
| `clsLanguageManager.cs` (650 lines) | Not implemented                                                               | ❌ No i18n exists                                                                                |
| `clsExpenses.cs` (571 lines)        | Inline in `character.ts`                                                      | ⚠️ Basic tracking exists, **no undo support**                                                    |
| `clsXmlManager.cs` (688 lines)      | `stores/gamedata.ts` (23KB) + `xml/` (import/export)                          | ✅ Adequate JSON-based approach                                                                  |

---

## 2. Data Model Fidelity

### 2.1 Character Fields — What Matches

The core character structure translates well:

| Desktop Field                                   | Web Implementation                                         | Status                                |
| ----------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| Identity (name, alias, player, descriptors)     | `Character.identity`                                       | ✅ Complete                           |
| Build system (BP, Karma, method)                | `Character.buildMethod`, `buildPointsSpent`, `remainingBP` | ✅ Complete                           |
| Metatype (race, variant, category)              | `Character.identity.metatype/metavariant`                  | ✅ Complete                           |
| Core attributes (BOD–WIL, EDG)                  | `Character.attributes` `AttributeValue` objects            | ✅ Complete                           |
| Special attributes (MAG, RES, ESS)              | `Character.attributes.mag/res` + `ess`                     | ✅ Complete                           |
| Special flags (MAG/RES/Adept/Mage/Tech enabled) | Via quality detection (`getMagicType()`)                   | ✅ Different approach, but functional |
| Skills + skill groups                           | `Character.skills` + `skillGroups`                         | ✅ Complete                           |
| Knowledge skills                                | `Character.knowledgeSkills`                                | ✅ Complete                           |
| Qualities                                       | `Character.qualities`                                      | ✅ Complete                           |
| Contacts                                        | `Character.contacts`                                       | ✅ Complete                           |
| Spells                                          | `Character.magic.spells`                                   | ✅ Complete                           |
| Adept powers                                    | `Character.magic.powers`                                   | ✅ Complete                           |
| Spirits                                         | `Character.magic.spirits`                                  | ✅ Complete                           |
| Karma / totalKarma / nuyen                      | Present                                                    | ✅ Complete                           |
| Expense log                                     | `Character.expenseLog`                                     | ✅ Present (no undo)                  |
| Condition monitors                              | `Character.condition`                                      | ✅ Complete                           |
| Reputation                                      | `Character.reputation`                                     | ✅ Complete                           |

### 2.2 Character Fields — What's Missing

| Desktop Field                                                 | Web Status                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `_strMugshot` (portrait image)                                | ❌ Not implemented                                                              |
| `_strGameNotes` (GM-only notes)                               | ❌ Not implemented                                                              |
| `_intMaxAvail` (availability restriction, default 12)         | ❌ Not tracked                                                                  |
| `_strMovement` (movement rate override)                       | ❌ Not implemented                                                              |
| `_blnIsCritter` / `_blnPossessed`                             | ❌ Critter support not implemented                                              |
| `_lstFoci` / `_lstStackedFoci`                                | ❌ Foci not implemented                                                         |
| `_lstTechPrograms` → `TechProgramOption` nesting              | ⚠️ Complex forms exist but no option/rating system                              |
| `_lstInitiationGrades` (structured grade list)                | ⚠️ Single `initiateGrade` number, not full Grade objects with ordeal/group info |
| `_blnUneducated` / `_blnUncouth` / `_blnInfirm`               | ✅ In `qualityBonuses.flags` — but **not wired** to skill cost calculations     |
| `_lstCritterPowers`                                           | ❌ Not implemented                                                              |
| Organizational data (locations, weapon bundles, armor groups) | ❌ Not implemented                                                              |

---

## 3. The Improvement System — CRITICAL GAP

> [!CAUTION]
> The desktop analysis identifies `ImprovementManager.CreateImprovements()` as the **single most critical piece of logic** for faithful recreation. The web version is **severely incomplete**.

### Desktop: 89 ImprovementTypes + 1,300-line CreateImprovements()

The desktop `ImprovementManager` is a **generic, data-driven rules engine**:

- Source-agnostic: any XML `<bonus>` node from any source type creates improvements
- Transactional: `Commit()` / `Rollback()` for atomic operations
- 89 improvement types covering every conceivable stat modifier
- `ValueOf(type, name)` aggregates all active improvements of a type

### Web: Split into Two Partial Systems

**System 1:** `engine/improvements.ts` (560 lines)

- `ImprovementTarget`: only ~10 types (vs 89)
- Only handles: cyberware, qualities, and adept powers
- No gear, spell, metamagic, echo, or metatype improvements
- No transaction/rollback support

**System 2:** `stores/qualityBonuses.ts` (444 lines)

- A separate, parallel system for quality bonuses only
- Handles ~30 bonus types from quality data
- Reactive (Svelte derived store) — recalculates on every change
- **Not** a general improvement system — hardcoded to qualities

### What's Wrong

| Desktop Behavior                                            | Web Status                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| All bonus sources use one unified system                    | ❌ Split into 2+ separate, incompatible systems             |
| `CreateImprovements()` parses arbitrary XML `<bonus>` nodes | ❌ Hardcoded per-source-type logic                          |
| `RemoveImprovements(source, name)` — clean removal          | ⚠️ Quality removal works; others unclear                    |
| `ValueOf(type, name)` — aggregate from all sources          | ⚠️ `getTotalImprovement()` exists but only covers 3 sources |
| Transactional (Commit / Rollback)                           | ❌ No transaction support                                   |
| 89 improvement types                                        | ❌ ~10 types                                                |
| `UniqueName` grouping (highest in group applies)            | ❌ Not implemented                                          |
| `AddToRating` flag (rating vs dice pool bonus)              | ❌ Not implemented                                          |
| `Exclude` field (exceptions to improvements)                | ❌ Not implemented                                          |

### Recommendation

The Improvement system needs to be **unified and expanded** to be a single data-driven engine that:

1. Accepts bonus definitions from **any** source (quality, cyberware, bioware, gear, spell, power, metamagic, echo)
2. Creates typed `Improvement` objects stored on the character
3. Supports `ValueOf()` aggregation across all sources
4. Handles all 89+ improvement types from the desktop app

---

## 4. Equipment Nesting — STRUCTURAL GAP

The desktop's equipment model supports **deep nesting**:

```
Vehicle
  └── VehicleMod
       └── Weapon
            └── WeaponAccessory
                 └── Gear
Cyberware
  └── Child Cyberware
       └── Gear
Armor
  └── ArmorMod
  └── Gear
Gear
  └── Child Gear (recursive)
```

### Web Version: Flat Structure

| Desktop Type                                   | Nesting   | Web Type                                     | Nesting                   |
| ---------------------------------------------- | --------- | -------------------------------------------- | ------------------------- |
| `Weapon` → `WeaponAccessory[]` → `WeaponMod[]` | 3 levels  | `CharacterWeapon` → `WeaponAccessory[]`      | 2 levels (no mods)        |
| `Armor` → `ArmorMod[]` + `Gear[]`              | 2 levels  | `CharacterArmor` → `ArmorModification[]`     | 2 levels (no nested gear) |
| `Cyberware` → child `Cyberware[]` + `Gear[]`   | Recursive | `CharacterCyberware`                         | ❌ **Flat** — no children |
| `Gear` → child `Gear[]`                        | Recursive | `CharacterGear`                              | ❌ **Flat** — no children |
| `Vehicle` → `VehicleMod[]` → `Weapon[]`        | 3+ levels | `CharacterVehicle` → `VehicleModification[]` | 2 levels                  |
| `Commlink` (extends Gear)                      | Subclass  | Not specialized                              | ❌ No commlink type       |

This means the web version **cannot represent**:

- Cyberware subsystems (e.g., installed fingers inside a cyberhand)
- Gear inside gear (e.g., programs in a commlink)
- Vehicle-mounted equipment hierarchies
- Weapon modifications (WeaponMod is separate from WeaponAccessory)

---

## 5. UI Form Mapping

### Desktop → Web Component Mapping

| Desktop Form               | Lines               | Web Equivalent                                                  | Status           |
| -------------------------- | ------------------- | --------------------------------------------------------------- | ---------------- |
| `frmCreate` (23,123 lines) | Creation            | Wizard components (10 files, ~205KB total)                      | ✅ Comprehensive |
| `frmCareer` (26,951 lines) | Career mode         | `CareerAdvancement.svelte` (28KB) + `CareerPanel.svelte` (11KB) | ⚠️ Partial       |
| `frmMain` (847 lines)      | MDI host            | `+layout.svelte` + `+page.svelte`                               | ✅ Adequate      |
| `frmSelectQuality`         | Quality picker      | `QualitySelector.svelte` (32KB)                                 | ✅ Complete      |
| `frmSelectSpell`           | Spell picker        | `MagicSelector.svelte` (23KB)                                   | ✅ Complete      |
| `frmSelectCyberware`       | Cyberware picker    | Part of `EquipmentSelector.svelte` (53KB)                       | ✅ Complete      |
| `frmSelectGear`            | Gear picker         | Part of `EquipmentSelector.svelte`                              | ✅ Complete      |
| `frmSelectWeapon`          | Weapon picker       | Part of `EquipmentSelector.svelte`                              | ✅ Complete      |
| `frmSelectArmor`           | Armor picker        | Part of `EquipmentSelector.svelte`                              | ✅ Complete      |
| `frmSelectVehicle`         | Vehicle picker      | Part of `EquipmentSelector.svelte`                              | ✅ Complete      |
| `frmSelectPower`           | Power picker        | Part of `MagicSelector.svelte`                                  | ✅ Complete      |
| `frmSelectMetamagic`       | Metamagic picker    | Not found                                                       | ❌ Missing       |
| `frmSelectMentorSpirit`    | Mentor picker       | Part of `MagicSelector.svelte`                                  | ✅ Complete      |
| `frmSelectMartialArt`      | Martial arts picker | Not found                                                       | ❌ Missing       |
| `frmSelectLifestyle`       | Lifestyle picker    | Not found                                                       | ❌ Missing       |
| `frmSelectProgram`         | Complex form picker | Part of `TechnomancerPanel.svelte`                              | ⚠️ Partial       |
| `frmOptions`               | Global settings     | Not implemented                                                 | ❌ Missing       |
| `frmDiceRoller`            | Dice roller         | `DiceRoller.svelte`                                             | ✅ Complete      |
| `frmCharacterRoster`       | Character list      | `CharacterList.svelte`                                          | ✅ Complete      |
| `frmViewer` / `frmExport`  | Print/export        | `CharacterSheet.svelte` (43KB)                                  | ✅ Complete      |

### Desktop Forms Not Ported

| Desktop Form                                          | Purpose                 | Priority                               |
| ----------------------------------------------------- | ----------------------- | -------------------------------------- |
| `frmSelectBP`                                         | Build method dialog     | ✅ Exists as `BuildMethodModal.svelte` |
| `frmMetatype`                                         | Metatype selection      | ✅ Exists as `MetatypeSelector.svelte` |
| `frmSelectArmorMod`                                   | Armor mod selector      | ❌ Not implemented                     |
| `frmSelectVehicleMod`                                 | Vehicle mod selector    | ❌ Not implemented                     |
| `frmSelectWeaponAccessory`                            | Weapon accessory picker | ❌ Not implemented                     |
| `frmSelectComplexFormOption`                          | Complex form options    | ❌ Not implemented                     |
| `frmSelectCritterPower`                               | Critter power picker    | ❌ Not needed for player characters    |
| `frmSelectExoticSkill`                                | Exotic skill selector   | ❌ Not implemented                     |
| `frmSelectItem` / `frmSelectNumber` / `frmSelectText` | Generic pickers         | N/A — can use native inputs            |
| `frmOmae`                                             | Online sharing (SOAP)   | N/A — replaced by Firebase             |

---

## 6. Game Data Coverage

| Desktop XML File    | Web JSON Equivalent      | Status                                                          |
| ------------------- | ------------------------ | --------------------------------------------------------------- |
| `metatypes.xml`     | `metatypes.json` (47KB)  | ✅ Present                                                      |
| `skills.xml`        | `skills.json` (26KB)     | ✅ Present                                                      |
| `qualities.xml`     | `qualities.json` (152KB) | ✅ Present                                                      |
| `weapons.xml`       | `weapons.json` (268KB)   | ✅ Present                                                      |
| `armor.xml`         | `armor.json` (47KB)      | ✅ Present                                                      |
| `gear.xml`          | `gear.json` (71KB)       | ✅ Present                                                      |
| `cyberware.xml`     | `cyberware.json` (66KB)  | ✅ Present                                                      |
| `bioware.xml`       | `bioware.json` (39KB)    | ✅ Present                                                      |
| `spells.xml`        | `spells.json` (69KB)     | ✅ Present                                                      |
| `powers.xml`        | `powers.json` (16KB)     | ✅ Present                                                      |
| `complexforms.xml`  | ❌ Missing               | ❌ **Not converted** — `programs.json` may partially cover this |
| `vehicles.xml`      | `vehicles.json` (176KB)  | ✅ Present                                                      |
| `martialarts.xml`   | `martialarts.json` (5KB) | ✅ Present                                                      |
| `critterpowers.xml` | ❌ Missing               | ❌ Not needed for players                                       |
| `metamagic.xml`     | ❌ Missing               | ❌ **Not converted** — echoes.json may partially cover this     |
| `mentors.xml`       | `mentors.json` (16KB)    | ✅ Present                                                      |
| `lifestyles.xml`    | `lifestyles.json` (1KB)  | ⚠️ Present but very small                                       |
| `traditions.xml`    | `traditions.json` (7KB)  | ✅ Present                                                      |
| `streams.xml`       | `streams.json` (2KB)     | ✅ Present                                                      |
| `books.xml`         | ❌ Missing               | ❌ No sourcebook system — **needed for filtering**              |
| `improvements.xml`  | ❌ Missing               | ❌ Custom improvements not supported                            |
| `ranges.xml`        | ❌ Missing               | ❌ Weapon ranges not available                                  |

---

## 7. Calculated Values Comparison

| Derived Value     | Desktop Formula                            | Web Implementation                   | Match?                         |
| ----------------- | ------------------------------------------ | ------------------------------------ | ------------------------------ |
| Physical CM       | `8 + ceil(BOD/2) + improvements`           | `8 + ceil(BOD/2)`                    | ⚠️ Missing improvement bonus   |
| Stun CM           | `8 + ceil(WIL/2) + improvements`           | `8 + ceil(WIL/2)`                    | ⚠️ Missing improvement bonus   |
| CM Threshold      | `3 + improvements`                         | Not implemented                      | ❌                             |
| Overflow          | `BOD + improvements`                       | `BOD` only                           | ⚠️ Missing improvement bonus   |
| Initiative        | `INT + REA + improvements`                 | `INT + REA + improvements` (partial) | ⚠️ Only cyberware improvements |
| Initiative Passes | `1 + improvements`                         | Implemented                          | ⚠️ Only cyberware source       |
| Essence           | `6 - Σ(cyberware ESS × grade)`             | Same formula                         | ✅ Match                       |
| Composure         | `CHA + WIL + improvements`                 | `CHA + WIL`                          | ⚠️ Missing improvement bonus   |
| Judge Intentions  | `INT + CHA + improvements`                 | `INT + CHA`                          | ⚠️ Missing improvement bonus   |
| Memory            | `LOG + WIL + improvements`                 | `LOG + WIL`                          | ⚠️ Missing improvement bonus   |
| Lift/Carry        | `BOD + STR + improvements`                 | `BOD + STR`                          | ⚠️ Missing improvement bonus   |
| Movement          | `AGI × metatype multiplier × improvements` | `AGI × 2` (human only?)              | ⚠️ Simplified                  |
| Armor             | Sum equipped + mods + improvements         | Implemented                          | ⚠️ Partial                     |
| Street Cred       | `floor(CareerKarma/10)` + manual           | Not fully implemented                | ⚠️                             |

**Key pattern:** The web calculations exist but **don't aggregate improvements from all sources**. They use base attributes directly. This will produce incorrect results for characters with improvement-granting items.

---

## 8. Feature Coverage Gap Matrix

### Desktop → Web Feature Porting Status

| Feature Area                     | Desktop Complexity | Web Status              | Gap Size                                               |
| -------------------------------- | ------------------ | ----------------------- | ------------------------------------------------------ |
| BP Build Character Creation      | High               | ✅ Complete             | Small                                                  |
| Karma Build Character Creation   | High               | ✅ Complete             | Small                                                  |
| Metatype + Metavariant Selection | Medium             | ✅ Complete             | None                                                   |
| Attribute Allocation + Limits    | High               | ✅ Complete             | Small                                                  |
| Active Skills + Groups           | High               | ✅ Complete             | Small                                                  |
| Knowledge Skills                 | Medium             | ✅ Complete             | None                                                   |
| Quality System + Bonuses         | Very High          | ⚠️ Partial              | **Medium** — bonuses computed but not fully integrated |
| Spell Selection                  | Medium             | ✅ Complete             | None                                                   |
| Adept Powers                     | Medium             | ✅ Complete             | None                                                   |
| Complex Forms                    | Medium             | ⚠️ Partial              | Medium — no option/rating system                       |
| Weapons + Accessories            | High               | ⚠️ Partial              | Medium — no mods, limited accessories                  |
| Armor + Mods                     | Medium             | ⚠️ Partial              | Small — basic mods only                                |
| Cyberware + Nesting              | Very High          | ⚠️ Partial              | **Large** — no child cyberware                         |
| Bioware                          | Medium             | ⚠️ Partial              | Medium                                                 |
| Gear + Nesting                   | High               | ⚠️ Partial              | **Large** — completely flat                            |
| Vehicles + Mods                  | Very High          | ⚠️ Basic                | **Large** — no weapon mounts, limited mods             |
| Contacts                         | Low                | ✅ Complete             | None                                                   |
| Martial Arts                     | Medium             | ⚠️ Partial              | Medium                                                 |
| Career Mode — Karma Advancement  | High               | ✅ Mostly done          | Small                                                  |
| Career Mode — Expense Undo       | Medium             | ❌ Missing              | Medium                                                 |
| Initiation + Metamagics          | Medium             | ⚠️ Partial              | Medium — no structured grades                          |
| Submersion + Echoes              | Medium             | ✅ Mostly done          | Small                                                  |
| Foci (Bonding, Stacking)         | High               | ❌ Missing              | **Large**                                              |
| Improvement System               | **Critical**       | ❌ Severely incomplete  | **Critical**                                           |
| Settings / House Rules           | High               | ❌ Missing              | Large                                                  |
| Sourcebook Filtering             | Medium             | ❌ Missing              | Medium                                                 |
| Localization                     | Medium             | ❌ Missing              | Medium                                                 |
| Print / Character Sheet          | High               | ✅ Present              | Small                                                  |
| XML Save/Load Compatibility      | High               | ✅ Import/Export exists | ⚠️ Needs fidelity testing                              |
| Critter Support                  | Medium             | ❌ Missing              | Low (not player-facing)                                |

---

## 9. Priority Recommendations for Faithful Recreation

### 🔴 Critical — Must Fix for Correct Character Builds

1. **Unify and expand the Improvement system** — This is the #1 priority. Without a faithful `ImprovementManager`, every character with bonuses from cyberware, qualities, gear, or spells will have **incorrect stats**. Create a single `ImprovementManager` class that:
   - Handles all 89+ improvement types from the desktop app
   - Accepts bonus definitions from any source
   - Supports `ValueOf()` aggregation
   - Replaces both `engine/improvements.ts` and `stores/qualityBonuses.ts`

2. **Wire improvements into all calculations** — `calculations.ts` must call `ImprovementManager.ValueOf()` for every derived value (CM, initiative, composure, etc.), not just use raw attribute values.

3. **Add equipment nesting** — Cyberware children, gear children, and vehicle weapon mounts are essential for correct character representation and import/export compatibility.

### 🟡 Important — Needed for Feature Parity

4. **Add missing game data files** — Convert `complexforms.xml`, `metamagic.xml`, `books.xml`, and `ranges.xml` to JSON.
5. **Add structured InitiationGrade** — Replace the simple `initiateGrade: number` with a list of Grade objects tracking ordeal/group/schooling.
6. **Implement foci system** — Foci bonding and stacking is a significant feature gap.
7. **Add sourcebook filtering** — The desktop's `BookXPath()` pattern is essential for players who don't use all supplements.
8. **Add expense undo** — The desktop has full career-mode undo support.
9. **Add max availability tracking** — Default 12 during creation, affects equipment purchasing.

### 🟢 Polish — Nice to Have

10. **Add portrait/mugshot support**
11. **Add settings / house rules** — Port the key `CharacterOptions` booleans
12. **Add i18n** — The desktop supports 4 languages
13. **Add metamagic/echo selection UI**
14. **Add martial arts selection UI**
15. **Add lifestyle selection UI**

---

_End of comparison._

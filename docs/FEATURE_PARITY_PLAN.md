# ChummerWeb — Feature Parity Analysis & Implementation Plan

> **Date:** 2026-07-15
> **Goal:** Complete the web reimplementation to feature parity with desktop ChummerGenSR4.
> **Method:** Full code audit of the current tree (branch `master` + ~3,200 lines of uncommitted work) cross-referenced against the desktop C# source at `F:\Projects\ChummerDesktop\Chummer\`.
> **Supersedes:** `.claude/implementation_plan.md` (Phases 0–2 are done; 3–8 partially done). Extends `docs/ISSUES.md` (issues #1–#60) with issues **#61–#104**.

---

# Part I — Current-State Analysis

## 1. Baseline

- **Tests:** 531 passing across 14 files (`vitest run`, 2026-07-15). No failures.
- **Type check:** `svelte-check` reports **10 errors / 15 warnings in 7 files** — all from in-flight, uncommitted work (`initiations` field on `CharacterMagic`, `modules` on `CharacterLifestyle`, `overflowCurrent` on `ConditionMonitor`, read-only assignments to `initiateGrade`/`powerPoints`/`foci`). The working tree is mid-feature and must be stabilized first (see Issue #99).
- **Coverage tooling:** configured (v8 provider, `test:coverage` script). Svelte components excluded.
- **E2E:** `test:e2e` script exists but there is **no** `playwright.config.*` and no spec files — the script fails.
- **CI:** none (`.github/` does not exist).

## 2. Progress since the March 2026 audit

| Old plan phase | Status now |
| --- | --- |
| Phase 0 — Cleanup (dexie, ports, Firebase API, Zod) | ✅ Done |
| Phase 1 — Split character store | ✅ Done — 16 store modules exist |
| Phase 2 — Unified improvement system | ⚠️ **Half done** — engine exists + read-side wired; **write-side missing** (see §3) |
| Phase 3 — Equipment nesting | ⚠️ Partial — cyberware end-to-end; most other relationships are type-only stubs (see §4) |
| Phase 4 — Missing game data | ✅ Done — `books.json`, `metamagic.json`, `ranges.json`, complex forms in `programs.json` (71 flagged) |
| Phase 5 — Selection UIs | ⚠️ Partial — foci/metamagic/lifestyle/martial-arts all exist in basic form with gaps |
| Phase 6 — PWA | ✅ Done — service worker + manifest + app.html links |
| Phase 7 — Security & settings | ⚠️ Partial — `firestore.rules` exists (has an update-path hole); `appSettings.ts` + `/settings` route exist but sourcebook filtering is not wired |
| Phase 8 — Test coverage | ⚠️ Config done; engine/store integration tests still missing |

## 3. Critical finding: the improvement engine is write-side incomplete

The new `src/lib/engine/improvementManager.ts` is architecturally correct — the `ImprovementType` union in `src/lib/types/improvements.ts` has **exactly 89 members matching the desktop enum** (`clsImprovement.cs:12–101`), `valueOf()` implements uniqueName highest-in-group semantics, and ~16 functions in `calculations.ts` consume it. But:

1. **Only qualities create improvements.** `addCyberware`, `addBioware`, `addGear`, `addPower`, `setMetatype`, `learnMetamagic`, `learnEcho`, `bondFocus` create **zero** improvements. A character with Wired Reflexes gets initiative passes only via legacy hardcoded name-matching (`calculations.ts:100–116`), not via the engine.
2. **Divergent duplicate `addQuality`.** `stores/index.ts:113–123` re-exports `addQuality`/`removeQuality` from `attributes.ts` — versions that do **not** create improvements. The improvement-creating versions live in `character.ts:644/709/783`. The UI happens to import the right one directly; anything importing from the barrel silently gets the no-op.
3. **Producer/consumer type mismatches.** The bonus parser emits `ConditionMonitor`, but calculations read `PhysicalCM`/`StunCM` — a Toughness-style quality produces a dead improvement. `Skill`/`SkillGroup`/`SkillCategory`/`Memory`/`MovementPercent`/`DamageResistance` are produced but never consumed; `Memory`/`BallisticArmor`/`PhysicalCM` are consumed but never produced. Only **six** types currently flow end-to-end: Attribute, Initiative, InitiativePass, Composure, JudgeIntentions, DrainResistance.
4. **Unimplemented semantics:** `addToRating` and `exclude` fields exist but are never read; `rating` scaling is punted (comment at `improvementManager.ts:45–50`); no transaction commit/rollback.
5. **Skill dice pools ignore improvements entirely** (`calculateDicePool`, `calculations.ts:219–238`), and Uneducated/Uncouth/Infirm are display-text only — they do not double skill costs.
6. **Dead code:** the old `engine/improvements.ts` (575 lines) has no consumers but is still re-exported by `engine/index.ts:57–72`, causing an `Improvement`/`ImprovementSource` type-name collision with `types/index.ts:28`.

**Consequence:** any character with stat bonuses from equipment, powers, metatype, or initiation has incorrect derived stats. This package blocks everything downstream and is the #1 priority.

## 4. Equipment hierarchy status

Desktop model (from `clsEquipment.cs`, 15,950 lines): *Gear contains Gear, Cyberware contains Cyberware, Vehicles contain Mods contain Weapons contain Accessories contain Gear.*

| Desktop relationship | Web status |
| --- | --- |
| Cyberware → child Cyberware | ⚠️ Best-supported: type + store + recursive essence + XML round-trip + UI + tests. But store add/remove only maps **one level** (no grandchildren) and the UI child-remove calls top-level `removeCyberware` and silently fails (`EquipmentSelector.svelte:756–758`) |
| Gear → child Gear (recursive) | ⚠️ Type/store/XML exist; **no UI to add child gear**; **two competing nesting models** coexist (`children[]` tree vs `containerId`/`containedItems` flat container, `equipment.ts:415–426`) |
| Vehicle → Weapon | ⚠️ Store + UI exist, but **vehicles are dropped entirely on XML export** (`exporter.ts:336` writes `<vehicles />`) and never imported (`importer.ts:191`) |
| Vehicle → VehicleMod | ❌ Type only — no add function, no UI, no XML |
| Vehicle → Gear | ❌ Type field only |
| Weapon → WeaponAccessory / WeaponMod | ❌ Types only (`equipment.ts:86–101`) — always `[]` at runtime |
| Armor → ArmorMod | ❌ Type only |
| Armor → Gear | ❌ Not modeled |
| Commlink (Response/Signal/System/Firewall + programs) | ❌ Commlinks are plain gear; category strings only |
| Capacity enforcement | ⚠️ Only on the gear `containerId` path; not for cyberware, armor, or `addGearToGear` |
| Cost recursion | ❌ `calculateEquipmentSpent` (`stores/equipment.ts:63–75`, feeds the live nuyen budget) and `calculateEquipmentCost` (`types/equipment.ts:518–566`) do not recurse — nested purchases are **under-counted against the budget** |

## 5. XML compatibility status

Round-trip is **lossy in both directions**:

- **Export emits empty elements** for: improvements, expenses, metamagics, arts, spirits, complex forms, martial arts, programs, **vehicles**, **bioware**, critter powers (`exporter.ts:324–336`) — even when the character has that data. Availability hardcoded to `0`; movement and mugshot hardcoded.
- **Import hardcodes empty** for: bioware, vehicles, foci, martial arts (`importer.ts:190–193`), metamagics (`importer.ts:672`), spirits, complex-form details, expenses.

## 6. Remaining feature-area status (evidence-linked)

| Area | Status | Evidence |
| --- | --- | --- |
| Foci | ⚠️ Partial | `bondFocus` flips a flag only — **no improvements applied** (`magic.ts:422`); costs hardcoded (`FociSelector.svelte:43–44`); `StackedFocus` type is dead code |
| Initiation grades | ❌ Simple `initiateGrade: number` (`character.ts:244`); no ordeal/group/schooling discount (`career.ts:559–565`); in-flight work visible in type errors |
| Metamagic UI | ⚠️ Career-mode UI exists (`CareerAdvancement.svelte:537–571`); no creation-time UI |
| Complex forms | ⚠️ Rating exists but always 1; no career rating-increase (unused `IMPROVE_COMPLEX_FORM_MULTIPLIER`, `career.ts:33`); no option system |
| Lifestyle | ⚠️ Basic single lifestyle at creation; `lifestyles.json` is 8 base entries; **no career upkeep** |
| Martial arts | ⚠️ Add/remove + UI exist; `martialarts.json` has empty `techniques: []`; no maneuvers, no advantage improvements |
| Expense undo | ❌ Append-only log; desktop has full `ExpenseUndo` |
| Calendar | ❌ Real-world `new Date()` only (`career.ts:101`) |
| Street cred | ❌ Never derived — desktop: `floor(CareerKarma/10) + manual` |
| Max availability | ❌ Setting exists (default 12) but never enforced; `validation.ts:422–423` is a no-op |
| Sourcebook filtering | ❌ `enabledSourcebooks` setting exists; no gamedata query respects it |
| House rules | ❌ Desktop `CharacterOptions` has 100+ flags; web has 4 character defaults |
| Sharing (FR-8) | ❌ No routes, no tokens, no public rules |
| Portrait/mugshot | ❌ Not in type model |
| Firestore rules | ⚠️ Ownership-based but update path doesn't pin `userId` (privilege-retention hole); `firestore.indexes.json` referenced by `firebase.json` but missing |
| PWA | ✅ Done (minor: 512px manifest icon reuses the 192px file) |

## 7. Canonical desktop reference (extracted from source)

For implementers — the authoritative enums from `F:\Projects\ChummerDesktop\Chummer\clsImprovement.cs`:

- **`ImprovementType`: 89 members** (indices 0–88): Skill, Attribute, Text, BallisticArmor, ImpactArmor, Reach, Nuyen, Essence, Reaction, PhysicalCM, StunCM, UnarmedDV, SkillGroup, SkillCategory, SkillAttribute, InitiativePass, MatrixInitiative, MatrixInitiativePass, LifestyleCost, CMThreshold, EnhancedArticulation, WeaponCategoryDV, CyberwareEssCost, SpecialTab, Initiative, Uneducated, LivingPersonaResponse, LivingPersonaSignal, LivingPersonaFirewall, LivingPersonaSystem, LivingPersonaBiofeedback, Smartlink, BiowareEssCost, GenetechCostMultiplier, BasicBiowareEssCost, TransgenicsBiowareCost, SoftWeave, SensitiveSystem, ConditionMonitor, UnarmedDVPhysical, MovementPercent, Adapsin, FreePositiveQualities, FreeNegativeQualities, NuyenMaxBP, CMOverflow, FreeSpiritPowerPoints, AdeptPowerPoints, ArmorEncumbrancePenalty, Uncouth, Initiation, Submersion, Infirm, Skillwire, DamageResistance, RestrictedItemCount, AdeptLinguistics, SwimPercent, FlyPercent, FlySpeed, JudgeIntentions, LiftAndCarry, Memory, Concealability, SwapSkillAttribute, DrainResistance, FadingResistance, MatrixInitiativePassAdd, InitiativePassAdd, Composure, UnarmedAP, CMThresholdOffset, Restricted, Notoriety, SpellCategory, ThrowRange, SkillsoftAccess, AddSprite, BlackMarketDiscount, SelectWeapon, ComplexFormLimit, SpellLimit, QuickeningMetamagic, BasicLifestyleCost, ThrowSTR, IgnoreCMPenaltyStun, IgnoreCMPenaltyPhysical, CyborgEssence, EssenceMax.
  The web union in `types/improvements.ts` already matches — the gap is *production and consumption*, not the type list.
- **`ImprovementSource`: 28 members**: Quality, Power, Metatype, Cyberware, Metavariant, Bioware, Nanotech, Genetech, ArmorEncumbrance, Gear, Spell, MartialArtAdvantage, Initiation, Submersion, Metamagic, Echo, Armor, ArmorMod, EssenceLoss, ConditionMonitor, CritterPower, ComplexForm, EdgeUse, MutantCritter, Cyberzombie, StackedFocus, AttributeLoss, Custom (=999).
- **Key manager methods:** `ValueOf(type, addToRating, improvedName)` (`clsImprovement.cs:891`), `CreateImprovements(source, sourceName, xmlBonusNode, concatSelectedValue, rating, friendlyName)` (`:1133`, ~1,300 lines — the rules engine), `RemoveImprovements(source, sourceName)` (`:2467`), `Commit()`/`Rollback()` transactions (`:2800`).

---

# Part II — Feature Packages & Execution Order

| # | Package (Epic) | Issues | Depends on | Why this order |
| --- | --- | --- | --- | --- |
| 0 | Stabilize working tree | #99 | — | 10 type errors block everything; commit or finish in-flight work |
| 1 | **Improvement Engine Completion** | #61–#71 | 0 | Every derived stat is wrong until sources write improvements |
| 2 | **Equipment Hierarchy** | #72–#79 | 1 (partially) | Data-model parity; nested items must create improvements too |
| 3 | **XML Compatibility** | #80–#83 | 2 | Export/import can only be faithful once the model is complete |
| 4 | **Magic & Resonance Depth** | #84–#87 | 1 | Foci/initiation feed the improvement engine |
| 5 | **Career Mode Completion** | #88–#92 | 1 | Expense undo touches improvements removal |
| 6 | **Rules Enforcement & Settings** | #93–#96 | #82 (M10), #92 (soft) | #93/#96 need #82's owned-item `avail`/`source` fields; #93 consumes #92's add-fn signatures |
| 7 | **Content Depth** | #97–#98 | #16, #80/#81, #91 | #98 needs #68's handler + #80/#81 XML; #97 needs #91's lifestyle migration |
| 8 | **Platform & Delivery** | #100–#104 | — (parallel-safe) | Security, sharing, E2E, CI |

Suggested milestones (continuing `docs/ISSUES.md` M1–M7):

- **M8 — Correct Stats** (#99, #61–#71): every derived value routes through `valueOf()`; parity spot-checks vs desktop pass.
- **M9 — Full Equipment Model** (#72–#79): all desktop nesting relationships representable and budget-counted.
- **M10 — Lossless Round-Trip** (#80–#83): desktop `.chum` files survive import → export byte-comparably for supported sections.
- **M11 — Career & Magic Parity** (#84–#92).
- **M12 — Rules & Platform** (#93–#98, #100–#104).

---

# Part III — Detailed Issues

> **Note — these are the original drafts.** The HARDENED, implementation-ready specs live in [docs/issues/16-improvement-engine.md](issues/16-improvement-engine.md) through [docs/issues/23-platform-delivery.md](issues/23-platform-delivery.md), with [docs/issues/00-consistency-report.md](issues/00-consistency-report.md) providing the cross-epic corrections and the recommended implementation sequence. Where a draft below disagrees with a hardened spec, the hardened spec wins.

> Format follows `docs/ISSUES.md`. Numbering continues from #61. New epic labels: `epic:engine2`, `epic:equipment2`, `epic:xml2`, `epic:magic2`, `epic:career2`, `epic:rules`, `epic:content`, `epic:platform`.

## Epic: Improvement Engine Completion (Phase 16)

### Issue #61: Fix divergent duplicate addQuality implementations

**Labels:** `epic:engine2`, `priority:critical`, `bug`

**Description:**
Two full implementations of `addQuality`/`addQualityAgain`/`removeQuality` exist. The versions in `stores/character.ts` (lines 644, 709, 783) create/remove improvements via `createImprovementsFromBonus`/`removeImprovements`. The versions in `stores/attributes.ts` (lines 252, 305, 342) do **not** — and the barrel `stores/index.ts:113–123` exports the improvement-less versions. Components currently import from `$stores/character` directly, so the bug is latent, but any consumer of the barrel gets silent stat corruption.

**Tasks:**

- [ ] Delete the duplicate implementations in `attributes.ts` (they don't belong in an attributes module anyway)
- [ ] Ensure the barrel exports the `character.ts` versions
- [ ] Grep all imports of `addQuality`/`removeQuality`/`addQualityAgain` and confirm one resolution path
- [ ] Add a regression test: `addQuality` (imported from the barrel) for a quality with a `bonus` block must populate `char.improvements`

**Acceptance Criteria:**

- Exactly one implementation of each quality mutation exists
- Barrel import and direct import resolve to the same function
- Test proves barrel-imported `addQuality` creates improvements

---

### Issue #62: Create improvements from equipment sources (cyberware, bioware, gear)

**Labels:** `epic:engine2`, `priority:critical`

**Description:**
`addCyberware` (`character.ts:2169`), `addBioware` (`character.ts:2257`), and `addGear` (`character.ts:2554`) adjust essence/nuyen but create **zero** improvements. Desktop routes every `<bonus>` node through `CreateImprovements` regardless of source (`clsImprovement.cs:1133`). Wired Reflexes, Smartlink, attribute-boosting bioware, etc. must produce engine improvements instead of the legacy hardcoded name-matching in `calculations.ts:100–153`.

**Tasks:**

- [ ] Verify converted JSON data carries `bonus` blocks for cyberware/bioware/gear (extend `scripts/convert-xml-to-json.ts` if the converter drops them)
- [ ] On `addCyberware`: call `createImprovementsFromBonus('Cyberware', name, bonus, rating)`; same for children added via `addChildCyberware`
- [ ] On `addBioware`: source `'Bioware'`
- [ ] On `addGear` / `addGearToGear`: source `'Gear'`
- [ ] On removal of each: `removeImprovements(source, name)` — including recursive removal of children's improvements
- [ ] Delete the legacy hardcoded initiative name-matching (`calculateInitiativeBonus`, `calculations.ts:126–153`; base dice string-matching `:100–116`) once improvements cover it
- [ ] Tests: Wired Reflexes 2 → +2 Reaction improvement + 2 InitiativePass; removing it removes both

**Acceptance Criteria:**

- Adding cyberware/bioware/gear with bonus data creates typed improvements; removing cleans them up (children included)
- Initiative/reaction for a Wired Reflexes character matches desktop with no string matching in `calculations.ts`
- All 531 existing tests still pass

---

### Issue #63: Create improvements from magic/resonance sources (powers, metatype, metamagic, echoes)

**Labels:** `epic:engine2`, `priority:critical`

**Description:**
`addPower` (`magic.ts:203`), `setMetatype` (`creation.ts:181`), `learnMetamagic` (`magic.ts:359`), and `learnEcho` (`technomancer.ts:101`) create no improvements. Adept powers (Improved Reflexes, Improved Ability), metatype bonuses (e.g., dwarf pathogen resistance, troll reach/armor), metamagics, and echoes all carry bonus data in desktop.

**Tasks:**

- [ ] `addPower`: source `'Power'`, scale by power level/rating where applicable
- [ ] `setMetatype`: source `'Metatype'` / `'Metavariant'`; remove previous metatype's improvements when switching
- [ ] `learnMetamagic`: source `'Metamagic'`; `learnEcho`: source `'Echo'`
- [ ] Removal paths for each
- [ ] Verify power/metatype JSON carries bonus data through the converter
- [ ] Tests: Improved Reflexes 2 adept mirrors Wired Reflexes semantics (uniqueName grouping must prevent stacking with cyberware per SR4 rules)

**Acceptance Criteria:**

- Each source creates and removes improvements symmetrically
- uniqueName grouping prevents illegal initiative-enhancer stacking (highest applies)
- Metatype switch leaves no orphaned improvements

---

### Issue #64: Align improvement producer/consumer type mismatches

**Labels:** `epic:engine2`, `priority:critical`, `bug`

**Description:**
The bonus parser (`improvementManager.ts:185–227`) and the calculators (`calculations.ts`) disagree on types. Parser emits `ConditionMonitor`; calculators read `PhysicalCM`/`StunCM` — so a Toughness quality creates a dead improvement today. Produced-but-never-consumed: `Skill`, `SkillGroup`, `SkillCategory`, `Memory`→(missing), `MovementPercent`, `DamageResistance`, `Notoriety`. Consumed-but-never-produced: `Memory`, `BallisticArmor`, `ImpactArmor`, `PhysicalCM`, `StunCM`, `CMOverflow`. Only 6 of 89 types flow end-to-end.

**Tasks:**

- [ ] Map bonus keys to the types calculators actually read: `physicalcm`/`toughness` → `PhysicalCM`, `stuncm` → `StunCM`, split `conditionmonitor` per desktop semantics (check `clsImprovement.cs` bonus-node handling for `conditionmonitor` children `physical`/`stun`/`threshold`/`overflow`)
- [ ] Add parser production for: `BallisticArmor`, `ImpactArmor`, `Memory`, `CMOverflow`, `CMThreshold`, `CMThresholdOffset`
- [ ] Add consumers for parser-produced types that lack them: `DamageResistance` (damage soak pool), `Notoriety` (reputation), `MovementPercent` (see #70)
- [ ] Build a producer/consumer matrix test: for every type the parser can emit, assert at least one calculator or store reads it (guards future drift)

**Acceptance Criteria:**

- Toughness (+1 Physical CM) changes `calculatePhysicalCM` output
- The matrix test fails if a new produced type has no consumer

---

### Issue #65: Integrate Skill/SkillGroup/SkillCategory improvements into dice pools

**Labels:** `epic:engine2`, `priority:critical`

**Description:**
`calculateDicePool` (`calculations.ts:219–238`) uses `skill.rating + attribute + skill.bonus` and never consults improvements. Desktop: every skill test aggregates `ValueOf(Skill, name)` + group + category improvements, with `AddToRating` distinguishing rating-modifying bonuses (which respect caps and affect defaulting) from plain dice-pool bonuses (`clsImprovement.cs:891`).

**Tasks:**

- [ ] `calculateDicePool` adds `valueOf(imps, 'Skill', skillName)` + `valueOf(imps, 'SkillGroup', groupName)` + `valueOf(imps, 'SkillCategory', category)`
- [ ] Implement `addToRating` semantics in `valueOf` (new parameter, mirroring desktop's `blnAddToRating`): rating-adds count toward the modified rating; pool-adds do not
- [ ] Implement `exclude` filtering (e.g., "+1 to all Combat skills except Dodge")
- [ ] Deprecate the ad-hoc `skill.bonus` field or repopulate it from improvements for display
- [ ] Tests: skill-boosting quality, group bonus, category bonus with exclude, addToRating vs pool distinction

**Acceptance Criteria:**

- Skill dice pools match desktop for characters with skill-affecting qualities/gear
- `exclude` and `addToRating` behave per desktop semantics

---

### Issue #66: Implement rating scaling and remaining valueOf semantics

**Labels:** `epic:engine2`, `priority:high`

**Description:**
`createImprovementsFromBonus` receives `rating` but never applies it — the comment at `improvementManager.ts:45–50` explicitly punts. Desktop bonus nodes contain `Rating`-relative formulas (e.g., value = rating × 1). Also missing: `Text` improvements, min/max/aug/augMax flows into attribute limits.

**Tasks:**

- [ ] Support rating-scaled bonus values (desktop pattern: `<bonus><reach>Rating</reach></bonus>` etc.) in the parser
- [ ] Wire `min`/`max`/`aug`/`augMax` sums into `getAttributeTotal` limits (augmented max = base max + `valueOf(..., 'aug')` etc.)
- [ ] Cover `propertyToSum` variants with tests (currently untested)
- [ ] Decide and document: transactions (Commit/Rollback) — recommend NOT porting; the immutable-store `{success,error}` pattern already gives atomicity per mutation. Record in `.claude/ArchitectureDecisions.md`

**Acceptance Criteria:**

- Rating-2 cyberware with rating-scaled bonus yields value 2 improvements; upgrading rating updates them
- Attribute augmented maxima reflect improvement min/max/aug fields

---

### Issue #67: Wire Uneducated/Uncouth/Infirm into skill costs

**Labels:** `epic:engine2`, `priority:high`

**Description:**
These qualities create improvements (`improvementManager.ts:217–219`) but nothing consumes them — `utils/qualities.ts:320–337` renders display text only. Per SR4: Uneducated doubles Technical/Academic/Professional skill costs and forbids defaulting; Uncouth doubles Social; Infirm doubles Physical. `SKILL_BP_PER_POINT = 4` is applied flat (`character.ts:796`). The exporter also hardcodes `<uneducated>False</uneducated>` (`exporter.ts:75–77`).

**Tasks:**

- [ ] Skill BP/karma cost functions check `valueOf(imps, 'Uneducated'|'Uncouth'|'Infirm') > 0` and double the affected categories
- [ ] Block defaulting on affected skill categories where SR4 requires it
- [ ] Exporter writes the real flag state
- [ ] Tests per flag with an affected and an unaffected skill

**Acceptance Criteria:**

- BP totals for an Uneducated character match desktop
- Exported XML carries correct flags

---

### Issue #68: Expand bonus parser toward full desktop CreateImprovements coverage

**Labels:** `epic:engine2`, `priority:high`

**Description:**
The parser handles ~31 of 89 types. Desktop `CreateImprovements` (`clsImprovement.cs:1133–2460`) handles every bonus node. Port the remainder in priority order, driven by which bonus keys actually appear in the converted JSON data (survey first — don't implement types no data uses).

**Tasks:**

- [ ] Script: scan all `static/data/*.json` for distinct `bonus` keys; produce frequency list
- [ ] Implement all keys that appear in data, mapping to canonical types (§7 of the analysis) — expected significant: `WeaponCategoryDV`, `Smartlink`, `EnhancedArticulation`, `Adapsin`, `SoftWeave`, `ArmorEncumbrancePenalty`, `MatrixInitiative*`, `LivingPersona*`, `AdeptPowerPoints`, `FreeSpiritPowerPoints`, `SpellCategory`, `DrainResistance` variants, `Concealability`, `ThrowRange`/`ThrowSTR`, `SkillsoftAccess`, `SwapSkillAttribute`, `SkillAttribute`, `EssenceMax`, `CyborgEssence`, `IgnoreCMPenalty*`, `SelectWeapon`, `BlackMarketDiscount`
- [ ] For "select" prompts (selectattribute, selecttext, selectweapon), extend the existing selection-callback pattern used by `selectattribute`
- [ ] One test per implemented key (data-driven table test acceptable)

**Acceptance Criteria:**

- Every bonus key present in shipped JSON data creates correct improvements
- Unknown keys log a console warning (no silent drops)

---

### Issue #69: Remove dead engine/improvements.ts and resolve type collision

**Labels:** `epic:engine2`, `priority:medium`, `cleanup`

**Description:**
`engine/improvements.ts` (575 lines) has zero consumers but is re-exported by `engine/index.ts:57–72`, colliding with the new `Improvement`/`ImprovementSource` types from `types/index.ts:28`.

**Tasks:**

- [ ] Delete `src/lib/engine/improvements.ts`
- [ ] Remove its re-exports from `engine/index.ts`
- [ ] `npm run check` + full test run

**Acceptance Criteria:**

- Single `Improvement` type in the codebase; build and tests green

---

### Issue #70: Wire movement, limits, and defense calculations to improvements

**Labels:** `epic:engine2`, `priority:medium`

**Description:**
Not yet consuming improvements: `calculateWalkSpeed`/`calculateRunSpeed` (`calculations.ts:160–169`, pure AGI×2/×4 ignoring metatype and `MovementPercent`), `calculateSprintBonus` (`:172–179`, hardcoded metatype strings), physical/mental/social limits (`:186–207`), `calculateDefense`/`calculateDodge` (`:261–267`). Desktop: Movement = metatype base × movement% improvements (incl. Swim/Fly percent and FlySpeed).

**Tasks:**

- [ ] Movement uses metatype movement data (`Metatype.movement`, `character.ts:29`) × (1 + `MovementPercent`/100); same for `SwimPercent`, `FlyPercent`, `FlySpeed`
- [ ] Defense/dodge add relevant improvements (dodge skill bonuses arrive via #65)
- [ ] Remove hardcoded metatype string matching in sprint bonus, use metatype data
- [ ] Tests vs desktop values for human/dwarf/troll

**Acceptance Criteria:**

- Movement matches desktop per metatype, with and without movement-modifying qualities

---

### Issue #71: Store→calculation integration test suite

**Labels:** `epic:engine2`, `priority:high`, `testing`

**Description:**
Unit tests cover `valueOf` and manual `char.improvements` construction, but nothing proves the full chain: store mutation → improvement creation → calculation change. This is the parity-regression net for the whole epic.

**Tasks:**

- [ ] Build 5–10 "golden characters" in tests via store mutations only (street samurai with Wired Reflexes + Smartlink; adept with Improved Reflexes; Toughness/Will-to-Live quality user; troll with metatype bonuses; technomancer)
- [ ] Assert full derived-stat blocks against values computed from desktop Chummer for the same builds (document the desktop values in test comments with build recipe)
- [ ] Run in CI once #104 lands

**Acceptance Criteria:**

- Each golden character's CM/initiative/pools/armor/limits match documented desktop values

---

## Epic: Equipment Hierarchy Completion (Phase 17)

### Issue #72: Weapon accessories and modifications

**Labels:** `epic:equipment2`, `priority:high`

**Description:**
`WeaponAccessory` and `WeaponMod` types exist (`types/equipment.ts:86–101`) but no store functions, no UI, no XML support — weapons always have empty arrays. Desktop: Weapon → Accessories (with mount points + nested Gear) and Mods (slots). Accessory/mod bonuses (Smartgun System → `Smartlink`) must create improvements (#62).

**Tasks:**

- [ ] Store: `addWeaponAccessory`/`removeWeaponAccessory`, `addWeaponMod`/`removeWeaponMod` with mount/slot validation and nuyen deduction
- [ ] Extend accessory type with nested `gear` (desktop `WeaponAccessory` has a Gear list)
- [ ] UI: accessory/mod pickers in the weapon detail panel of `EquipmentSelector.svelte`
- [ ] Cost aggregation includes accessories, mods, and their gear (coordinates with #78)
- [ ] XML export/import of `<accessories>`/`<weaponmods>` (coordinates with #80/#81)
- [ ] Data: verify weapons.json carries accessory/mod catalogs; extend converter if not
- [ ] Tests: add/remove, slot limits, cost effects

**Acceptance Criteria:**

- Smartgun-equipped weapon shows dice-pool bonus via improvements
- Accessories survive XML round-trip

---

### Issue #73: Armor modifications and armor-mounted gear

**Labels:** `epic:equipment2`, `priority:high`

**Description:**
`CharacterArmor.modifications` exists in type only — no `addArmorMod` function anywhere, so mods can never be populated. Armor→Gear (desktop `Armor` has a Gear list) is not modeled at all. Armor capacity fields exist (`types/equipment.ts:138`) but are never enforced.

**Tasks:**

- [ ] Store: `addArmorMod`/`removeArmorMod` with capacity check (armor rating capacity per SR4)
- [ ] Add `gear: readonly CharacterGear[]` to `CharacterArmor`; `addGearToArmor`/`removeGearFromArmor`
- [ ] Armor value calculations include mod bonuses (ballistic/impact per mod)
- [ ] Mods with bonus data create improvements (e.g., nonconductivity)
- [ ] UI in armor detail panel
- [ ] XML `<armormods>` + nested gear round-trip
- [ ] Tests incl. capacity rejection

**Acceptance Criteria:**

- Armor with mods computes correct B/I values; capacity enforced; round-trips through XML

---

### Issue #74: Vehicle modifications, vehicle gear, and XML round-trip

**Labels:** `epic:equipment2`, `priority:high`

**Description:**
Vehicles are the weakest area: `VehicleMod` type exists but no add function (though `removeVehicle` refunds mod costs it can never have); `vehicle.gear` is type-only; and **vehicles are dropped entirely on XML export** (`exporter.ts:336`) and never imported (`importer.ts:191`). Desktop hierarchy: Vehicle → Mods (which contain Weapons and Cyberware) → Weapons → Accessories → Gear.

**Tasks:**

- [ ] Store: `addVehicleMod`/`removeVehicleMod` (slot validation vs vehicle body), `addGearToVehicle`/`removeGearFromVehicle`
- [ ] Weapon-mount semantics: weapons attach to mounts (mods), not the bare vehicle — migrate `addWeaponToVehicle` (`equipment.ts:581–622`) or document simplification
- [ ] UI: vehicle detail panel gains mod/gear pickers alongside the existing Mount Weapon
- [ ] XML: full vehicle serialization (stats, mods, weapons w/ accessories, gear) in exporter + importer
- [ ] Cost aggregation includes all vehicle contents (#78)
- [ ] Tests: nested vehicle hierarchy round-trip

**Acceptance Criteria:**

- A rigger's drone with weapon mount + mounted weapon + sensor gear survives XML round-trip
- Vehicle purchases count against the nuyen budget correctly

---

### Issue #75: Deep nesting recursion + fix child-cyberware removal defect

**Labels:** `epic:equipment2`, `priority:high`, `bug`

**Description:**
`addChildCyberware`/`removeChildCyberware` (`stores/equipment.ts:346–435`) and `addGearToGear`/`removeGearFromGear` (`:995–1060`) only map top-level parents — grandchildren are unreachable (desktop nesting is arbitrary-depth). Separately, the UI removes a selected *child* cyberware by calling top-level `removeCyberware(cyber.id)` which silently fails (`EquipmentSelector.svelte:756–758` — the comment admits it).

**Tasks:**

- [ ] Recursive tree-walk helpers: `findCyberwareById`, `updateCyberwareTree`, equivalents for gear (immutably rebuild the path to the mutated node)
- [ ] `addChildCyberware`/`removeChildCyberware` work at any depth; same for gear
- [ ] UI dispatches child removal to `removeChildCyberware` with the correct parent
- [ ] Improvement cleanup recurses (child of removed parent loses its improvements too — coordinates with #62)
- [ ] Tests: 3-level nesting (cyberarm → cyberhand → fingertip compartment), removal at each level

**Acceptance Criteria:**

- Grandchild add/remove works from store and UI; essence and improvements stay consistent

---

### Issue #76: Unify the two gear nesting models

**Labels:** `epic:equipment2`, `priority:medium`, `refactor`

**Description:**
Gear has two coexisting nesting mechanisms: the `children[]` tree (`types/equipment.ts:426`, used by XML) and the flat `containerId`/`containedItems` model with capacity (`:415–424`, used by `addGear`/`moveGearToContainer` with enforcement at `stores/equipment.ts:802–805`). They don't interoperate: `addGearToGear` bypasses capacity; XML ignores containers (`importer.ts:587–590` hardcodes container fields to zero).

**Tasks:**

- [ ] Decide on the `children[]` tree as canonical (matches desktop + XML)
- [ ] Move capacity enforcement into the tree path (`addGearToGear` checks capacity)
- [ ] Migrate `moveGearToContainer` semantics onto the tree; delete `containerId`/`containedItems` fields
- [ ] Migration for persisted Firestore characters using container fields
- [ ] Update tests

**Acceptance Criteria:**

- One nesting model; capacity enforced on it; old saves still load

---

### Issue #77: Capacity enforcement for cyberware and armor containers

**Labels:** `epic:equipment2`, `priority:medium`

**Description:**
Cyberware `capacity`/`capacityUsed` fields exist (`types/equipment.ts:217–218`) but `addChildCyberware` checks essence, not parent capacity (admitted in comment at `stores/equipment.ts:368`). Per SR4, items installed *in* a cyberlimb consume capacity instead of essence. Armor capacity is likewise unenforced (#73 covers armor).

**Tasks:**

- [ ] Child cyberware in a capacity-bearing parent consumes capacity, not essence (SR4 cyberlimb rules — items with `[capacity]` cost notation)
- [ ] Reject installs exceeding remaining capacity
- [ ] Data: ensure converter preserves capacity notation from cyberware.xml
- [ ] Tests: cyberlimb with capacity-consuming children; essence unchanged; over-capacity rejected

**Acceptance Criteria:**

- Cyberlimb subsystem installs match desktop essence/capacity accounting

---

### Issue #78: Recursive cost aggregation

**Labels:** `epic:equipment2`, `priority:high`, `bug`

**Description:**
`calculateEquipmentSpent` (`stores/equipment.ts:63–75`) — which feeds the **live nuyen budget** via `setResourcesBP` — sums only top-level weapons/armor/cyberware/gear/lifestyle: it ignores children, accessories, mods, bioware, vehicles, and foci. `calculateEquipmentCost` (`types/equipment.ts:518–566`) is similarly partial. Nested purchases are currently free from the budget's perspective.

**Tasks:**

- [ ] Single recursive cost function covering: weapons (+accessories+mods+their gear), armor (+mods+gear), cyberware tree (grade multipliers at each level), bioware, gear tree (×quantity), vehicles (+mods+weapons+gear), foci, lifestyle
- [ ] `calculateEquipmentSpent` and `calculateEquipmentCost` both delegate to it (or merge them)
- [ ] Tests: nested purchase reduces remaining nuyen by the full recursive amount

**Acceptance Criteria:**

- Budget matches desktop for a character with nested equipment
- No double-counting (children bought via parent flows aren't also counted top-level)

---

### Issue #79: Commlink specialization and matrix attributes

**Labels:** `epic:equipment2`, `priority:medium`

**Description:**
Commlinks are plain gear — only category strings exist (`types/equipment.ts:370–375`). Desktop `Commlink extends Gear` with Response/Signal/Firewall/System and a Programs list (`clsEquipment.cs:11931`). Matrix initiative (`calculations.ts:363`) reads `LivingPersona*`/`MatrixInitiative` improvements but a mundane decker's commlink stats have nowhere to live.

**Tasks:**

- [ ] Add optional matrix fields to `CharacterGear`: `response`, `signal`, `firewall`, `system`, `deviceRating` (populated for commlink/OS categories)
- [ ] Programs load into commlinks as child gear (nesting from #76) with active/loaded state
- [ ] Converter carries matrix stats from gear.xml
- [ ] Matrix initiative calculation uses the active commlink's Response (desktop: INT + Response + improvements)
- [ ] UI: commlink detail shows matrix attributes and loaded programs

**Acceptance Criteria:**

- Decker with commlink shows correct matrix initiative; programs nest inside the commlink

---

## Epic: XML Compatibility Fidelity (Phase 18)

### Issue #80: Export all character sections (stop emitting empty elements)

**Labels:** `epic:xml2`, `priority:high`

**Description:**
`exporter.ts:324–336` hardcodes empty elements for improvements, expenses, metamagics, arts, spirits, complex forms, martial arts, programs, vehicles, bioware, critter powers — dropping real character data. Also hardcoded: `<avail>0</avail>` everywhere, `<movement>10/25, Swim 5</movement>` (`:25`), `<mugshot />` (`:30`), Uneducated/Uncouth/Infirm flags (`:75–77`).

**Tasks:**

- [ ] Export bioware (mirror cyberware structure)
- [ ] Export vehicles with full hierarchy (depends on #74)
- [ ] Export metamagics, spirits, complex forms, martial arts, expenses, improvements per desktop `Save()` format (reference the desktop `Save(XmlTextWriter)` methods per class)
- [ ] Preserve real `avail` values on all items (requires avail retained through the model — check types carry it)
- [ ] Real movement/flags; mugshot once #102 lands
- [ ] Round-trip tests per section

**Acceptance Criteria:**

- Exporting a fully-loaded character and re-importing loses no supported section
- Desktop Chummer opens the exported file without errors

---

### Issue #81: Import all character sections

**Labels:** `epic:xml2`, `priority:high`

**Description:**
`importer.ts` hardcodes empty: bioware, vehicles, foci, martial arts (`:190–193`), metamagics (`:672`); spirits, complex-form details, and expenses are unparsed. Desktop `.chum` files with these sections silently lose data.

**Tasks:**

- [ ] Parse bioware, vehicles (full hierarchy), metamagics, spirits, complex forms, martial arts, foci, expenses
- [ ] Re-derive improvements on import: either parse `<improvements>` or (preferred, matching desktop's re-creation approach) re-run `createImprovementsFromBonus` from imported items' bonus data
- [ ] Fixture tests using real desktop-generated `.chum` files exercising every section (store fixtures under `src/lib/xml/__tests__/fixtures/`)

**Acceptance Criteria:**

- A desktop character with bioware + vehicle + initiation + martial art imports completely
- Derived stats after import match desktop's displayed values (via #71 goldens)

---

### Issue #82: Availability and metadata fidelity in the data model

**Labels:** `epic:xml2`, `priority:medium`

**Description:**
Item availability is discarded at purchase time (types don't consistently carry `avail`), forcing the exporter's `<avail>0</avail>` hardcoding and making #93 (availability enforcement) impossible. Same for item `source`/`page` on some owned-item types.

**Tasks:**

- [ ] Audit owned-item types (`CharacterWeapon`, `CharacterArmor`, `CharacterGear`, `CharacterCyberware`, …) for `avail`, `source`, `page`; add where missing
- [ ] Populate at purchase time from game data
- [ ] Exporter writes real values; importer parses them
- [ ] Migration default for existing saves (avail `0` acceptable fallback)

**Acceptance Criteria:**

- Owned items carry avail/source/page end-to-end; exporter hardcodings removed

---

### Issue #83: Desktop round-trip validation suite

**Labels:** `epic:xml2`, `priority:medium`, `testing`

**Description:**
No systematic proof that import → export preserves desktop files. Needed as the regression net for #80–#82.

**Tasks:**

- [ ] Collect 5+ desktop-generated `.chum` fixtures spanning archetypes (street sam, mage w/ initiation, technomancer, rigger, face)
- [ ] Test: import → export → structural diff (normalized XML comparison; whitelist known-acceptable differences and document each)
- [ ] Assert derived stats post-import match desktop values recorded in fixture metadata

**Acceptance Criteria:**

- Round-trip diff whitelist is empty or every entry is documented and justified

---

## Epic: Magic & Resonance Depth (Phase 19)

### Issue #84: Structured initiation grades with ordeal/group/schooling discounts

**Labels:** `epic:magic2`, `priority:high`

**Description:**
`initiateGrade` is a bare number (`character.ts:244`); desktop keeps `_lstInitiationGrades` of Grade objects {grade, ordeal, group, technomancer} (`clsUnique.cs:8074–8293`). Karma cost (`career.ts:559–565`) ignores the SR4 discounts (group −10%, ordeal −10%, schooling −10%). Note: uncommitted work has started here — svelte-check shows an `initiations` field and read-only `initiateGrade` assignment errors; finish or align with that work (#99 first).

**Tasks:**

- [ ] `InitiationGrade` type: `{ grade, ordeal, group, schooling, isTechnomancer }`; `magic.initiations: InitiationGrade[]` (and resonance equivalent for submersion)
- [ ] Karma cost: `(10 + grade × 3) × (1 − 0.1×[group] − 0.1×[ordeal] − 0.1×[schooling])` per SR4/Street Magic
- [ ] Keep `initiateGrade` as derived count for backward compat; migrate existing saves
- [ ] UI: initiation dialog captures ordeal/group/schooling checkboxes (career `CareerAdvancement.svelte` Magic tab)
- [ ] Metamagic slots derive from grade list length
- [ ] XML export/import of grade list (desktop `<initiationgrades>`)
- [ ] Tests: cost matrix with all discount combinations

**Acceptance Criteria:**

- Initiation karma costs match desktop for each discount combination
- Grade history visible and exported

---

### Issue #85: Complete the foci system

**Labels:** `epic:magic2`, `priority:high`

**Description:**
Foci exist but: `bondFocus` (`magic.ts:413–487`) only flips `bonded: true` — the declared `CharacterFocus.improvements` array is never populated and no calculation reads focus improvements; costs are hardcoded (`FociSelector.svelte:43–44`: `10000`/`25000` multipliers) instead of using gear data; `StackedFocus` type (`types/equipment.ts:494–498`) is dead code; no career-mode foci panel.

**Tasks:**

- [ ] Foci as gear: source focus items from `gear.json` (Foci category) with real cost formulas per force
- [ ] `bondFocus` creates improvements per focus type (power focus → MAG-linked pools; weapon focus → weapon dice; spellcasting focus → `SpellCategory`) using bonding karma cost (already in `getFocusKarmaCost`)
- [ ] `unbondFocus` removes them
- [ ] Implement `stackFoci`/`unstackFoci` with `StackedFocus` (bonded stack acts as single focus, combined force, per Street Magic)
- [ ] Foci management panel in career mode (`CareerAdvancement.svelte` Magic tab)
- [ ] Validation: bonded foci force sum ≤ MAG×5 (SR4 focus addiction limit)
- [ ] XML export/import of foci + stacked foci
- [ ] Tests: bond/unbond improvement lifecycle, stacking, force cap

**Acceptance Criteria:**

- Bonded power focus raises the relevant pools; unbonding reverts
- Focus purchase uses real gear costs

---

### Issue #86: Creation-time initiation and metamagic UI

**Labels:** `epic:magic2`, `priority:medium`

**Description:**
Metamagic selection exists only in career mode (`CareerAdvancement.svelte:537–571`); `MagicSelector.svelte` has no initiation/metamagic controls. Desktop allows initiation at chargen (BP/karma cost). Same for submersion/echoes at chargen.

**Tasks:**

- [ ] Initiation section in `MagicSelector.svelte` (visible for magicians/adepts, gated by build rules) with BP/karma cost line
- [ ] Metamagic picker per grade at creation; echo picker in the technomancer flow
- [ ] BP/karma validation integration
- [ ] Tests for creation-time initiation cost

**Acceptance Criteria:**

- A starting initiate grade 1 with one metamagic can be built entirely in the wizard, costs matching desktop

---

### Issue #87: Complex form ratings and career improvement

**Labels:** `epic:magic2`, `priority:medium`

**Description:**
Complex forms are created at rating 1 (`technomancer.ts:56`, `career.ts:672`) with no way to raise rating; `IMPROVE_COMPLEX_FORM_MULTIPLIER` (`career.ts:33`) is declared but unused. Desktop supports rating purchases and program options.

**Tasks:**

- [ ] Creation: choose rating (≤ RES), BP cost = 5/form per SR4 (verify vs desktop for rating interaction)
- [ ] Career: `improveComplexForm` using the multiplier; wire into the technomancer tab of `CareerAdvancement.svelte`
- [ ] Program options from desktop `TechProgramOption` model if present in `programs.json` — survey data first; skip with documented rationale if data lacks options
- [ ] Tests: rating costs at creation and career

**Acceptance Criteria:**

- Complex form ratings purchasable and improvable with desktop-matching costs

---

## Epic: Career Mode Completion (Phase 20)

### Issue #88: Expense undo system

**Labels:** `epic:career2`, `priority:high`

**Description:**
The expense log is append-only (`career.ts:98–121`). Desktop `ExpenseUndo` (`clsExpenses.cs`) records what was purchased (type + object id) so career purchases can be reverted — refund karma/nuyen AND remove the purchased object + its improvements.

**Tasks:**

- [ ] Extend `ExpenseEntry` with `undo?: { kind: 'skill'|'attribute'|'spell'|'gear'|'cyberware'|…; objectId: string; previousValue?: number }`
- [ ] Populate on every career mutation (improveAttribute, improveSkill, learnSpell, equipment purchases, initiation…)
- [ ] `undoExpense(entryId)`: refund, revert the object change, remove associated improvements; only the most recent entry per object safely undoable (match desktop restriction)
- [ ] UI: undo button in the History tab (`CareerAdvancement.svelte:813–838`) with confirmation
- [ ] Tests: undo each expense kind; verify improvements cleanup

**Acceptance Criteria:**

- Undoing a career cyberware purchase restores nuyen, essence, and removes its improvements

---

### Issue #89: Calendar and in-game time tracking

**Labels:** `epic:career2`, `priority:low`

**Description:**
Expenses stamp real-world `new Date()` (`career.ts:101`). Desktop tracks an in-game calendar; lifestyle upkeep (#91) needs it.

**Tasks:**

- [ ] `character.calendar: { currentDate: string; entries: CalendarEntry[] }` (in-game date, default 2070s per SR4)
- [ ] `advanceTime(days)` store function; expense entries record the in-game date alongside real date
- [ ] Simple calendar UI in career mode
- [ ] XML `<calendar>` export/import

**Acceptance Criteria:**

- Expenses show in-game dates; time can be advanced

---

### Issue #90: Street cred derivation

**Labels:** `epic:career2`, `priority:low`

**Description:**
Street cred is stored-only, default 0 (`character.ts:445`). Desktop: `CalculatedStreetCred = floor(CareerKarma / 10) + manual`; notoriety also gains from `Notoriety` improvements (produced by the parser today but unconsumed).

**Tasks:**

- [ ] `calculateStreetCred(char)` in `calculations.ts`: `floor(totalKarmaEarned / 10) + manualModifier`
- [ ] Notoriety adds `valueOf(imps, 'Notoriety')`
- [ ] Public awareness = floor((streetCred + notoriety) / 3) per SR4
- [ ] Display derived values in `CareerAdvancement.svelte:433` / `CareerPanel.svelte:207`
- [ ] Tests

**Acceptance Criteria:**

- Reputation values derive live from career karma and improvements

---

### Issue #91: Lifestyle upkeep in career mode

**Labels:** `epic:career2`, `priority:medium`

**Description:**
Lifestyle is a one-time creation cost (`types/equipment.ts:554–556`); no monthly deduction exists in `career.ts`. Depends on #89 for time. Note in-flight work adds `modules` to `CharacterLifestyle` (svelte-check error) — align with it.

**Tasks:**

- [ ] `payLifestyle(months)` career function: deduct `monthlyCost × months`, extend `monthsPrepaid`, log expense
- [ ] On `advanceTime`, warn when prepaid months lapse
- [ ] Support multiple lifestyles (desktop allows several) — change `equipment.lifestyle` to an array with migration
- [ ] UI in career mode
- [ ] Tests

**Acceptance Criteria:**

- Monthly rent flows through the expense log; lapse warnings appear

---

### Issue #92: Career-mode equipment purchasing

**Labels:** `epic:career2`, `priority:medium`

**Description:**
Career advancement covers attributes/skills/magic/spirits/sprites only — no way to buy gear after creation. Desktop career mode supports full purchasing with expense logging and avail-vs-connection checks.

**Tasks:**

- [ ] Reuse `EquipmentSelector` flows in career mode with nuyen (not BP-budget) accounting and expense entries (undo via #88)
- [ ] Availability in career: purchases above avail threshold require time/rolls per SR4 — implement the simple gate (block or warn), document the house-rule simplification
- [ ] Sell-back at 30% (desktop default) with expense entry
- [ ] Tests: buy/sell in career mode with log entries

**Acceptance Criteria:**

- Career character can buy a new gun; nuyen and expense log update; undo works

---

## Epic: Rules Enforcement & Settings (Phase 21)

### Issue #93: Enforce maximum availability at creation

**Labels:** `epic:rules`, `priority:high`

**Description:**
`maxAvailability` (default 12) exists in `appSettings.ts:22` and `character.ts:339` but nothing enforces it — `validation.ts:422–423` is an explicit no-op. Depends on #82 (items must carry avail).

**Tasks:**

- [ ] Parse avail strings (e.g., `"12F"`, `"6R"`, rating-scaled `"Rating×3"`) into `{ value, restriction }` — utility with tests
- [ ] Purchase functions reject items with avail > cap during creation (career mode: see #92)
- [ ] Validation function reports violating items (replace the no-op)
- [ ] Selector UI greys out/filters unavailable items with a toggle
- [ ] Respect `RestrictedItemCount` improvements (Restricted Gear quality allows N above-cap items)

**Acceptance Criteria:**

- Avail 20 gear cannot be added at creation with cap 12, unless Restricted Gear budget allows

---

### Issue #94: Wire sourcebook filtering into game data queries

**Labels:** `epic:rules`, `priority:medium`

**Description:**
`enabledSourcebooks` exists in settings and the `/settings` page toggles it, but no gamedata selector respects it — `gamedata.ts` derived stores and finders ignore item `source`. Desktop filters every picker via `BookXPath()`.

**Tasks:**

- [ ] Central `filterBySources<T extends { source?: string }>(items, enabledBooks)` helper
- [ ] Apply in all derived stores / query functions in `gamedata.ts` (weapons, gear, qualities, spells, powers, cyberware, bioware, metatypes, …)
- [ ] Default: all books enabled (preserve current behavior)
- [ ] Guard: items already on a character remain even if their book is later disabled (match desktop)
- [ ] Tests: disabled book removes its items from pickers

**Acceptance Criteria:**

- Disabling Arsenal hides Arsenal weapons from selectors without breaking existing characters

---

### Issue #95: House rules (CharacterOptions port)

**Labels:** `epic:rules`, `priority:medium`

**Description:**
Desktop `CharacterOptions` (`clsOptions.cs`, 3,977 lines) has 100+ per-character option flags plus configurable BP/karma costs. Web has 4 character defaults. Port the impactful subset, not all 100.

**Tasks:**

- [ ] Survey desktop options; select the ~15 highest-impact (suggested: ignore rules with max avail, free contacts multiplier, knowledge points formula, karma cost table overrides, essence loss reduces max only, no armor encumbrance, metatype BP costs table, capacity house rules)
- [ ] `CharacterSettings` interface stored **on the character** (not just app settings) so shared/exported characters keep their rules
- [ ] Cost/validation functions read from settings instead of constants (BP_PER_ATTRIBUTE_POINT etc. become defaults)
- [ ] Settings section in `/settings` + per-character override in the wizard
- [ ] XML `<settings>` block export/import (desktop stores the setting file name; embed values instead — document divergence)
- [ ] Tests: changed karma-cost option affects career costs

**Acceptance Criteria:**

- A house-ruled character keeps its rules through save/load/export

---

### Issue #96: Restricted/forbidden gear handling

**Labels:** `epic:rules`, `priority:low`

**Description:**
Avail suffixes R (restricted) and F (forbidden) have licensing/legality implications; desktop tracks them and the Restricted Gear quality interacts with the creation cap (#93). Fake licenses/SINs exist as gear.

**Tasks:**

- [ ] Surface restriction status on owned items (badge in equipment lists / character sheet)
- [ ] Character sheet legality summary (items needing licenses)
- [ ] Link fake-license gear to restricted items (informational)

**Acceptance Criteria:**

- Restricted/forbidden items visibly flagged on sheet and lists

---

## Epic: Content Depth (Phase 22)

### Issue #97: Lifestyle data expansion

**Labels:** `epic:content`, `priority:low`

**Description:**
`lifestyles.json` has only 8 base entries (989 bytes); desktop `lifestyles.xml` includes advanced lifestyles (Bolt Hole/Safehouse types) and lifestyle qualities from Runner's Companion. `CharacterLifestyle` also lacks the desktop `type` field.

**Tasks:**

- [ ] Extend converter for full lifestyles.xml incl. qualities and types
- [ ] Add `type: 'Standard'|'BoltHole'|'Safehouse'|'Advanced'` and `qualities: string[]` to `CharacterLifestyle`
- [ ] Lifestyle qualities modify monthly cost (`LifestyleCost`/`BasicLifestyleCost` improvements)
- [ ] UI for lifestyle qualities in the selector

**Acceptance Criteria:**

- Advanced lifestyle with qualities computes desktop-matching monthly cost

---

### Issue #98: Martial arts techniques and maneuvers

**Labels:** `epic:content`, `priority:low`

**Description:**
`martialarts.json` ships empty `techniques: []` arrays; no maneuver selection; advantages create no improvements. Desktop models MartialArt (rating 1–5, advantages per rating) + separate MartialArtManeuver list (`clsUnique.cs:6511–7111`). Also: `GameMartialArt` type mismatch — `types/equipment.ts:350` declares `cost` but `gamedata.ts:265` has none.

**Tasks:**

- [ ] Re-convert `martialarts.xml` including advantages and maneuvers
- [ ] Reconcile the `GameMartialArt` type mismatch
- [ ] Advantage selection per rating point (5 BP/rating, advantages = rating); maneuvers 2 BP each per SR4 Arsenal
- [ ] Advantages with bonus data create improvements (`MartialArtAdvantage` source)
- [ ] UI: advantage/maneuver pickers in the martial arts section of `EquipmentSelector.svelte:583–595`
- [ ] XML export/import (feeds #80/#81)

**Acceptance Criteria:**

- Martial art with advantages affects dice pools; maneuvers listed on the sheet

---

## Epic: Platform & Delivery (Phase 23)

### Issue #99: Stabilize the working tree (fix 10 type errors, commit in-flight work)

**Labels:** `epic:platform`, `priority:critical`

**Description:**
`svelte-check` shows 10 errors in 7 files from uncommitted, half-finished features: `initiations` on `CharacterMagic`, `modules` on `CharacterLifestyle`, `overflowCurrent` on `ConditionMonitor`, read-only assignments to `initiateGrade`/`powerPoints`/`foci`, plus unused imports. ~3,200 lines are uncommitted. Nothing else can proceed safely on a red baseline.

**Tasks:**

- [ ] Triage each error: finish the type change (add the field) or revert the usage — coordinate with #84 (initiations) and #91 (lifestyle modules)
- [ ] Fix read-only assignment violations with proper immutable updates
- [ ] `npm run check` → 0 errors; `npm run test` → green
- [ ] Commit the working tree in logical commits (equipment nesting, qualityBonuses removal, XML changes, foci work)
- [ ] Delete stray root files: `nul`, `check_output*.json/txt`, `check.log`, `svelte.log`, `svelte_check*.txt`, `ts_errors.txt`, `typescript_errors.log` (add to `.gitignore`)

**Acceptance Criteria:**

- Clean `git status`, 0 type errors, all tests green

---

### Issue #100: Firestore rules hardening and indexes file

**Labels:** `epic:platform`, `priority:high`, `security`

**Description:**
`firestore.rules` allows `write` when `resource.data.userId == request.auth.uid` but never checks that the **new** data keeps the same `userId` — an owner can reassign a document to another uid (or orphan it). `firebase.json` references `firestore.indexes.json`, which does not exist, breaking `firebase deploy`.

**Tasks:**

- [ ] Split `write` into `update, delete`; on update require `request.resource.data.userId == resource.data.userId`
- [ ] Validate required fields on create (userId, name) and reasonable size limits
- [ ] Add `firestore.indexes.json` (empty indexes array if none needed)
- [ ] Rules unit tests with the Firebase emulator (`@firebase/rules-unit-testing`)

**Acceptance Criteria:**

- Emulator tests prove: non-owner blocked, owner cannot reassign userId, deploy succeeds

---

### Issue #101: Character sharing (FR-8)

**Labels:** `epic:platform`, `priority:medium`

**Description:**
No sharing exists — no routes, no tokens, no public-read rules. Requirement FR-8 (public sharing + user-to-user); desktop's Omae equivalent is explicitly replaced by Firebase.

**Tasks:**

- [ ] `shareToken: string | null` on the character document; generating it enables public read
- [ ] Firestore rule: public read where `resource.data.shareToken != null` and token matches the queried doc (via a `sharedCharacters` mirror collection or rule on token — design in issue; avoid listability of all shared docs)
- [ ] Route `/character/shared/[token]` renders read-only `CharacterSheet`
- [ ] Share button + revoke in character list/view
- [ ] Tests: rules tests for the sharing path

**Acceptance Criteria:**

- Signed-out visitor with the link sees the read-only sheet; revoking kills the link

---

### Issue #102: Portrait/mugshot support

**Labels:** `epic:platform`, `priority:low`

**Description:**
No portrait in the type model; exporter writes empty `<mugshot />` (`exporter.ts:30`). Desktop stores a base64 image.

**Tasks:**

- [ ] `identity.mugshot: string | null` (base64 data URL, size-capped ~200KB; document Firestore 1MB doc limit rationale)
- [ ] Upload/crop UI in identity step + character sheet display
- [ ] XML `<mugshot>` base64 export/import (desktop-compatible)

**Acceptance Criteria:**

- Portrait round-trips web↔desktop

---

### Issue #103: E2E test suite (Playwright)

**Labels:** `epic:platform`, `priority:medium`, `testing`

**Description:**
`@playwright/test` is installed and `test:e2e` scripted, but there is no `playwright.config.*` and no specs — the script fails. Component-level behavior (wizard flows, selectors) is entirely untested since Svelte files are excluded from unit coverage.

**Tasks:**

- [ ] `playwright.config.ts` targeting the dev server (or preview build), Firebase emulator or mocked persistence
- [ ] Smoke specs: create BP character end-to-end through the wizard (metatype→attributes→qualities→skills→equipment→finalize); verify BP totals on each step
- [ ] Spec: import a `.chum` fixture, verify sheet values
- [ ] Spec: career advancement (spend karma on a skill, check log)

**Acceptance Criteria:**

- `npm run test:e2e` passes locally and in CI

---

### Issue #104: CI pipeline

**Labels:** `epic:platform`, `priority:high`

**Description:**
No `.github/` exists. Tests, type checks, and lint run only by hand.

**Tasks:**

- [ ] `.github/workflows/ci.yml`: install → `npm run check` → `npm run lint` (no autofix in CI) → `npm run test:unit` → `npm run test:coverage` (upload artifact) → `npm run build`
- [ ] E2E job (after #103), allowed-failure initially
- [ ] Badge in README

**Acceptance Criteria:**

- PRs and pushes to master run the pipeline; failures block

---

## Labels Reference (additions)

| Label | Description |
| --- | --- |
| `epic:engine2` | Improvement engine completion (Phase 16) |
| `epic:equipment2` | Equipment hierarchy completion (Phase 17) |
| `epic:xml2` | XML compatibility fidelity (Phase 18) |
| `epic:magic2` | Magic & resonance depth (Phase 19) |
| `epic:career2` | Career mode completion (Phase 20) |
| `epic:rules` | Rules enforcement & settings (Phase 21) |
| `epic:content` | Game content depth (Phase 22) |
| `epic:platform` | Platform & delivery (Phase 23) |

## Milestones (additions)

| Milestone | Issues | Definition of done |
| --- | --- | --- |
| M8 — Correct Stats | #99, #61–#71 | All derived values route through the improvement engine; golden characters match desktop |
| M9 — Full Equipment Model | #72–#79 | Every desktop nesting relationship representable and budget-counted |
| M10 — Lossless Round-Trip | #80–#83 | Desktop `.chum` fixtures import/export without data loss |
| M11 — Career & Magic Parity | #84–#92 | Initiation grades, foci, expense undo, lifestyle upkeep, career purchasing |
| M12 — Rules & Platform | #93–#98, #100–#104 | Availability + sourcebooks enforced; sharing, E2E, CI shipped |

---

_End of plan._

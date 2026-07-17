# ChummerWeb — Structured Implementation Plan

> This plan is designed to be followed by coding agents across multiple sessions. Each phase is self-contained with clear inputs, outputs, and verification steps.  
> **Reference docs:** `.claude/audit_report.md`, `.claude/desktop_comparison.md`, `.claude/ChummerWeb Analysis`

---

## Phase 0: Cleanup & Foundations

> **Goal:** Fix broken infrastructure, remove dead code, and establish a clean baseline before building new features.

### 0.1 — Remove Dead Dependencies and Stale Files

**What:** Remove unused packages and files cluttering the repo.

**Steps:**

1. Run `npm uninstall dexie` — it is listed in `package.json` dependencies but never imported anywhere in `src/`.
2. Delete `temp_cyberware.xml` from the project root — it is a leftover conversion artifact (133KB).
3. Delete or `.gitignore` the `nul` file at the project root — it's a 72-byte Windows artifact that can break on other OSes.

**Verify:** `npm run build` succeeds. `grep -r "dexie" src/` returns no results.

---

### 0.2 — Fix Docker Port Mismatch

**What:** The Dockerfile EXPOSEs port 5173 but the Vite dev server is configured for port 3000.

**Steps:**

1. Open `Dockerfile` (line 22). Change `EXPOSE 5173` → `EXPOSE 3000`.
2. Verify `vite.config.ts` has `server: { port: 3000 }` (it does).
3. Verify `docker-compose.yml` maps `"3000:3000"` (it does).

**Verify:** `docker compose up dev` starts correctly and is accessible on port 3000.

---

### 0.3 — Fix Deprecated Firebase API

**What:** `enableIndexedDbPersistence` is deprecated in Firebase v10. Replace with the modern API.

**Steps:**

1. Open `src/lib/firebase/config.ts`.
2. Replace the import:
   ```typescript
   // OLD
   import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
   // NEW
   import {
   	initializeFirestore,
   	persistentLocalCache,
   	persistentMultipleTabManager,
   	type Firestore
   } from 'firebase/firestore';
   ```
3. Replace the Firestore initialization:
   ```typescript
   // OLD
   db = getFirestore(app);
   enableIndexedDbPersistence(db).catch(...)
   // NEW
   db = initializeFirestore(app, {
     localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
   });
   ```
4. Remove the `.catch()` block — the new API handles persistence silently.

**Verify:** `npm run check` passes. App loads without console deprecation warnings.

---

### 0.4 — Add Zod Validation on Data Load

**What:** `loadCharacter()` in `src/lib/firebase/characters.ts` casts Firestore data with `as Character` — no runtime validation. Zod is already a dependency but unused.

**Steps:**

1. Create `src/lib/types/schemas.ts` with a Zod schema for the `Character` type. Start with the top-level fields and work inward. Use `.passthrough()` for deeply nested fields to avoid blocking on incomplete schemas.
2. In `src/lib/firebase/characters.ts`, import the schema.
3. Change `loadCharacter()`:
   ```typescript
   // OLD
   const data = charSnap.data() as Character;
   // NEW
   const parseResult = CharacterSchema.safeParse(charSnap.data());
   if (!parseResult.success) {
   	console.warn('Character data validation failed:', parseResult.error);
   	// Fall back to unvalidated cast for backwards compat
   	const data = charSnap.data() as Character;
   	return { success: true, data };
   }
   const data = parseResult.data;
   ```

**Verify:** `npm run check` passes. Loading existing characters still works (fallback path). New characters are validated.

---

## Phase 1: Split the Character Store

> **Goal:** Break `src/lib/stores/character.ts` (4,337 lines, 174 exports) into domain-specific modules without changing any behavior.

### 1.1 — Create the Store Module Structure

**What:** Create empty files for the new store modules.

**Steps:**

1. Create these files (all in `src/lib/stores/`):
   - `creation.ts` — Wizard flow, build method, metatype selection
   - `attributes.ts` — Attribute allocation, validation, BP calculation
   - `skills.ts` — Active skills, skill groups, specializations
   - `knowledgeSkills.ts` — Knowledge skills (separate because of different BP/karma logic)
   - `magic.ts` — Spells, powers, traditions, mentors, initiation, metamagics, spirits
   - `technomancer.ts` — Complex forms, submersion, echoes, sprites
   - `equipment.ts` — Weapons, armor, gear, cyberware, bioware, vehicles
   - `career.ts` — Career mode advancement, karma spending, expense log
   - `combat.ts` — Condition monitors, ammo tracking, edge management
   - `contacts.ts` — Contact CRUD and BP calculation
   - `resources.ts` — Nuyen/BP resource management

2. Each file should have a header comment explaining its scope.
3. `src/lib/stores/character.ts` remains as the **core store** — it holds the `characterStore` writable, the `character` readable, and the `Character | null` type. All other modules import from it.

---

### 1.2 — Extract Functions Module by Module

**What:** Move functions from `character.ts` to their domain modules, one module at a time. After each move, run tests.

**Extraction order** (each is an independent task):

#### 1.2a — Extract `creation.ts`

Move: `startNewCharacter`, `setBuildMethod`, `setWizardStep`, `getVisibleWizardSteps`, `nextWizardStep`, `prevWizardStep`, `setMetatype`, `setCustomBuildPoints`, `WIZARD_STEPS`, `WizardStep`, `WizardStepConfig`, `KARMA_BUILD_COSTS`
Re-export from `character.ts` index or update imports at call sites.
**Verify:** `npm run test` passes.

#### 1.2b — Extract `attributes.ts`

Move: `setAttribute`, `calculateTotalAttributeCost`, `calculateNonSpecialAttributeBP`, `isAttributeNA`, `countMaxedAttributes`, `getMaxedAttributeName`, `attributeValidation` derived store, `AttributeValidation` interface, `BP_PER_ATTRIBUTE_POINT`, `BP_FOR_MAX_ATTRIBUTE`, `ALL_ATTR_KEYS`
**Verify:** `npm run test` passes.

#### 1.2c — Extract `skills.ts`

Move: `setSkill`, `removeSkill`, `setSkillSpecialization`, `removeSkillSpecialization`, `getSkillsInGroup`, `isSkillGroupBroken`, `getEffectiveSkillRating`, `setSkillGroup`, `incrementSkillGroup`, `decrementSkillGroup`, `breakSkillGroup`, `setSkillWithGroupCheck`, `calculateSkillsBP`, `calculateSkillGroupsBP`, `calculateSpecializationsBP`, `SKILL_BP_PER_POINT`, `SKILL_GROUP_BP_PER_POINT`, `SPECIALIZATION_BP_COST`
**Verify:** `npm run test` passes.

#### 1.2d — Extract `knowledgeSkills.ts`

Move: All `*KnowledgeSkill*` functions, `calculateFreeKnowledgePoints`, `calculateKnowledgePointsSpent`, `calculateKnowledgeSkillBPCost`, `calculateKnowledgeSkillKarmaCost`, `KNOWLEDGE_SKILL_BP_COST`, `KNOWLEDGE_SKILL_KARMA_MULTIPLIER`
**Verify:** `npm run test` passes.

#### 1.2e — Extract `magic.ts`

Move: `initializeMagic`, `setTradition`, `setMentor`, `addSpell`, `removeSpell`, `addPower`, `removePower`, `getMagicType`, `magicType` derived store, `MagicType`, `addSpirit`, `removeSpirit`, `useSpiritService`, `updateSpiritServices`, `learnMetamagic`, `removeMetamagic`, `initiate`, `getInitiationCost`, `learnSpell` (career)
**Verify:** `npm run test` passes.

#### 1.2f — Extract `technomancer.ts`

Move: `submerge`, `getSubmersionCost`, `learnEcho`, `removeEcho`, `addSprite`, `removeSprite`, `useSpriteTask`, `registerSprite`, `updateSpriteTasks`, `TECHNOMANCER_QUALITIES`
**Verify:** `npm run test` passes.

#### 1.2g — Extract `contacts.ts`

Move: `addContact`, `removeContact`
**Verify:** `npm run test` passes.

#### 1.2h — Extract `combat.ts`

Move: `updateCondition`, `updateEdge`, `spendEdge`, `recoverEdge`, `refreshEdge`, `getMaxAmmo`, `spendAmmo`, `reloadWeapon`, `setAmmo`
**Verify:** `npm run test` passes.

#### 1.2i — Extract `career.ts`

Move: All career-mode advancement functions (`improveAttribute`, `improveSkill`, `learnSpell`, `spendKarma`, `earnKarma`, `spendNuyen`, `earnNuyen`, `finalizeCharacter`, `getExpenseLog`, `isCareerMode` derived store, `KARMA_COSTS`)
**Verify:** `npm run test` passes.

#### 1.2j — Extract `resources.ts` and `equipment.ts`

Move: `setResourcesBP`, `startingNuyen`, `remainingNuyen` derived stores, and all equipment functions (`addWeapon`, `removeWeapon`, `addArmor`, `removeArmor`, `addCyberware`, `removeCyberware`, `addBioware`, `removeBioware`, `addGear`, `removeGear`, `addVehicle`, `removeVehicle`, etc.)
**Verify:** `npm run test` passes.

---

### 1.3 — Update Barrel Exports

**What:** Update `src/lib/stores/index.ts` to re-export from all new modules so existing import paths still work.

**Verify:** `npm run build` succeeds. `npm run test` passes. No import errors in any `.svelte` file.

---

## Phase 2: Unified Improvement System

> **Goal:** Replace the two partial improvement systems (`engine/improvements.ts` + `stores/qualityBonuses.ts`) with a single, data-driven engine faithful to the desktop's `ImprovementManager`.

### 2.1 — Design the New Improvement System

**What:** Create the types and architecture before writing implementation.

**Create `src/lib/engine/improvementManager.ts`** with:

```typescript
// Improvement types — port all 89 from desktop's ImprovementType enum
type ImprovementType =
	| 'Attribute'
	| 'Skill'
	| 'SkillGroup'
	| 'SkillCategory'
	| 'BallisticArmor'
	| 'ImpactArmor'
	| 'Reach'
	| 'Nuyen'
	| 'Essence'
	| 'Reaction'
	| 'PhysicalCM'
	| 'StunCM'
	| 'UnarmedDV'
	| 'InitiativePass'
	| 'MatrixInitiative'
	| 'LifestyleCost'
	| 'CMThreshold'
	| 'WeaponCategoryDV'
	| 'CyberwareEssCost'
	| 'SpecialTab'
	| 'LivingPersonaResponse'
	| 'LivingPersonaSignal'
	| 'LivingPersonaFirewall'
	| 'LivingPersonaSystem'
	| 'Smartlink'
	| 'BiowareEssCost'
	| 'MovementPercent'
	| 'FreePositiveQualities'
	| 'FreeNegativeQualities'
	| 'NuyenMaxBP'
	| 'AdeptPowerPoints'
	| 'DamageResistance'
	| 'DrainResistance'
	| 'FadingResistance'
	| 'Composure'
	| 'JudgeIntentions'
	| 'Memory';
// ... remaining types from desktop enum (see desktop analysis Section 4.3)

type ImprovementSource =
	| 'Quality'
	| 'Metatype'
	| 'Cyberware'
	| 'Bioware'
	| 'Gear'
	| 'Spell'
	| 'Power'
	| 'Metamagic'
	| 'Echo'
	| 'CritterPower'
	| 'MartialArt'
	| 'ArmorMod'
	| 'WeaponAccessory';

interface Improvement {
	id: string;
	type: ImprovementType;
	source: ImprovementSource;
	sourceName: string; // e.g., "Wired Reflexes Rating 2"
	improvedName: string; // e.g., "REA" or skill name
	value: number;
	minimum: number;
	maximum: number;
	augmented: number;
	augmentedMaximum: number;
	enabled: boolean;
	uniqueName: string; // For grouping — only highest in group applies
	addToRating: boolean; // Rating bonus vs dice pool bonus
	exclude: string; // Exception to the improvement
}
```

**Key functions to implement:**

- `valueOf(char, type, improvedName?)` — sum all active improvements of a type (optionally filtered by target name)
- `createImprovementsFromBonus(source, sourceName, bonusData)` — parse bonus data and create Improvement objects
- `removeImprovements(char, source, sourceName)` — remove all improvements from a source
- `getAllImprovements(char)` — return the full list

**Storage:** Improvements are stored on the `Character` object in an `improvements: Improvement[]` array. They are created when items are added and removed when items are removed.

---

### 2.2 — Implement Core ImprovementManager

**What:** Implement `valueOf()` and the improvement creation/removal functions.

**Steps:**

1. Implement `valueOf(improvements, type, improvedName?)` — iterates `improvements[]`, filters by type (and optionally by `improvedName`), handles `uniqueName` grouping (only highest value in a group applies), sums values.
2. Implement `createImprovementsFromBonus(source, sourceName, bonusData, rating?)` — Takes a bonus definition (from game data JSON) and returns an array of `Improvement` objects. Start with the bonus types already handled in `qualityBonuses.ts` (~30 types), then expand.
3. Implement `removeImprovements(improvements, source, sourceName)` — filter out matching improvements.
4. Write tests for each function in `src/lib/engine/__tests__/improvementManager.test.ts`.

**Verify:** Tests pass for improvement creation, valueOf aggregation, removal, and uniqueName grouping.

---

### 2.3 — Integrate Improvements Into Bonus Application

**What:** Update the quality, cyberware, bioware, gear, and power add/remove functions to create/remove Improvements on the character.

**Steps:**

1. When `addQuality()` is called, also call `createImprovementsFromBonus('Quality', qualityName, qualityBonus)` and add the resulting improvements to `character.improvements`.
2. When `removeQuality()` is called, also call `removeImprovements(character.improvements, 'Quality', qualityName)`.
3. Repeat for `addCyberware/removeCyberware`, `addBioware/removeBioware`, `addGear/removeGear`, `addPower/removePower`.
4. Deprecate `stores/qualityBonuses.ts` — its functionality is now handled by the improvement system.

**Verify:** Adding a quality with bonuses (e.g., "Toughness" which gives Physical CM +1) creates the correct Improvement. Removing it removes the Improvement. The `qualityBonuses` derived store can be replaced with `valueOf()` calls.

---

### 2.4 — Wire Improvements Into Calculations

**What:** Update `engine/calculations.ts` to use `valueOf()` from the ImprovementManager instead of raw attribute values.

**Steps:**
For each function in `calculations.ts`, add the improvement bonus:

1. `calculatePhysicalCM`: add `valueOf(char.improvements, 'PhysicalCM')`
2. `calculateStunCM`: add `valueOf(char.improvements, 'StunCM')`
3. `calculateOverflow`: add `valueOf(char.improvements, 'PhysicalCM')` (overflow uses same improvement)
4. `calculateInitiative`: add `valueOf(char.improvements, 'Reaction')` to REA total
5. `calculateInitiativeDice`: use `valueOf(char.improvements, 'InitiativePass')`
6. `calculateComposure`: add `valueOf(char.improvements, 'Composure')`
7. `calculateJudgeIntentions`: add `valueOf(char.improvements, 'JudgeIntentions')`
8. `calculateMemory`: add `valueOf(char.improvements, 'Memory')`
9. `calculateLiftCarry`: add `valueOf(char.improvements, 'LiftCarry')`
10. `calculateDefense`: factor in improvement bonuses
11. Armor calculations: add `valueOf(char.improvements, 'BallisticArmor')` and `valueOf(char.improvements, 'ImpactArmor')`
12. Movement: apply `valueOf(char.improvements, 'MovementPercent')`

**Verify:** Create a test character with Toughness quality (+1 physical CM). Verify `calculatePhysicalCM()` returns the correct value with the bonus included.

---

## Phase 3: Equipment Nesting

> **Goal:** Support equipment hierarchies (cyberware containing child cyberware, gear containing child gear, vehicle weapon mounts).

### 3.1 — Update Type Definitions

**What:** Add `children` arrays to equipment types.

**Steps:**

1. In `src/lib/types/equipment.ts`, add to `CharacterCyberware`:
   ```typescript
   readonly children: readonly CharacterCyberware[];
   ```
2. Add to `CharacterGear`:
   ```typescript
   readonly children: readonly CharacterGear[];
   ```
3. Add to `CharacterVehicle`:
   ```typescript
   readonly weapons: readonly CharacterWeapon[];
   readonly gear: readonly CharacterGear[];
   ```
4. Add `WeaponMod` type (separate from `WeaponAccessory`):
   ```typescript
   interface WeaponMod {
   	readonly id: string;
   	readonly name: string;
   	readonly slots: number;
   	readonly damageBonus: number;
   	readonly apBonus: number;
   	readonly cost: number;
   }
   ```
5. Add `readonly modifications: readonly WeaponMod[]` to `CharacterWeapon`.
6. Update `EMPTY_EQUIPMENT` to include empty arrays for new fields.

**Verify:** `npm run check` passes. Existing equipment functions still work.

---

### 3.2 — Update Store Functions for Nesting

**What:** Update equipment add/remove functions to support parent-child relationships.

**Steps:**

1. Add `addChildCyberware(parentId, cyberware)` function.
2. Add `removeChildCyberware(parentId, childId)` function.
3. Add `addGearToGear(parentId, gear)` and `removeGearFromGear(parentId, gearId)`.
4. Add `addWeaponToVehicle(vehicleId, weapon)` and `removeWeaponFromVehicle(vehicleId, weaponId)`.
5. Update essence calculation to recurse into cyberware children.
6. Update capacity calculations to account for nested items.

**Verify:** Create a test: add a Cyberarm, then add Cyberarm Gyromount as a child. Verify the child appears in `cyberware[0].children[0]`. Verify essence cost accounts for both.

---

### 3.3 — Update XML Import/Export for Nesting

**What:** Update `xml/importer.ts` and `xml/exporter.ts` to handle nested equipment.

**Steps:**

1. In the importer, when parsing cyberware/gear XML nodes, recursively parse child nodes.
2. In the exporter, when writing cyberware/gear, recursively write children.
3. Test with a desktop Chummer `.chum` file that has nested cyberware.

**Verify:** Round-trip test: import a Chummer file with nested cyberware → export → compare key fields.

---

## Phase 4: Missing Game Data

> **Goal:** Convert remaining desktop XML data files to JSON.

### 4.1 — Convert Missing Data Files

**What:** Use the existing `scripts/convert-xml-to-json.ts` pattern to convert desktop data.

**Files needed:**

1. `complexforms.xml` → `static/data/complexforms.json` (currently `programs.json` may partially cover this — verify and fill gaps)
2. `metamagic.xml` → `static/data/metamagic.json` (echoes.json may partially cover — verify)
3. `books.xml` → `static/data/books.json` (needed for sourcebook filtering)
4. `ranges.xml` → `static/data/ranges.json` (weapon range tables)

**Steps:**

1. Locate the desktop XML files in the `Chummer/` or `bin/` directory.
2. Add conversion handlers to `scripts/convert-xml-to-json.ts` for each file.
3. Run `npm run convert-data` and verify output.
4. Update `src/lib/stores/gamedata.ts` to load the new data files.

**Verify:** `gameData` store includes the new data. No console errors on load.

---

## Phase 5: Missing Selection UIs

> **Goal:** Add selection interfaces for game elements that lack dedicated UI.

### 5.1 — Metamagic Selection UI

**What:** Add a way for initiated characters to select metamagics.

**Steps:**

1. Load `metamagic.json` in gamedata store.
2. Create a metamagic selection component (list with filter, add/remove buttons).
3. Wire it into the Magic panel or Career Advancement component.

---

### 5.2 — Lifestyle Selection UI

**What:** Add lifestyle selection for character creation.

**Steps:**

1. `lifestyles.json` already exists (1KB) — may need expansion from the desktop XML.
2. Create a Lifestyle selector component.
3. Add lifestyle tracking to the Character type and store.

---

### 5.3 — Martial Arts Selection UI

**What:** Add martial arts and maneuver selection.

**Steps:**

1. `martialarts.json` already exists (5KB).
2. Create a Martial Arts selector component.
3. Wire into the character creation wizard or a new tab.

---

### 5.4 — Foci System

**What:** Implement focus bonding and stacking.

**Steps:**

1. Add `Focus` and `StackedFocus` types to `types/equipment.ts`.
2. Add `foci` array to the Character type.
3. Add store functions: `bondFocus`, `unbondFocus`, `stackFoci`.
4. Create Foci UI component.
5. Create improvements from bonded foci.

---

## Phase 6: PWA & Offline Support

> **Goal:** Implement the PWA infrastructure stated in requirements.

### 6.1 — Add Web App Manifest

**What:** Create `static/manifest.json` for PWA installability.

**Steps:**

1. Create `static/manifest.json` with app name, icons, colors, display mode.
2. Generate app icons at required sizes (192×192, 512×512).
3. Add `<link rel="manifest" href="/manifest.json">` to `src/app.html`.

---

### 6.2 — Add Service Worker

**What:** SvelteKit supports service workers natively.

**Steps:**

1. Create `src/service-worker.ts` (SvelteKit auto-registers it).
2. Cache static assets and game data JSON files.
3. Implement offline-first strategy: serve from cache, update in background.

**Verify:** Build the app, serve locally, go offline in DevTools — app still loads and functions.

---

## Phase 7: Security & Settings

### 7.1 — Add Firestore Security Rules

**What:** Create `firestore.rules` to enforce ownership-based access.

**Steps:**

1. Create `firestore.rules` at project root:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /characters/{charId} {
         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
         allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
       }
     }
   }
   ```
2. Create `firebase.json` to reference the rules file.
3. Deploy rules via `firebase deploy --only firestore:rules`.

---

### 7.2 — Add Settings/House Rules System

**What:** Port the key `CharacterOptions` from the desktop app.

**Steps:**

1. Create `src/lib/types/settings.ts` with a `CharacterSettings` interface.
2. Create `src/lib/stores/settings.ts` with a settings store persisted to localStorage.
3. Key settings: starting BP, enabled sourcebooks, house rule toggles.
4. Create a Settings page/modal component.
5. Wire sourcebook filtering into game data queries.

---

## Phase 8: Test Coverage

> **Goal:** Move toward the 80% coverage target.

### 8.1 — Add Coverage Reporting

**Steps:**

1. Add to `vite.config.ts`:
   ```typescript
   test: {
     coverage: {
       provider: 'v8',
       reporter: ['text', 'html'],
       exclude: ['node_modules/', 'src/**/*.svelte']
     }
   }
   ```
2. Add script to `package.json`: `"test:coverage": "vitest run --coverage"`
3. Run and establish baseline.

---

### 8.2 — Priority Test Areas

Write tests in this order (highest value first):

1. `engine/improvementManager.ts` — all `valueOf()` aggregation cases
2. `engine/calculations.ts` — every calculation function with mocked improvements
3. `engine/validation.ts` — each validation function
4. `stores/creation.ts` — wizard flow, metatype selection
5. `stores/attributes.ts` — attribute allocation with limits
6. `stores/magic.ts` — spell/power/initiation functions
7. `xml/importer.ts` — import with nested equipment
8. `xml/exporter.ts` — export round-trip fidelity

---

## Execution Order Summary

| Priority | Phase                  | Effort                  | Risk if Skipped                    |
| -------- | ---------------------- | ----------------------- | ---------------------------------- |
| 1        | 0 — Cleanup            | Small (1-2 hours)       | Low but embarrassing               |
| 2        | 1 — Split Store        | Medium (4-8 hours)      | Maintenance nightmare              |
| 3        | 2 — Improvement System | **Large (16-24 hours)** | **Incorrect character stats**      |
| 4        | 3 — Equipment Nesting  | Medium (8-12 hours)     | Can't represent complex characters |
| 5        | 4 — Missing Data       | Small (2-4 hours)       | Missing content                    |
| 6        | 8.1 — Test Coverage    | Small (1 hour)          | Can't measure progress             |
| 7        | 5 — Selection UIs      | Medium (8-12 hours)     | Feature gaps                       |
| 8        | 6 — PWA                | Medium (4-8 hours)      | Broken offline claim               |
| 9        | 7 — Security/Settings  | Medium (4-8 hours)      | Insecure + inflexible              |
| 10       | 8.2 — Tests            | Ongoing                 | Quality risk                       |

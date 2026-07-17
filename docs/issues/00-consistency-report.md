# Cross-Epic Consistency Report

> Generated 2026-07-17 by the ticket-hardening workflow (final pass over docs/issues/16-23). Apply these corrections before starting implementation.

I have now read all eight epic specs, the cross-epic coordination summaries, and the plan's Part II/milestones. Here is the consistency review.

---

# ChummerWeb Hardened-Spec Consistency Review (planning only)

Scope: issues #61–#104 across `docs/issues/16–23` + `FEATURE_PARITY_PLAN.md` Part II. Every finding cites both spec locations, names the winner, and gives the loser's mechanical edit.

## 1. CONFLICTS (incompatible edits to same file/function/type)

**C1 — `stores/character.ts` equipment block deleted by two issues.**
`16-improvement-engine.md` #62a (design, "delete from `character.ts`: addCyberware…addGear plus addWeapon/removeWeapon/addArmor/…/setLifestyle if equivalent") and `17-equipment-hierarchy.md` #75 (shared decision 1 + step 2, "deletes the `character.ts` equipment block ~:1986–2860") both delete the same functions and repoint `EquipmentSelector.svelte:2–27` and `stores/__tests__/equipment.test.ts:10–27`.
Winner: **#62a owns cyberware/bioware/gear/armor** (the mutations #62c must wire improvements into); **#75 owns the remainder** (`setResourcesBP` :1990, `calculateEquipmentSpent` :2015, `addWeapon`/`removeWeapon`, `addVehicle`/`removeVehicle`, `moveGearToContainer` :2697, plus the `equipment/` directory split).
Loser edit: In #75 step 2, change "delete the `character.ts` equipment block" to "delete whatever equipment mutations #62a left behind (weapons/vehicles/resources/move/lifestyle) and perform the directory split"; do not assume the full :1986–2860 block is still present.

**C2 — `calculateMatrixInitiative` rewritten twice.**
`16` #68 (Tier-1, "consumer fix lands here too: `calculateMatrixInitiative` … switch its technomancer branch to `(INT×2)+1+valueOf(LivingPersonaResponse)`") and `17` #79 (design, full rewrite of both `calculateMatrixInitiative` and `calculateMatrixInitiativeDice`, `calculations.ts:360–368`).
Winner: **#79** (complete mundane-commlink + technomancer rewrite).
Loser edit: #68 should limit its `calculations.ts` change to producing `LivingPersonaResponse` and leave the technomancer-branch formula to #79 — OR both must write the byte-identical technomancer expression so the #71 golden-5 value `(4×2)+1+1` holds regardless of which lands. Flag the shared line range in both PRs.

**C3 — armor value function extended twice.**
`16` #64 (design "armor bonus node → `BallisticArmor`/`ImpactArmor`"; test "`calculateArmorBallistic`/`Impact` each +1") and `17` #73 ("modifies `calculateArmorBallistic`/`calculateArmorImpact` 271–313" to add equipped-mod `ballisticBonus`).
Winner: both edits are additive and compatible; **#64 (M8) lands first (improvement reads), #73 (M9) adds mod-bonus reads on top.**
Loser edit: #73's `effectiveBallistic(armor)` helper must preserve #64's `valueOf(…,'BallisticArmor')`/`'ImpactArmor')` term rather than replace the function body. #71 goldens for soak must be regenerated after #73 (already noted in 17's cross-epic summary).

**C4 — uneducated/uncouth/infirm export derived two different ways.**
`16` #67 (step 5, "exporter: replace the three hardcoded lines with `hasFlag(char.improvements,…)`", `xml/exporter.ts:75–77`) vs `18` #80a (design 2, "`uneducated/uncouth/infirm`: `character.qualities.some(q => q.name === 'Uneducated')`").
Winner: **#67's `hasFlag(char.improvements,…)`** (improvement-based, matches the engine philosophy; survives non-quality sources).
Loser edit: In #80a design bullet, replace the `character.qualities.some(...)` derivation with `hasFlag(char.improvements, 'Uneducated'|'Uncouth'|'Infirm')`. #80a must not re-hardcode nor re-derive from qualities.

**C5 — Complex-form XML element name conflict.**
`19` #87 (step 4, "emit `<complexform><name><rating>…` and parse it") vs `18` D2/#80b/#81 (desktop element is `<techprogram>` inside `<techprograms>`; `<complexforms>` "does not exist in the desktop format").
Winner: **#80b/#81's `<techprogram>`** (desktop-faithful).
Loser edit: Delete #87 step 4's `<complexform>` writer/parser; #80b `writeTechPrograms` already emits `rating`/`maxrating` and #81 `parseTechPrograms` already reads it, so #87 only needs to *verify* rating threads through the techprogram round-trip, not add its own element.

**C6 — add-fn return type specified three incompatible ways.** (see also I1)
`17` #75 shared decision 2 (`MutationResult = {success, error?}`), `20` #92 (refactor `add*` → `string | null` returning the new id), `21` #93 step 4 (change `void` → `{success, error?}`).
Winner: **a single `MutationResult` carrying an optional id** — `{ success: boolean; error?: string; id?: string }`.
Loser edits: #92 changes `add*: () => string | null` to return the unified `MutationResult` (id in `.id`); #93's gate reads `.success`/`.error`. Land the top-level `add*` signature change once (in #92, the first career issue to touch them) and have #93 consume it.

## 2. DEPENDENCY ERRORS

**D1 — Part II mislabels Rules epic as dependency-free.**
`FEATURE_PARITY_PLAN.md:114` marks package 6 (#93–#96) "— (parallel-safe)". But `21` #93 header ("Hard-depends on #82") and #96 ("#82 (hard); #93 (hard)") require #82's owned-item `avail`/`source` fields (Epic 18/M10). Fix: Part II row 6 `Depends on` must read "**#82 (M10), #92 (soft)**"; the epic is not parallel-safe.

**D2 — Part II mislabels Content epic as data-only/parallel-safe.**
`FEATURE_PARITY_PLAN.md:115` ("— parallel-safe … Data-only"). `22` #98 depends on #68 (weaponcategorydv handler, M8) + #80/#81 (M10); #97 depends on #91 (career, M11) + #16. Fix: Part II row 7 `Depends on` → "**#16, #80/#81, #91**".

**D3 — Milestone inversion: #92 (M11) consumes #93 (M12).**
`20` #92 availability gate consumes `21` #93's `parseAvail`; but career is M11, rules is M12. Only the #92 stopgap ("numeric-prefix parse, `TODO(#93)`") keeps M8→M12 valid. This works but is fragile: state explicitly that **#92 must ship the stopgap** (it cannot wait for #93), and that #93's later landing replaces the stopgap. The mutual reference #92↔#93 (warn-in-career vs block-in-creation) is not truly circular because #93 keys on `char.status`, not on #92.

**D4 — Magic epic omits its dependency on #82.**
`19` #86 (design, "metamagics/echoes are `readonly string[]` already") and the whole magic epic assume the pre-#82 shape, but `18` #82 (M10) converts `CharacterMagic.metamagics`/`CharacterResonance.echoes` to `CharacterMetamagic[]` and changes the `learnMetamagic` signature. Since M10 < M11, #82 lands first. Fix: add "#82" to the magic epic's dependency list; correct #86's "string[] already" to "`CharacterMetamagic[]` (from #82)". (See I2.)

**D5 — `<calendar>`/lifestyle XML plumbing ownership.**
`20` #89 defers `<calendar>` writer/reader to "#18"; but `18` D4 lists `<calendar />` as an *empty* element and #80b emits it empty. #89 (M11) must fill the writer #80b (M10) stubbed. Fix: #89 dependency note should say "#80b emits `<calendar />` empty; #89 populates `currentDate`+`entries` in that writer" — there is no separate #18 task for it.

**D6 — `migrations.ts` pipeline vs ad-hoc load hooks.**
`17` #76 introduces `stores/migrations.ts` + `migrateCharacter` chained from `persistence.ts:42/:54`. But `20` #89/#91 describe adding a *new* load hook in `loadCharacter`/`persistence.ts`, and `23` #101/#102 use Zod `.default()` in `CharacterSchema` instead. Three different backfill mechanisms. Fix: route #89 (calendar), #91 (lifestyles), #97 (type/qualities), #98 (martial arts), #79 (commlink normalize), #82 (item metadata) through `migrateCharacter` in `migrations.ts`; keep #101/#102 Zod defaults only for genuinely optional/nullable fields. (See M-collisions.)

Milestone order **M8→M12 is otherwise sound**: M9 depends on M8 (#75 needs #62's sourceName convention; #72/#73 degrade gracefully on Smartlink/ArmorMod improvements), M10 depends on M9 (#82 after #75; #74b before #80a), M11 magic depends on M10 (#82 CharacterMetamagic, #80/#81 techprograms), M11 career depends on M8 (#88 improvement removal), M12 depends on M8/M10/M11 as above. The only ordering that requires a stopgap is D3.

## 3. DUPLICATED WORK (same task in two issues)

**DUP1 — `weaponcategorydv` handler in `createImprovementsFromBonus`.**
`16` #68 Tier-1 list includes `weaponcategorydv (WeaponCategoryDV)`; `22` #98 step 2 ("Add `weaponcategorydv` handler to `createImprovementsFromBonus`"). Owner: **#68** (M8, earliest). #98 deletes its step 2 and consumes the existing handler (`improvementManager.ts`), keeping only its martial-art data/store work.

**DUP2 — `skillattribute`/`spellcategory` producer handlers.**
`16` #68 Tier-1 ("skillattribute/swapskillattribute … spellcategory") vs `19` #85 ("#85 must extend `createImprovementsFromBonus` … to emit them"). Owner: **#68** for the producer; **#85** owns only the consumer (pool `valueOf('SkillAttribute')`/`'SpellCategory'` reads). Loser edit: #85's consumption-gap bullet keeps clause (b) [add pool reads] and drops clause (a) [emit handlers] in favor of reusing #68.

**DUP3 — `CharacterIdentity.movement` field + `setMetatype` population.**
`16` #70 (design 1, "add `readonly movement?: string` to `CharacterIdentity`; populated from `metatype.movement`; persistence backfills") vs `18` #82 (design, "`CharacterIdentity` gains `readonly movement: string`; set by both `setMetatype` copies"). Owner: **#70** (M8) adds the field, population, and backfill; **#82** only reads it for export. Loser edit: strike #82's "CharacterIdentity gains movement / set by setMetatype" — reference #70's field instead. (Note optionality conflict in I3.)

**DUP4 — martial-art store dedup / `GameMartialArt` unification.**
`16` #62a (may delete `addMartialArt`/`removeMartialArt` from `character.ts` "if equivalent") vs `22` #98 (Risks + step 4, "pick the canonical module and delete the other"; unify `GameMartialArt` `types/equipment.ts:350` vs `gamedata.ts:265`). Owner: **#62a/#75** perform the store dedup (they run first, M8/M9) → `equipment.ts`/`equipment/martialArts.ts` becomes canonical. **#98** reconciles the two `GameMartialArt` *types* and reworks costs. Loser edit: #98 Risks note "keeping `character.ts` is lower churn" is stale — target whichever module #62a left canonical (equipment side), not `character.ts`. (See I4.)

**DUP5 — barrel (`stores/index.ts`) edited by many.**
#61, #62a, #63a (M8), #75 (`setResourcesBP` export, M9), #92 (`purchase*`, M11), #94 (does not touch this barrel — it edits `gamedata.ts` derived stores). No logic conflict, but sequence PRs to avoid churn; all M8 barrel edits belong to epic 16's internal order.

## 4. INTERFACE MISMATCHES

**I1 — add-fn signatures** — see C6. Producer (#75 `MutationResult`) vs consumers (#92 `string|null`, #93 `{success,error}`). Unify to `{success, error?, id?}`.

**I2 — `metamagics`/`echoes` element type.**
Producer: `18` #82 makes them `CharacterMetamagic[]`. Consumer: `19` #86 ("`readonly string[]` already") and `19` #84's metamagic-slot logic. Winner: `CharacterMetamagic[]` (#82). #84/#86 slot math (`initiations.length − metamagics.length`) survives (length-only), but any `{#each metamagics as m}` treating `m` as a string must use `m.name`. Loser edit: #86 design line "metamagics/echoes are readonly string[] already" → "`CharacterMetamagic[]` (from #82); render `.name`".

**I3 — `identity.movement` optionality.**
`16` #70 declares `movement?: string` (optional); `18` #82 declares `movement: string` (required, migration fills `''`). Winner: **required** (#82) with the #70 migration guaranteeing presence. Loser edit: #70 declares it required-with-default from the start (avoids `exactOptionalPropertyTypes` churn when #82 tightens it).

**I4 — martial-art improvement `sourceName` / removal keying.**
`22` #98 uses `MartialArtAdvantage` source with `sourceName = advantage id`; `20` #88/#92 assume equipment/advancement improvements are **name**-keyed and propose an id→name lookup. But `16` #62c fixes equipment `sourceName = character item id`, `19` #85 focus `sourceName = focus.id`, `18` #81 imports `sourcename = item guid`. Winner: **id-keying** for equipment/power/focus/martial-advantage (name-keying only for quality/metatype/metamagic/echo). Loser edit: `20` #88 Risks "improvements key on `sourceName` (item name) … prefer id lookup workaround" and #92 sellItem "name-based `removeImprovements`" are wrong for equipment — call `removeImprovements(source, objectId)` directly (objectId already equals the id-based sourceName). No `sourceId` field is needed; the #16 shared-type change #88 floats can be dropped.

**I5 — `CharacterLifestyle.monthlyCost` semantics.**
`20` #91 defines `monthlyCost = cost + Σ module.cost`; `22` #97 supplies `lifestyleMonthlyCost(base, type, roommates, percentage, improvements)` (desktop `:9454–9462`, banker's rounding). These are two different "monthly cost" computations. Winner: **#97's engine helper is canonical**; #91's `payLifestyle(months)` must call it. Loser edit: #91's `monthlyCost` field becomes the *stored result of* `lifestyleMonthlyCost`, not an independent `cost + modules` sum; land #91 with a simple version and have #97 replace the computation (documented in #97's dependency note, which already claims the helper "is exactly what #91's `payLifestyle` needs").

## 5. MIGRATION COLLISIONS

**MC1 — `CharacterLifestyle` transformed by #91, #97, (#99, #17).**
Divergent transforms of the same persisted `equipment.lifestyle`: `20` #91 (single→`lifestyles[]`, +`modules`, +`cost`), `22` #97 (+`type`, +`qualities`), `23` #99 (reverts in-flight `modules` test literal to the real shape). If #91 and #97 each register a separate migration they double-transform. Resolution: **one migration in `migrations.ts` performs the full lifestyle transform** — single→array, add `cost`/`modules`/`type`/`qualities` in one idempotent step. Land the type change once (owner **#91**, the array migration); #97 adds `type`/`qualities` into the *same* migration function, not a second hook. Also reconcile whether #91 `modules` (flat-cost) and #97 `qualities` (LP-driven) model the **same** desktop lifestyle-quality system — currently they are two incompatible cost models for one concept; decide before either lands (recommend #97's LP→cost as authoritative, #91 `modules` as the RC flat-cost option layered on top).

**MC2 — `CharacterLifestyle` metadata + array ordering.**
`18` #82 (M10) adds `source`/`page` to the single `CharacterLifestyle`; `20` #91 (M11) then converts to an array. #82's `migrateItemMetadata` and #91's array migration both touch lifestyle. Sequence (M10<M11) is fine, but the #91 array migration must carry `source`/`page` into each element. Add to #91: "preserve #82's `source`/`page` fields per element."

**MC3 — lifestyle XML writer/reader location.**
`20` #91 step 2 edits `xml/exporter.ts:298–321` and `xml/importer.ts:120/:189/:603–611`, but `18` #80a (M10) restructures the exporter into `src/lib/xml/export/*` (D5) and #81 rewrites the importer. Since #80/#81 land first, #91's line references are stale. Fix: #91's XML edits target the post-#80a `export/`-module lifestyle writer and the #81 importer, not `exporter.ts:298–321`.

**MC4 — `CharacterMetamagic` migration.**
`18` #82's `migrateItemMetadata` converts `metamagics`/`echoes` string→`{id,name,source,page}`. `19` #84 adds `initiations`/`submersions` with its own backfill from scalar `initiateGrade`. Both migrate `CharacterMagic`. No data overlap (different fields), but both must be idempotent and chained in `migrateCharacter`; #99 must not re-add `initiations` (it reverts the test literal). Chain order: #82's metamagic migration, then #84's initiation backfill.

**MC5 — backfill mechanism inconsistency** — see D6. `calendar` (#89), `lifestyles` (#91), `type/qualities` (#97) via load hooks; `shareToken` (#101), `mugshot` (#102) via Zod `.default()`. Note `CharacterSchema` uses `.passthrough()`, so a missing **required** field is *not* auto-filled unless it's in the schema with `.default()` — meaning #89/#91's required `calendar`/`lifestyles` genuinely need a migration (their specs are right to add one), while #101/#102's nullable fields can use Zod defaults. Consolidate the migration-function ones into `migrateCharacter`.

---

## Recommended implementation sequence

Ordered issue list respecting every dependency above (milestone bands in brackets). Within a band, left-to-right is the required order; issues with no mutual dependency are listed in the epics' own stated order.

```
[M8  Correct Stats]      #99 → #61 → #69 → #62a → #63a → #62b → #66 → #62c → #63b → #64 → #65 → #67 → #68 → #70 → #71
[M9  Equipment Model]    #75 → #76 → #77 → #72 → #73 → #74a → #74b → #78 → #79
[M10 XML Round-Trip]     #82 → #80a → #80b → #81 → #83
[M11 Magic]              #84 → #85 → #86 → #87
[M11 Career]             #90 → #89 → #88 → #91 → #92
[M12 Rules]              #93 → #94 → #95 → #96
[M12 Content]            #98 → #97
[M12 Platform]           #100 → #101 → #102 → #103 → #104
```

Cross-band hard edges that pin this order: #62 sourceName convention before #75 (C1, I4); #75 before #82 (18 sequencing note); #82 before #86 (D4/I2) and before #93/#96 (D1); #80/#81 before #87 (C5) and before #91's XML (MC3); #68 before #98 (DUP1) and before #85 (DUP2); #88+#89 before #91 (career order); #91 before #97 (MC1); #92 ships the #93 avail stopgap (D3); #100 before #101; #92 before #103's career.spec. #90, #89, #100 have no hard predecessors beyond #99 and may float earlier within their bands.

---

# Open Product Questions (collected from all epic refiners)

## Epic engine (#61-#71)

- Data pipeline of record: qualities.json bonus data was NOT produced by the current converter (which strips all bonuses) — the owner should confirm where it came from (hand-edit? older script?) and agree that regenerating all JSON from desktop XML via the fixed converter (#62b) is authoritative, since regeneration may also change non-bonus fields that were hand-tuned
- Keep or drop the SR5-style physical/mental/social limit calculations? Desktop SR4 has no limits and no matching improvement types; #70 specs leaving them as display-only with a JSDoc note, but removing them entirely for strict SR4 parity is a product call
- Metatype racial data gap: metatypes.json has empty qualities arrays even for Dwarf (desktop grants thermographic vision / pathogen resistance via racial quality lists) — is fixing the metatype-qualities conversion in scope for #63 or deferred to the Content epic (#97-#98)?
- Uneducated knowledge-skill doubling: SR4 RAW doubles Academic/Professional knowledge costs, but the verified desktop code doubles only 'Technical Active' active skills — #67 specs RAW (beyond desktop); confirm whether parity target is desktop-exact or SR4-RAW when they diverge
- Essence-multiplier retroactivity (#64): if Biocompatability is taken AFTER cyberware is installed, desktop recalculates essence; the web stores per-item essence snapshots and #64 specs non-retroactive behavior — accept this divergence or require recalculation?

## Epic equipment (#72-#79)

- Armor capacity default (#73): desktop ships with BOTH armor-capacity house rules disabled (Armor.CalculatedCapacity gates on ArmorSuitCapacity / MaximumArmorModifications options, clsEquipment.cs:1889-1921), so strict desktop parity means no enforcement — but the plan mandates enforcement. Recommended default in the spec (suit capacity when catalog capacity > 0, else SR4 RAW ballistic+impact with rating-based costs) needs owner sign-off since it will reject builds desktop accepts.
- Weapon-mount strictness (#74a): spec proposes requiring a free 'Weapon Mount' mod before mounting a vehicle weapon (rejecting otherwise), whereas desktop leniently attaches to an occupied mount 'and lets the player deal with it', and the current web UI mounts weapons with no mod at all. This changes existing user-visible behavior — confirm strict mode is acceptable.
- Legacy vehicle-weapons migration (#74a): spec migrates existing vehicle.weapons entries into a synthesized zero-cost included 'Weapon Mount (Imported)' mod. Alternative is keeping a deprecated flat list. Confirm the synthesized-mod approach is acceptable for user-facing display (it will show a mount the user never bought).
- Resources tier correction (#78): fixing bpToNuyen from linear 5000/BP to the SR4 tier table changes budgets of existing saved characters the next time they touch the Resources control (e.g. 5 BP drops from 25,000 to 20,000 nuyen, potentially pushing saved characters over budget). Confirm this silent correction is acceptable or whether it needs a user-facing notice.

## Epic xml (#80-#83)

- Fixture provenance/licensing: the bin/saves .chum sample files come from the desktop Chummer distribution and reference CGL book content; is bundling 4 of them as permanent test fixtures in the (proprietary, private) repo acceptable, and can someone run desktop Chummer to generate REAL fixtures for the uncovered archetypes (technomancer with complex forms/sprites, bioware user, rigger with populated vehicles, bonded foci) to replace the hand-built synthetic ones?
- Manual desktop verification: the acceptance criterion 'desktop Chummer opens the exported file without errors' cannot be automated (WinForms) — who owns running the manual open-in-desktop checklist for #80/#83 PRs, and on which desktop Chummer point-release version is compatibility pinned?
- Imported-improvement trust policy: #81 specs parsing desktop <improvements> verbatim (desktop-parity). If the web's own bonus data later disagrees with a desktop file's improvements (data errata, house rules in the source file), should the web ever offer a 'recalculate improvements from game data' action, or is file fidelity always authoritative for imported characters?

## Epic magic (#84-#87)

- #86: Do BP-method characters expose a spendable chargen Karma pool? Desktop charges Karma for chargen initiation/foci bonding, and the web has char.karma, but it is unclear whether BP builds surface a leftover-karma balance to spend from. If not, creation-time initiation (#86) and creation-mode focus bonding (#85) are blocked until a chargen-karma source is defined. This is a product/rules decision, not an implementation detail.
- #87: Confirm the parity fix is desired — correcting complex-form costs to desktop defaults (chargen 5 BP -> Rating x 1 BP; career new 5 -> 2 karma) changes existing character totals and diverges from the plan text's stated '5 BP/form'. Need sign-off that desktop parity wins over the plan's number.
- #85: Should career-mode focus bonding refund karma on unbond? The spec matches desktop (no refund in career, refund only in creation, mirroring initiate()), but this is a house-rule-adjacent choice worth confirming.

## Epic career (#88-#92)

- #92/#93: Over-cap career purchases — hard block, or warn-and-allow (SR4 RAW requires time/rolls for high-avail gear)? Spec assumes a simple gate but the block-vs-warn choice is a product decision.
- #92: Fixed 30% sell-back (CAREER_SELL_RATE) vs porting desktop's per-sale GM-prompted percentage. Spec picks a configurable constant defaulting to 30%.
- #90: Model BurntStreetCred (clsCharacter.cs:2950 — reduces street cred, halves into notoriety) or accept the documented gap? Not currently in the web data model.
- #88: Add sourceId to the shared Improvement type now for clean id-based undo cleanup (cross-epic with #16), or use the id->name lookup workaround within this epic?
- #91: Is LifestyleModule intended as Runner's Companion lifestyle qualities/options, and is populating real module game data in scope, or only adding the field to satisfy the in-flight test/type?

## Epic rules (#93-#96)

- #94 default sourcebooks: adopt [] = 'all enabled' sentinel (recommended, matches AC and avoids listing ~60 codes) vs an explicit core-book whitelist? Also: what should 'SR4A' map to, given it is not a code in books.json — drop it, or alias to SR4?
- #94: odd source values like '2050' (weapons.json) and other content lacking a books.json entry would become permanently hidden if the default moves away from 'all'. Do we backfill books.json, or keep default=all to sidestep?
- #95 scope: confirm the 15-option subset is the right cut for MVP, or does the product owner want specific additional flags (e.g. AllowExceedAttributeBP, SpecialAttributeKarmaLimit)?
- #95 XML divergence: embedding literal <houserules>/<costs> values instead of desktop's external options-file reference means desktop Chummer will ignore them on import. Acceptable one-way divergence, or is desktop round-trip fidelity required?

## Epic content (#97-#98)

- #98 maneuver cost/BP: desktop treats maneuvers as a character-global list at BPMartialArtManeuver=2 each, independent of any style, whereas the current web nests techniques under a style. Confirm the product wants the desktop-faithful global maneuver list (recommended) vs keeping maneuvers scoped to a style.
- #97 scope: is a full Advanced Lifestyle builder UI (comfort/entertainment/necessity/neighborhood/security LP sliders) wanted now, or is emitting the qualities + LP cost tables and computing Advanced base cost sufficient for this priority:low issue? The spec defaults to the latter and defers the builder UI.

## Epic platform (#99-#104)

- #101 sharing: should loadSharedCharacter strip sensitive fields (userId, private background notes) before returning a publicly-viewable character, or is the full sheet acceptable for public view? This is a privacy product decision.
- #101: confirm the public link format — route on an opaque shareToken (hides the owner's real character id, needs the mirror collection) vs route on the character id directly (simpler, exposes the id). Spec recommends the token+mirror approach; needs owner sign-off.
- #102: acceptable mugshot size cap and behavior on oversize upload — reject with an error vs silently downscale/re-encode client-side? Spec assumes ~200KB with client downscale.
- #104: is the E2E job kept as allowed-failure indefinitely, or promoted to a required check once #103 is stable (blocking merges on E2E flakiness)?


---

## Cross-epic corrections applied (2026-07-17)

All loser edits below were applied to the hardened specs; every file's `<!-- EPIC COMPLETE -->` trailer is intact.

- **C1** — `17-equipment-hierarchy.md` #75 step 2 rewritten: delete only the equipment mutations #62a left behind (weapons/vehicles/resources/move/lifestyle) + directory split; no longer assumes the full `character.ts` ~:1986–2860 block is present.
- **C2** — `16-improvement-engine.md` #68 Tier-1 `livingpersona` clause: #68 now only *produces* `LivingPersonaResponse`; the `calculateMatrixInitiative` technomancer-branch rewrite is owned by #79, with the golden-5 `(4×2)+1+1` value and the shared `calculations.ts:360–368` range flagged. Winner-side flag also added to `17` #79's calculations block.
- **C3** — `17` #73 calculations line: `effectiveBallistic(armor)` must preserve #64's `valueOf(…, 'BallisticArmor')`/`'ImpactArmor'` terms (mod bonuses layer on top); #71 soak goldens regenerated after #73.
- **C4** — `18-xml-compatibility.md` #80a design bullet: `uneducated/uncouth/infirm` derived via `hasFlag(char.improvements, …)` (#67's helper), not `character.qualities.some(...)`.
- **C5** — `19-magic-resonance.md` #87 step 4: `<complexform>` writer/parser deleted; #87 only verifies rating threads through the #80b/#81 `<techprogram>` round-trip.
- **C6 / I1** — unified `MutationResult { success: boolean; error?: string; id?: string }`: `17` shared decision 2 + the `tree.ts` interface gained `id?`; `20-career-mode.md` #92 changes `add*` to return `MutationResult` (id in `.id`, landed once in #92) in the design block, `purchase*` text, and step 1; `21-rules-settings.md` #93 step-4 caveat now reads `.success`/`.error` from the #92 signatures instead of introducing its own result type.
- **D1** — `FEATURE_PARITY_PLAN.md` Part II row 6 (Rules): "Depends on" → "#82 (M10), #92 (soft)"; parallel-safe claim dropped.
- **D2** — `FEATURE_PARITY_PLAN.md` Part II row 7 (Content): "Depends on" → "#16, #80/#81, #91"; data-only/parallel-safe dropped. `22-content-depth.md` epic header rewritten to match.
- **D3** — `20` #92 `purchase*`: states explicitly that #92 MUST ship the numeric-prefix stopgap parser (`TODO(#93)`) and that #93 replaces it in-place, keyed on `char.status` (not circular). Mirrored in `21` #93's #92 dependency bullet.
- **D4** — `19` epic header gains the cross-epic dependency on #82 (`CharacterMetamagic[]` lands M10 < M11); #86's "readonly string[] already" corrected to "`CharacterMetamagic[]` (from #82); render `.name`" in design and dependencies.
- **D5** — `20` #89 step 5 + dependencies: #80b emits `<calendar />` empty; #89 populates `currentDate`+`entries` inside that same writer (and #81 reads them); no separate #18 task.
- **D6 / MC5** — backfill mechanism consolidated: `20` #89 calendar backfill and #91 lifestyle migration routed through idempotent functions in `stores/migrations.ts` chained from `migrateCharacter` (not ad-hoc load hooks); `22` #97/#98 migrations likewise; `19` #84 (see MC4). `17` #79 (commlink normalize → `migrateCharacter`) and `18` #82 (`migrateItemMetadata` in `migrations.ts`) were already consistent — no edit. `23-platform-delivery.md` #101 `shareToken` / #102 `mugshot` annotated as the sanctioned Zod `.default()` path for nullable fields (do not move into `migrateCharacter`).
- **DUP1** — `22` #98: step 2 (add `weaponcategorydv` handler) deleted; verified-state bullet and dependencies now state #68 owns the handler and #98 only consumes it.
- **DUP2** — `19` #85 consumption-gap bullet: clause (a) (emit handlers) dropped in favor of reusing #68's `skillattribute`/`spellcategory` producers; #85 keeps only the consumer-side `valueOf` reads.
- **DUP3** — `18` #82: "CharacterIdentity gains movement / set by setMetatype" struck; #82 now only reads #70's field for export (design bullet, migration comment, step 2, and the test-plan line all updated).
- **DUP4** — `22` #98 store-placement bullet + risks: stale "keeping `character.ts` is lower churn" advice replaced — the #62a/#75 dedup leaves the equipment-side module canonical; #98 targets `stores/equipment/` and only reconciles the two `GameMartialArt` types. Related stale bullet in `21`'s cross-cutting facts ("two competing add-fn modules … wire both") replaced with the C1 resolution.
- **DUP5** — already consistent / no edit needed (sequencing advice only; no conflicting barrel instructions found in the specs).
- **I1** — see C6.
- **I2** — see D4.
- **I3** — `16` #70: `identity.movement` declared **required-with-default** from the start (was `movement?: string`), avoiding `exactOptionalPropertyTypes` churn when #82 reads it.
- **I4** — `20` #88: keying bullet, `undoExpense` step 5, and both Risks bullets rewritten — equipment/power/focus/martial-advantage improvements are id-keyed (`sourceName` = item id), `undo.objectId` equals that sourceName, direct `removeImprovements(source, objectId)`, no id→name lookup, and the floated `sourceId` shared-type change is dropped. `20` #92 `sellItem` + risks updated to id-keyed removal.
- **I5** — `20` #91 `monthlyCost` field comment: stored result of #97's canonical `lifestyleMonthlyCost` helper (simple version at #91 landing, replaced by #97); `22` #97 dependency bullet states the same from the winner side.
- **MC1** — `20` #91 migration rewritten: one idempotent lifestyle migration in `migrations.ts` owns the full transform; #97 adds `type`/`qualities` into that SAME function; modules-vs-qualities cost-model decision noted (recommend #97 LP→cost authoritative). `22` #97 migration, step 5, and risks updated to extend #91's function rather than register a second hook.
- **MC2** — `20` #91 migration: "preserve #82's `source`/`page` fields per element" added to the array migration.
- **MC3** — `20` #91 verified-state XML bullet: line references flagged as pre-restructure; #91's XML edits target the post-#80a `export/`-module lifestyle writer and the #81 importer, not `exporter.ts:298–321` / `importer.ts:120/189/603–611`.
- **MC4** — `19` #84 migration + step 3: initiation backfill is an idempotent `migrations.ts` function chained in `migrateCharacter` AFTER #82's metamagic migration; noted that #99 must not re-add `initiations`. `23` #99 already drops `initiations`/`modules`/`overflowCurrent` — already consistent, no edit.
- **MC5** — see D6.

Additionally, per the hardening workflow: `FEATURE_PARITY_PLAN.md` Part III now opens with a note box stating the issues below are the original drafts and that the hardened, implementation-ready specs live in `docs/issues/16-*.md`–`23-*.md`, with `docs/issues/00-consistency-report.md` as the cross-epic corrections + recommended sequence.

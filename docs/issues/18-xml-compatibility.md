# Epic: XML Compatibility Fidelity (Phase 18)

**Issues:** #80–#83 · **Labels:** `epic:xml2` · **Plan:** [../FEATURE_PARITY_PLAN.md](../FEATURE_PARITY_PLAN.md) (Part III, "Epic: XML Compatibility Fidelity")

**Milestone:** M10 — desktop `.chum` files survive import → export byte-comparably for supported sections.

## Implementation order (differs from issue numbering)

```
#82  (model: avail/source/page/movement/metamagic metadata + migration)   ← exporter/importer need the fields
  → #80a (exporter fidelity: stable GUIDs, real avail/movement/flags, desktop section order)
  → #80b (exporter new sections: bioware, metamagics, spirits, techprograms, martial arts, expenses, improvements, foci)
  → #81  (importer: all sections + UTF-16 decoding + GUID adoption)
  → #83  (round-trip validation suite — regression net)
```

**Sequencing against Phase 17 (#72–#79):** #82 populates metadata in the equipment purchase functions. Epic 17 issue #75 first consolidates the duplicated mutation suite (`stores/character.ts` ~:1986–2860 vs `stores/equipment.ts`) into `stores/equipment/` — **#82 must land after #75**, otherwise the population code must be written twice into both copies. Vehicle XML round-trip is **not** in this epic: it is fully specified as #74b in [17-equipment-hierarchy.md](17-equipment-hierarchy.md); #80/#81 leave `<vehicles>` to #74b and only coordinate on the shared `exportWeapon` extraction.

## Shared design decisions (apply to all issues)

### D1 — GUID stability

Desktop `Load()` calls `Guid.Parse(objNode["guid"].InnerText)` on almost every object (e.g. `clsEquipment.cs:2657`, `clsUnique.cs:1147`) — a non-GUID or missing `<guid>` **crashes desktop import**. Today the web exporter emits a *fresh random* GUID per element per export (`exporter.ts:532–543`, called at :189/:223/:251/:272/:302/:343/:371/:410), and the web importer discards file GUIDs, generating `timestamp-random` ids (`importer.ts:725–729`). Consequences: exports are non-deterministic (breaks #83 diffing), and cross-references (improvement `sourcename` → item guid, focus `gearid` → gear guid) can never resolve.

Policy:

```ts
/** src/lib/xml/guid.ts (new) */
export function isGuid(s: string): boolean;              // /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function createGuidMapper(): (webId: string) => string;
```

- **Export:** one `guidFor = createGuidMapper()` per `exportToChummer` call. `guidFor(id)` returns `id` when `isGuid(id)`, else a freshly generated UUID **memoized per web id** for the duration of that export — so `improvements/*/sourcename` and `foci/*/gearid` written later in the same document match the guid written for the owning item.
- **Import:** every parser adopts the file's `<guid>` as the web `id` when present and GUID-shaped, else falls back to `generateId()`. GUID strings are valid web ids (they are only ever used as opaque keys).
- Result: desktop → web → desktop preserves every GUID (needed for #83's byte-comparable goal); web-born characters get stable GUIDs from the memoized map only within one export (acceptable: nothing external references web-born GUIDs; #83 diffs desktop-born files where ids ARE adopted).

### D2 — Desktop XML shapes are the contract

All element names/orders below were read from the desktop `Save(XmlTextWriter)` implementations, not paraphrased from the plan. Canonical references:

| Object | Element | Desktop source | Children of note |
| --- | --- | --- | --- |
| Character | `<character>` | `clsCharacter.cs:226–691` (`Save()`) | section order listed in D4 |
| Cyberware/Bioware | `<cyberware>` | `clsEquipment.cs:2585–2650` | `guid, name, category, limbslot, ess, capacity, avail, cost, source, page, rating, minrating, maxrating, subsystems, grade, location, suite, essdiscount, forcegrade, bonus, [allowgear], improvementsource, [weaponguid], <children>, [<gears>], notes, discountedcost` — **bioware is stored in `<cyberwares>` with `<improvementsource>Bioware</improvementsource>`; there is no `<biowares>` element** |
| Weapon | `<weapon>` | `clsEquipment.cs:4387–4455` | `guid, name, category, type, spec, spec2, reach, damage, ap, mode, rc, ammo, ammocategory, ammoremaining(2-4), ammoloaded(2-4), conceal, avail, cost, useskill, range, rangemultiply, fullburst, suppressive, source, page, weaponname, included, installed, requireammo, [<accessories>], [<weaponmods>], [<underbarrel>], location, notes, discountedcost` |
| Gear | `<gear>` | `clsEquipment.cs:10050–10125` | `guid, name, category, capacity, armorcapacity, minrating, maxrating, rating, qty, avail, avail3, avail6, avail10, [costfor], cost, cost3, cost6, cost10, extra, bonded, equipped, homenode, [weaponguid], bonus, [weaponbonus], source, page, response, firewall, system, signal, gearname, includedinparent, [childcostmultiplier], [childavailmodifier], <children>, location, notes, discountedcost` |
| Vehicle | `<vehicle>` | `clsEquipment.cs:14638–14704` | see #74b (epic 17) |
| Metamagic/Echo | `<metamagic>` | `clsUnique.cs:4763–4778` | `guid, name, source, paidwithkarma, page, bonus, improvementsource (Metamagic\|Echo), notes` — **echoes live in the same `<metamagics>` list, distinguished by improvementsource** |
| Spirit/Sprite | `<spirit>` | `clsUnique.cs:3274–3287` | `name, crittername, services, force, bound, type (Spirit\|Sprite per enum :3224–3228), file, relative, notes` — **sprites share `<spirits>`** |
| Complex form | `<techprogram>` | `clsUnique.cs:5621–5650` | `guid, name, category, rating, maxrating, capacity, extra, skill, [<tags>], [<programoptions>], source, page, notes` — section is `<techprograms>`; the web's current `<complexforms />`/`<programs />` elements do not exist in the desktop format |
| Martial art | `<martialart>` | `clsUnique.cs:6546–6561` | `name, source, page, rating, <martialartadvantages>, notes`; advantage = `guid, name, notes` (:6800–6807); maneuver = `guid, name, source, page, notes` in top-level `<martialartmaneuvers>` (:6943–6952) |
| Initiation grade | `<initiationgrade>` | `clsUnique.cs:8110–8120` | `guid, res, grade, group, ordeal, notes` (no `schooling` element — the SR4 desktop model only has group/ordeal) |
| Focus | `<focus>` | `clsUnique.cs:4394–4402` | `guid, name, gearid, rating` — a bonded-focus *record*; the focus item itself is a Gear entry (category Foci, `bonded` flag) |
| Stacked focus | `<stackedfocus>` | `clsUnique.cs:4499–4510` | out of scope (dead type on web) |
| Improvement | `<improvement>` | `clsImprovement.cs:419–444` | `[unique], improvedname, sourcename, min, max, aug, augmax, val, rating, exclude, `**`improvementttype`**` (sic — triple-t typo in desktop, must be reproduced), improvementsource, custom, customname, customid, customgroup, addtorating, enabled, order, notes` |
| Expense | `<expense>` | `clsExpenses.cs` (class :322) | `guid, date (ISO "s" format), amount, reason, type (Karma\|Nuyen), refund, [<undo>]`; undo = `karmatype, nuyentype, objectid, qty, extra` (class :66) |
| Quality | `<quality>` | `clsUnique.cs:1118–1141` | `guid, name, extra, bp, contributetolimit, print, qualitytype, qualitysource, [mutant], source, page, bonus, [weaponguid], notes` |

### D3 — Desktop Load() tolerance

`clsCharacter.Load()` (`clsCharacter.cs:701+`) reads most scalars inside `try/catch` (missing → default), but reads these **without** guards: `metatype`, `metatypebp`, `metavariant`, `name`, plus every `<guid>` inside list objects, and `Metamagic.Load` reads `name/source/page` unguarded (`clsUnique.cs:4785–4791`). Every exported list element must therefore carry the full element set from D2 even when values are empty/zero. Empty *sections* are safe: list loading uses `SelectNodes(...)` which tolerates absent parents; desktop itself writes empty sections as `<foci />` etc.

### D4 — Exporter section order

Reorder the web exporter to the desktop `Save()` order so #83 can diff without reordering logic: header scalars → `<attributes>` → magic scalars → cm-filled → `<skillgroups>` → `<skills>` → `<contacts>` → `<spells>` → `<foci>` → `<stackedfoci>` → `<powers>` → `<spirits>` → `<techprograms>` → `<martialarts>` → `<martialartmaneuvers>` → `<armors>` → `<weapons>` → `<cyberwares>` → `<qualities>` → `<lifestyles>` → `<gears>` → `<vehicles>` → `<metamagics>` → `<critterpowers>` → `<initiationgrades>` → `<improvements>` → `<expenses>` → `<locations>` → `<armorbundles>` → `<weaponlocations>` → `<improvementgroups>` → `<calendar>`. Desktop Load is order-independent (`SelectSingleNode`), so this is purely for diffability.

### D5 — Module layout under ESLint limits

`exportToChummer` is already one ~350-line function (`exporter.ts:13–362`) — far over `max-lines-per-function: 60`; do not grow it. New/changed writers go into `src/lib/xml/export/` (`writer.ts` with `escapeXml`/element helpers/guid mapper, `equipment.ts`, `magic.ts`, `career.ts`), with `exporter.ts` reduced to an orchestrator that calls one function per section. Same for the importer: new parsers in `src/lib/xml/import/sections.ts`, `importer.ts` orchestrates. Public APIs (`exportToChummer`, `importFromChummer`, `importFromFile`, `downloadAsChum`) do not change signature.

### D6 — Fixtures

Real desktop-generated files exist in-repo: `bin/saves/10 Mercs/**/*.chum` (11 files, **UTF-16 LE with BOM**, CRLF). Verified content coverage: Azadeh (4 initiation grades, 5 metamagics, improvements, expenses), Quicksilver (8 grades, 8 metamagics, 1 martial art "Savate" with 2 advantages), Rainwalker (16 grades all `res=False`, 14 metamagics, 20 spirits incl. bound Guardian Spirit force 12/services 10), Gunnery Sergeant (cyberware with improvementsources Cyberware/ArmorMod/Gear/EssenceLoss), Scout Sniper (**bioware** — Reflex Recorder (Skill) and Sleep Regulator, both inside `<cyberwares>` with `<improvementsource>Bioware</improvementsource>`, `<category>Cultured</category>`, `<grade>Standard</grade>`, `<forcegrade />` empty — plus one Bioware-sourced `<improvement>`). **No fixture contains vehicles-with-content, techprograms, or bonded foci** — those need synthetic fixtures (see #83).

---

## Issue #80: Export all character sections (stop emitting empty elements)

**Labels:** `epic:xml2`, `priority:high` · Split into **#80a (fidelity of existing sections — Size M)** and **#80b (new sections — Size L)**. Keep both under #80 on the tracker; land as two PRs.

### Verified current state

- Hardcoded empty sections at `src/lib/xml/exporter.ts:324–336`: `improvements, expenses, locations, critterpowers, metamagics, arts, enhancements, spirits, complexforms, martialarts, martialartmaneuvers, programs, vehicles` — emitted even when `character.magic.metamagics`, `resonance.complexForms`, `equipment.martialArts`, `expenseLog`, `improvements` etc. contain data. Note `<arts />`, `<enhancements />`, `<programs />`, `<complexforms />` are **not desktop SR4 elements at all** (absent from `clsCharacter.cs:226–691`) — they are junk to delete, and the real complex-form section `<techprograms>` is missing entirely.
- `<bioware>`: no export path exists; `equipment.bioware` is silently dropped (desktop expects it inside `<cyberwares>`, see D2).
- `<vehicles />` hardcoded at `exporter.ts:336` — handled by **#74b (epic 17)**, not here.
- `<avail>0</avail>` hardcoded: weapons :203, armor :230, cyberware :377, gear :415. `<source>SR4</source>`/`<page />` hardcoded: weapons :209–210, armor :232–233, cyberware :379–380, gear :417–418, qualities :259–260, spells :280–281, lifestyle :315–316, powers :348–349.
- `<movement>10/25, Swim 5</movement>` hardcoded at :25 (troll characters export human movement); `<mugshot />` at :30; `<uneducated>False`/`<uncouth>False`/`<infirm>False` at :75–77 regardless of qualities; `<initiationoverride>False` :73; `<buildkarma>0` :57 (wrong for karma-build characters — `settings.startingKarma` exists).
- Quality `<extra />` hardcoded at :253 although `CharacterQuality` carries `selectedSkill`/`selectedAttribute`/`customDescription` (`types/character.ts:66–70`).
- Fresh random GUIDs per export (D1). `<foci>`/`<stackedfoci>` sections are missing entirely (desktop writes them at `clsCharacter.cs:459–474`); `equipment.foci` is dropped.
- Skills export hardcodes `<attribute>AGI</attribute>`, `<skillgroup />`, `<grouped>False</grouped>`, `<allowdelete>True</allowdelete>`, `<ratingmax>6</ratingmax>` and omits `<source>`/`<page>` (exporter.ts:127–138) — but desktop `Skill.Save` writes real `grouped`/`allowdelete`/`ratingmax` and `source`/`page` (`clsUnique.cs:1807–1823`), and Azadeh carries 18 `grouped=True` + 75 `allowdelete=False` skills. Worse, the web importer **drops whole elements**: rating-0 skills (`importer.ts:314`) and skill groups outside its 14-name allowlist or at rating 0 (`importer.ts:353–377`); Azadeh has 87 `<skill>` (35 at rating 0) and 63 `<skillgroup>`, so re-export loses whole `<skill>`/`<skillgroup>` elements, not just fields. All out of scope for #80 (pre-existing skill-fidelity gap) but must be whitelisted with **whole-element paths** in #83 (a field-only entry cannot absorb missing elements).
- Existing tests: `src/lib/xml/__tests__/exporter.test.ts` (15 cases) — none assert the hardcoded empties, so re-ordering/section work will not break them.

### Design

**#80a — fidelity of existing sections.**

1. Introduce `src/lib/xml/export/writer.ts`:

```ts
export interface XmlOut {
	push(line: string): void;
	elem(name: string, value: string | number): void;   // escaped
	empty(name: string): void;                          // <name />
	open(name: string): void; close(name: string): void;
	readonly guidFor: (webId: string) => string;        // D1 mapper
	readonly indentLevel: number;                       // managed by open/close
}
export function createXmlOut(): XmlOut & { toString(): string };
```

2. All item writers take `(out: XmlOut, item: T)`. Replace hardcodings:
   - `avail`/`source`/`page` from the item fields added by **#82** (weapons/armor/cyberware/gear/qualities* /lifestyle). *Qualities: `source`/`page` are not on `CharacterQuality` — #82 adds them there too.
   - `movement` from `character.identity.movement` (#82); fall back to `''` (desktop Load guards it).
   - `uneducated/uncouth/infirm`: `hasFlag(char.improvements, 'Uneducated')` / `'Uncouth'` / `'Infirm'` (the improvement-based helper from #67 — do **not** re-derive from `character.qualities`, so non-quality sources of the flag survive; C4).
   - `buildkarma`: `character.buildMethod === 'karma' ? character.settings.startingKarma : 0`.
   - quality `<extra>`: `selectedSkill ?? selectedAttribute ?? customDescription ?? ''` (desktop stores exactly one selection string).
   - guids via `out.guidFor(item.id)`.
   - `<mugshot />` stays hardcoded until #102 (portrait model) — leave a `/* #102 */` comment.
3. Add missing desktop header scalars for diffability (all tolerated by desktop Load): `appversion` (constant `'500'` — whitelisted in #83), `gameedition` = `SR4` (desktop rejects files where this is present-and-not-SR4, `clsCharacter.cs:729–739`, so it must be exactly `SR4`), `gamenotes`, `burntstreetcred` 0, `groupname`/`groupnotes` empty, `essenceatspecialstart` = `character.attributes.ess` at export (approximation; whitelist), `blackmarket` False (desktop **always** writes it, `clsCharacter.cs:358` — real fixtures carry `<blackmarket>False</blackmarket>`, so omitting it is an unwhitelisted diff). The scalars desktop writes only **conditionally** (`ignorerules`, `iscritter`, `possessed`, `overridespecialattributeessloss` when their bool is set; `maxskillrating` when > 0; `magsplitadept`/`magsplitmagician` for mystic adepts; `response`/`signal` for A.I. metatypes — `clsCharacter.cs:297–408`) are not modeled by the web; they are **whitelisted in #83** rather than reproduced (real fixtures do carry some, e.g. Azadeh `<ignorerules>True</ignorerules>`).
4. Reorder sections per D4. Delete `<arts />`, `<enhancements />`, `<programs />`, `<complexforms />`.

**#80b — new section writers** (file `src/lib/xml/export/magic.ts`, `career.ts`, `equipment.ts`):

```ts
export function writeBiowareAsCyberware(out: XmlOut, bio: CharacterBioware): void;
export function writeFociGearAndRecords(out: XmlOut, foci: readonly CharacterFocus[]): void;
export function writeSpirits(out: XmlOut, magic: CharacterMagic | null, resonance: CharacterResonance | null): void;
export function writeTechPrograms(out: XmlOut, forms: readonly ComplexForm[]): void;
export function writeMartialArts(out: XmlOut, arts: readonly CharacterMartialArt[]): void;
export function writeMetamagics(out: XmlOut, magic: CharacterMagic | null, resonance: CharacterResonance | null): void;
export function writeInitiationGrades(out: XmlOut, magic: CharacterMagic | null, resonance: CharacterResonance | null): void;
export function writeImprovements(out: XmlOut, improvements: readonly Improvement[]): void;
export function writeExpenses(out: XmlOut, log: readonly ExpenseEntry[]): void;
```

Mapping decisions (all per D2 shapes):

- **Bioware** → `<cyberware>` inside `<cyberwares>` after real cyberware: `category` = `bio.category`, `limbslot` '', `ess` = `bio.essence`, `capacity` '', `rating` = `bio.rating`, `minrating`/`maxrating` 0, `subsystems` '', `grade` mapped to a **real desktop bioware grade** (`bioware.xml <grades>` = Standard, Standard (Second-Hand), Alphaware, Betaware, Deltaware), `location` '', `suite` False, `essdiscount` 0, `forcegrade` '' (empty element — desktop `_strForceGrade` defaults to `''` and real fixtures write `<forcegrade />`, `clsEquipment.cs:2306`/:2606; **not** `False`), `bonus` empty, `improvementsource` `Bioware`, `<children />`, notes. avail/source/page from #82 fields. **`'Cultured'` is a bioware *category*, not a grade** — the web's `'Cultured'` grade (a web-only 0.75-ess-multiplier concept, `BIOWARE_GRADES` `types/equipment.ts:246–249`) has no desktop grade counterpart, so write `<grade>Standard</grade>` for it (real cultured bioware is `<category>Cultured</category>`/`<grade>Standard</grade>`, verified in Scout Sniper.chum); writing `<grade>Cultured</grade>` is silently coerced to Standard by `ConvertToCyberwareGrade` on desktop reload (`clsEquipment.cs:2317–2328`). The `<ess>` value carries the essence, so grade coercion does not lose it.
- **Foci**: each `CharacterFocus` becomes (a) a `<gear>` element in `<gears>` with `category` = focus.category (e.g. `Foci`), `rating` = force, `bonded` = focus.bonded, cost/avail/source/page from item, and (b) when `bonded`, a `<focus>` record in `<foci>` with `gearid` = `out.guidFor(focus.id)` and `rating` = force. `<stackedfoci />` always empty (dead type).
- **Spirits**: `magic.spirits` → `<spirit>` with `name` = spirit.type, `crittername` '', `type` `Spirit`; `resonance.sprites` → `name` = sprite.type, `services` = tasks, `force` = rating, `bound` = registered, `type` `Sprite`. `file`/`relative` empty.
- **Complex forms** → `<techprogram>`: `category` `'Complex Forms'`, `rating`, `maxrating` = rating, `capacity` `'[0]'`… **verify against a desktop-generated technomancer file in #83; until then use** `capacity` `'0'`, `extra` '', `skill` '', `source`/`page` from #82. (Web `target`/`duration` are display-only fields with no desktop counterpart — not exported.)
- **Martial arts**: `rating` 1 (web has no style rating — #83 whitelist), each `techniques[i]` string → `<martialartadvantage>` `{guid, name, notes ''}`. `<martialartmaneuvers />` empty (no web model).
- **Metamagics**: `magic.metamagics` with `improvementsource` `Metamagic`, `resonance.echoes` with `Echo`; `paidwithkarma` False; name/source/page from the `CharacterMetamagic` shape (#82). `bonus` empty.
- **Initiation grades**: synthesized until #84 lands — for `magic.initiateGrade = n`, emit grades 1…n with `res` False, `group`/`ordeal` False; same for `resonance.submersionGrade` with `res` True. `writeInitiationGrades` is the single replacement point for #84.
- **Improvements**: field-for-field per D2 **including the `improvementttype` element-name typo**; `unique` omitted when `uniqueName === ''` (desktop omits it); `custom`/`customname`/`customid`/`customgroup`/`notes` written from the `Improvement` object (all modeled, `types/improvements.ts:176–180`), falling back to `False`/empty; `order` = array index (unmodeled on the web — #83 whitelist).
- **Expenses**: `date` = `entry.date` truncated to seconds ISO (`YYYY-MM-DDTHH:mm:ss`, matching desktop `ToString("s")`), `amount`, `reason`, `type` = `'Karma' | 'Nuyen'` (capitalize web's lowercase), `refund` from #82 field (default False). No `<undo>` block — desktop tolerates its absence (`_objUndo != null` guard on save; guarded load); ExpenseUndo is #88 (career epic).
- **Locations**: emit distinct non-empty `gear.location` values as `<location>` elements; `<armorbundles />`, `<weaponlocations />`, `<improvementgroups />`, `<calendar />` empty.
- **Critter powers**: `<critterpowers />` stays empty — no web model (out of scope; whitelist on import).

### Implementation steps

1. (#80a) Create `export/writer.ts` + `guid.ts`; port existing sections onto `XmlOut` unchanged in behavior. → verify: all 15 existing exporter tests pass unmodified; `npm run lint` clean (each section fn < 60 lines).
2. Replace avail/source/page/movement/flags/extra/buildkarma hardcodings; reorder per D4; delete junk elements; add header scalars. → verify: new tests `exports real avail`, `exports movement`, `derives uneducated flag` (below); grep the built XML in tests for `<arts` → absent.
3. (#80b) Implement the nine writers + wire into orchestrator. → verify: per-section tests below.
4. Round-trip smoke: export a fully-loaded synthetic character, re-import with the **current** importer, assert no exceptions (full fidelity asserted in #83 after #81).

### Test plan (`src/lib/xml/__tests__/exporter.test.ts` additions)

- `exports real avail with grade suffix`: weapon with `avail: '4R'` → `<avail>4R</avail>` (no `<avail>0</avail>` anywhere in output for a character whose items all carry avail).
- `exports movement from identity`: `identity.movement = '5/10, Swim 3'` (troll) → exact element.
- `derives uneducated/uncouth/infirm`: character with Uneducated quality → `<uneducated>True</uneducated>`, others False.
- `bioware exports into cyberwares`: one bioware (Muscle Toner 2, ess 0.4, web grade `Cultured`, category `Cultured`) → `<cyberwares>` contains a `<cyberware>` with `<improvementsource>Bioware</improvementsource>`, `<category>Cultured</category>`, `<grade>Standard</grade>` (web `Cultured` grade maps to desktop `Standard`), `<forcegrade />` (empty), `<ess>0.4</ess>`; **no** `<biowares>` element and **no** `<grade>Cultured</grade>`.
- `metamagics and echoes share one section`: magician with Centering (SR4 p.198) + a technomancer echo → two `<metamagic>` elements, improvementsource `Metamagic` and `Echo`, `<page>198</page>`.
- `spirits and sprites share one section`: bound Fire Spirit force 4 services 2 + registered Crack Sprite rating 3 tasks 1 → `<type>Spirit</type>` / `<type>Sprite</type>` with mapped force/services.
- `martial art advantages`: Savate with 2 techniques → `<martialart><name>Savate</name>…` with 2 `<martialartadvantage>` children (matches Quicksilver fixture shape).
- `initiation grades synthesized`: `initiateGrade: 3` → three `<initiationgrade>` elements, grades 1,2,3, `res` False.
- `improvements use the desktop typo`: one Attribute improvement → element `<improvementttype>Attribute</improvementttype>` present, `<improvementtype>` absent.
- `expense mapping`: `{type:'nuyen', amount:-350, reason:'Ares Predator IV', date:'2070-01-01T12:00:00.000Z'}` → `<type>Nuyen</type>`, `<date>2070-01-01T12:00:00</date>`.
- `guid stability`: export same character twice → identical output (deterministic once ids are UUIDs / mapper is per-call... assert instead: bonded focus's `<focus><gearid>` equals the focus gear's `<guid>` within one document).
- `section order`: index of `<spirits>` < `<techprograms>` < `<martialarts>` < `<armors>` in output string.

### Dependencies

- **#82** — avail/source/page on owned items; `identity.movement`; `CharacterMetamagic` shape; `ExpenseEntry.refund`; quality source/page. #80a cannot remove the hardcodings without it.
- **#74b (epic 17)** — `<vehicles>` writer and the shared `exportWeapon` extraction; if #80 lands first, keep `<vehicles />` hardcoded and leave the weapon writer in place for #74b to extract.
- **#84 (magic epic)** — replaces synthesized `writeInitiationGrades` internals with the real grade list; no interface change.
- **#102** — mugshot.

### Risks & edge cases

- Desktop rejects `gameedition` ≠ `SR4` with a modal error (`clsCharacter.cs:729–739`) — the element must be byte-exact.
- `Metamagic.Load` NPEs on missing `name/source/page` (`clsUnique.cs:4785–4791`) — never omit them even for unknown metamagics (fallbacks `'SR4'`/`'0'`).
- Karma-build characters: `<buildmethod>Karma`/`<buildkarma>` interplay is untested against desktop — flag in #83 fixture metadata.
- Numbers: web `essence` floats must serialize with `.` decimal separator regardless of locale (use `String(n)`, never `toLocaleString`); desktop parses ess as string so `0.4` is safe.
- A web character that never ran #82's migration (fresh import path) could have items without avail — writers must treat missing field as `'0'` defensively (TS makes fields required post-#82, but Firestore docs are migrated lazily; the migration in #82 runs on load, so exporter only ever sees migrated objects — assert once in dev mode).

---

## Issue #81: Import all character sections

**Labels:** `epic:xml2`, `priority:high` · **Size: L**

### Verified current state

- `src/lib/xml/importer.ts` hardcodes empty: `bioware: []`, `vehicles: []`, `martialArts: []`, `foci: []` (:190–193); `spirits: []`, `metamagics: []` inside `parseMagic` (:671–672); `complexForms: []`, `sprites: []`, `echoes: []` inside `parseResonance` (:687–689); `expenseLog: []` (:212); `improvements: []` (:180). Desktop files with any of these sections silently lose the data.
- File GUIDs are discarded — every parser calls `generateId()` (`timestamp-random`, :725–729), so improvement `sourcename` / focus `gearid` references can never be resolved and re-export mints new GUIDs (D1).
- `avail`/`source`/`page`/`bonded`/`equipped` on items are not parsed (e.g. weapons :448–465, gear :578–593) — blocked on #82 fields.
- **Encoding defect:** `importFromFile` (:734–742) uses `file.text()`, which per spec always decodes UTF-8 — but desktop saves are **UTF-16 LE with BOM** (verified: all 11 `bin/saves/**/*.chum`; desktop writes `Encoding.Unicode`, `clsCharacter.cs:229`). The `cleanXmlString` workaround (:71–85) strips NUL bytes, which "works" only for pure-ASCII content and corrupts any non-ASCII character (umlauts in names/notes become mojibake).
- Bioware in desktop files arrives inside `<cyberwares>` (D2) — `parseCyberware` (:503–553) currently imports bioware entries **as cyberware**, mis-typing them (wrong essence bucket: `calculateTotalEssenceCost` splits cyber/bio, `types/equipment.ts:595–597`).
- `parseCharacter` (:90–225) is one ~135-line function already over the ESLint limit — new sections must go in separate parser functions (D5).
- Existing tests: `src/lib/xml/__tests__/importer.test.ts` (24 cases, inline XML strings, UTF-8).

### Design

**Encoding.** Replace `importFromFile`'s `file.text()` with:

```ts
/** src/lib/xml/import/decode.ts */
export function decodeXmlBytes(buf: ArrayBuffer): string;
// BOM sniff: FF FE -> TextDecoder('utf-16le'); FE FF -> 'utf-16be'; else 'utf-8'.
// Strips the BOM char. cleanXmlString's NUL-stripping and space-collapsing hacks are deleted
// (keep the plain BOM strip for importFromChummer string callers).
```

`importFromFile` becomes `decodeXmlBytes(await file.arrayBuffer())` → `importFromChummer`.

**GUID adoption.** Shared helper in `import/sections.ts`:

```ts
function idFrom(node: unknown): string;  // getString(node,'guid') when isGuid(), else generateId()
```

Applied in every existing parser (weapons, armor, cyberware, gear, qualities, contacts, spells, powers, lifestyle) and all new ones.

**New parsers** (`src/lib/xml/import/sections.ts`, each < 60 lines):

```ts
export function splitCyberwareAndBioware(cyberwares: unknown): {
	cyberware: CharacterCyberware[]; bioware: CharacterBioware[] };
export function parseMetamagics(node: unknown): {
	metamagics: CharacterMetamagic[]; echoes: CharacterMetamagic[] };   // split on <improvementsource>
export function parseSpirits(node: unknown): { spirits: BoundSpirit[]; sprites: CompiledSprite[] }; // split on <type>
export function parseTechPrograms(node: unknown): ComplexForm[];
export function parseMartialArts(node: unknown): CharacterMartialArt[];
export function parseFoci(gear: CharacterGear[], fociNode: unknown): {
	foci: CharacterFocus[]; remainingGear: CharacterGear[] };
export function parseExpenses(node: unknown): ExpenseEntry[];
export function parseImprovements(node: unknown): Improvement[];
export function parseInitiationGrades(node: unknown): { magicGrade: number; resonanceGrade: number };
```

Mapping decisions:

- **Bioware split**: route `<cyberware>` entries with `improvementsource === 'Bioware'` to `CharacterBioware`. The web `grade` (`'Standard'` | `'Cultured'`) must be keyed off the desktop **`<category>`, not `<grade>`** — real cultured bioware is `<category>Cultured</category>`/`<grade>Standard</grade>` (verified in Scout Sniper.chum), so `<category>` containing `Cultured` → web grade `'Cultured'`, else `'Standard'` (desktop `<grade>` values Standard/Alphaware/… all map to web `'Standard'`, which is all the web models). Keying off `<grade>` (as originally specced) would never fire on desktop files. `<category>` is preserved into `bio.category` and `<ess>` verbatim into `bio.essence`, so essence survives regardless of grade label. Bioware `<children>` (legal in desktop, rare in practice) are **flattened** into additional top-level bioware entries so essence/cost survive — documented lossy transform, #83 whitelist entry.
- **Metamagics/echoes**: `improvementsource` `Echo` → `resonance.echoes`, everything else → `magic.metamagics`, into the `CharacterMetamagic` shape (#82) with `source`/`page` from the file.
- **Spirits**: `<type>Sprite</type>` → `CompiledSprite { type: name, rating: force, tasks: services, registered: bound }`; else `BoundSpirit { type: name, force, services, bound }`. `crittername`/`file`/`relative` dropped (#83 whitelist).
- **Tech programs** → `ComplexForm { name, rating, target: '', duration: '', notes }` (no desktop counterpart for target/duration; UI already tolerates empty strings).
- **Martial arts** → `CharacterMartialArt { id, name, techniques: advantages.map(a => a.name) }`; `rating` and `source`/`page` dropped until the model grows them (#83 whitelist; flagged to content epic). `<martialartmaneuvers>` unparsed (#83 whitelist).
- **Foci**: join `<foci>/<focus>` records to gear by `gearid`; every gear entry whose `category` contains `'Foci'` (desktop categories: `Foci`, plus stacked-focus gear) leaves the gear list and becomes `CharacterFocus { force: rating, bonded: hasFocusRecord || gear.bonded }`. Gear with a focus record but a non-Foci category stays gear (defensive).
- **Expenses** → `ExpenseEntry { id: idFrom, date: raw ISO string, type: lowercased 'karma'|'nuyen', amount, reason, refund }` (#82 adds `refund`). `<undo>` blocks are **dropped** — #88 (career epic) owns ExpenseUndo; #83 whitelists `<undo>` until then.
- **Improvements — parse, don't re-derive.** Decision: parse `/character/improvements/improvement` directly into `character.improvements`. Rationale: (a) desktop itself loads improvements from the file rather than re-deriving on load — parsing is the parity behavior; (b) re-running `createImprovementsFromBonus` (`engine/improvementManager.ts:102`) requires game data the importer doesn't have (pure sync function) and epic 16's write-side (#61–#71) is still incomplete, so re-derivation would *lose* bonuses the web can't produce yet; (c) with GUID adoption, `sourcename` matches the imported items' ids, so epic 16's `removeImprovements(source, sourceName)` works on imported characters unchanged. Field mapping per D2 — read `improvementttype` (typo) **and** fall back to `improvementtype` defensively; validate `type` against the `ImprovementType` union (`types/improvements.ts:11`) and `source` against the `ImprovementSource` union (`:105`), skipping unknown values with a collected warning (note `:139` is the `Improvement` *interface*, not the type union). Web `Improvement.id` = fresh `generateId()` (desktop improvements have no guid). Parse `custom`/`customName`/`customId`/`customGroup`/`notes` — the `Improvement` type already declares them (`types/improvements.ts:176–180`), so dropping them would be unforced data loss; only `order` is unmodeled and dropped (#83 whitelist).
	- **Interplay with epic 16:** import must NOT additionally run bonus re-derivation for qualities — that would double improvements. `parseQualities` keeps producing plain qualities; the improvements arrive solely from `<improvements>`.
- **Initiation grades**: `magicGrade` = max `grade` among entries with `res=False`, `resonanceGrade` = max among `res=True`; cross-check against scalar `<initiategrade>`/`<submersiongrade>` (scalar wins on mismatch, warn). Full grade-list storage is #84; this parser is its single replacement point.
- **Vehicles**: `parseVehicles` is specified in **#74b (epic 17)** — do not implement here; keep `vehicles: []` until #74b, or land after it and wire its parser in.
- **avail/source/page**: every item parser reads them into the #82 fields (`getString(node,'avail')`, `getString(node,'source')`, `getNumber(node,'page')`), fallbacks `'0'`/`'SR4'`/`0`.
- **Import result surface**: extend `ImportResult` with `warnings?: readonly string[]` (skipped improvements, flattened bioware children, unparsed maneuvers) so the UI can surface partial imports. Additive/optional → no caller breaks (`exactOptionalPropertyTypes`: only set the property when non-empty).

### Implementation steps

1. `decode.ts` + `importFromFile` rewrite. → verify: new test decodes a UTF-16 LE fixture (`bin/saves/.../Azadeh.chum` copied to fixtures) and parses `name` correctly; existing UTF-8 string tests still pass.
2. GUID adoption across existing parsers. → verify: test `adopts desktop guids as ids` (import Azadeh fixture; a quality id matches its `<guid>` in the file).
3. avail/source/page parsing (post-#82). → verify: `imports item metadata` test.
4. `splitCyberwareAndBioware` + wire. → verify: synthetic bioware XML routes to `equipment.bioware`; essence buckets correct via `calculateTotalEssenceCost`.
5. Remaining parsers, one commit each, wired into `parseCharacter` (which shrinks to orchestration + object assembly). → verify: per-section tests below; `npm run lint` (function-size) clean.
6. `warnings` plumbing. → verify: importing XML with an unknown improvement type yields `success: true` + 1 warning.

### Test plan (`importer.test.ts` additions; fixture tests in #83)

- `decodes UTF-16 LE desktop file`: Azadeh fixture → `identity.name` parses correctly, no mojibake.
- `splits bioware from cyberware`: `<cyberwares>` with Wired Reflexes 2 (`improvementsource` Cyberware, ess 3) + Muscle Toner 2 (`improvementsource` Bioware, `<category>Cultured</category>`, `<grade>Standard</grade>`, ess 0.4) → 1 cyberware + 1 bioware; bioware `grade === 'Cultured'` (keyed off category), `category === 'Cultured'`, `essence === 0.4`.
- `splits metamagics and echoes`: Centering (Metamagic) + an `improvementsource=Echo` entry → `magic.metamagics.length === 1`, `resonance.echoes.length === 1` (resonance enabled in fixture XML).
- `splits spirits and sprites`: Guardian Spirit (force 12, services 10, bound True, type Spirit — Rainwalker values) + Crack Sprite (type Sprite, force 3, services 1) → `spirits[0].force === 12`; `sprites[0].rating === 3`, `.tasks === 1`.
- `parses techprograms`: one `<techprogram>` rating 4 → `resonance.complexForms[0].rating === 4`.
- `parses martial arts`: Savate with 2 advantages (Quicksilver shape) → `techniques.length === 2`.
- `joins foci to gear`: gear (category Foci, rating 4, guid G) + `<focus>` with `gearid` G → `equipment.foci[0]` has `force: 4, bonded: true`, gear list no longer contains it.
- `parses expenses`: Azadeh's `Starting Nuyen` entry → `{ type: 'nuyen', amount: 0, reason: 'Starting Nuyen', refund: false }`, date preserved.
- `parses improvements with typo element`: `<improvementttype>Attribute</improvementttype>` → `type === 'Attribute'`; unknown type `Foo` → skipped + warning.
- `derives grades`: 4 grades res=False + `<initiategrade>4</initiategrade>` (Azadeh) → `magic.initiateGrade === 4`.
- `quality selections`: `<extra>Pistols</extra>` on Aptitude → `selectedSkill === 'Pistols'` (heuristic: extra maps to selectedSkill/selectedAttribute by matching known skill/attribute names, else `customDescription`).

### Dependencies

- **#82** — avail/source/page fields, `CharacterMetamagic`, `ExpenseEntry.refund`, quality source/page (import writes into them).
- **#80b** — shared D2 shape knowledge only; no code dependency (import can land before or after export).
- **#74b (epic 17)** — vehicle parsing.
- **Epic 16 (#61–#71)** — no hard dependency, but the "parse, don't re-derive" contract above must be honored by #61–#71's write-side (imported items must not get double improvements when later edited: `removeImprovements` by sourceName covers it).
- **#84** — replaces `parseInitiationGrades` internals.

### Risks & edge cases

- fast-xml-parser with `parseAttributeValue: true` coerces `<page>198</page>` to number but `<avail>4R</avail>` stays string — the mixed `getNumberOrString` pattern (:712–717) must be used for avail-like fields; add explicit `String(...)` normalization.
- Desktop `<ess>` uses invariant-culture decimals, but files written under some locales historically contain `,` decimals — parse with `parseFloat(String(v).replace(',', '.'))` (existing cyberware parser :541 already does `parseFloat`; extend with the comma fix).
- `ensureArray` (:719–723): single-child sections arrive as objects, not arrays — every new parser must go through it (existing convention).
- Files where `magenabled=False` but metamagic entries exist (corrupt/hand-edited): parsers must not crash — metamagics without a `magic` object are dropped with a warning.
- Focus gear with quantity > 1 (desktop allows qty on gear): split into one `CharacterFocus` and warn; foci are qty-1 in practice.
- Improvement `val` etc. are ints in desktop but may carry values the web engine never produces (e.g. EssenceLoss improvements in the Gunnery fixture) — no clamping; import verbatim.

---

## Issue #82: Availability and metadata fidelity in the data model

**Labels:** `epic:xml2`, `priority:medium` · **Size: L** · **Implement FIRST in this epic** (see order note) — #80/#81 consume its fields.

> Scope note vs the plan: the plan lists "Exporter writes real values; importer parses them" as an #82 task. That wiring is specced in #80a/#81 to keep this issue XML-free; #82 delivers the model, purchase-time population, and migration only.

### Verified current state

- Catalog (`Game*`) types all carry `avail: string` / `source: string` / `page: number` (`types/equipment.ts:59–62` weapons, `:124–127` armor, `:199–202` cyberware, `:256–259` bioware, `:289–292` vehicles, `:396–399` gear, `:353–354` martial arts, `:459–460` lifestyles) — the data exists in `static/data/*.json`.
- Owned (`Character*`) types carry **none** of them: `CharacterWeapon` (`types/equipment.ts:66–83`), `CharacterArmor` (:131–143), `CharacterCyberware` (:209–222), `CharacterBioware` (:263–272), `CharacterVehicle` (:318–334), `CharacterGear` (:406–427), `CharacterFocus` (:481–489), `CharacterLifestyle` (:464–472), `CharacterMartialArt` (:358–362), and `CharacterQuality` (`types/character.ts:58–71`). The metadata is discarded at purchase time, forcing the exporter's `<avail>0</avail>`/`<source>SR4</source>`/`<page />` hardcodings and blocking #93 (max-availability enforcement, `validation.ts:422–423` no-op).
- Cyberware grade avail modifier exists but is unused for avail: `CYBERWARE_GRADES` (`types/equipment.ts:185–191`) — only `Used` is non-zero (−1).
- `movement`: game data has it (`Metatype.movement`, `types/character.ts:29`); `CharacterIdentity` (:122–135) does not; exporter hardcodes `'10/25, Swim 5'` (`exporter.ts:25`). `setMetatype` receives full `gameData` in both copies — `stores/character.ts:288` (the one the wizard uses, `MetatypeSelector.svelte:3`) and the duplicate `stores/creation.ts:181`.
- `CharacterMagic.metamagics: readonly string[]` (`types/character.ts:250`) and `CharacterResonance.echoes: readonly string[]` (:299) — names only; desktop `<metamagic>` needs `source`/`page` (and `Metamagic.Load` NPEs without them, `clsUnique.cs:4785–4791`). `static/data/metamagic.json` entries carry `{ name, adept, magician, source, page }` (verified: Centering → SR4 p.198). Mutations: `learnMetamagic` (`stores/magic.ts:359–388`), `removeMetamagic` (:391+).
- `ExpenseEntry` (`types/character.ts:90–96`): `{ id, date, type: 'karma'|'nuyen', amount, reason }` — no `refund` (desktop expense element has it, D2).
- Migration infrastructure: `src/lib/stores/migrations.ts` + hooks in `persistence.ts:37–58` are introduced by **epic 17 #76** (shared decision 4 there). If #82 lands before #76, this issue creates the file and hook exactly as specced there.

### Design

```ts
/** types/equipment.ts — shared metadata block (new, near top) */
export interface ItemMetadata {
	/** Desktop availability string: '4', '8R', '12F', '—'. '0' when unknown. */
	readonly avail: string;
	/** Sourcebook code ('SR4', 'AR', 'AUG', …). */
	readonly source: string;
	/** Rulebook page; 0 when unknown. */
	readonly page: number;
}
```

- `CharacterWeapon`, `CharacterArmor`, `CharacterCyberware`, `CharacterBioware`, `CharacterVehicle`, `CharacterGear`, `CharacterFocus` each gain the three fields (`extends ItemMetadata` on the interface declaration). `CharacterLifestyle` and `CharacterMartialArt` gain `source`/`page` only (no avail concept). `CharacterQuality` gains `source: string` / `page: number`.
- Fields are **required** (not optional) — `exactOptionalPropertyTypes` makes optional metadata infectious at every use site; the migration guarantees presence at runtime.

```ts
/** types/character.ts — replaces `metamagics: readonly string[]` and `echoes: readonly string[]` */
export interface CharacterMetamagic {
	readonly id: string;
	readonly name: string;
	readonly source: string;   // '' allowed pre-#81-import; exporter falls back to 'SR4'
	readonly page: number;
}
// CharacterMagic.metamagics: readonly CharacterMetamagic[]
// CharacterResonance.echoes: readonly CharacterMetamagic[]
```

- `CharacterIdentity.movement` (`readonly movement: string`, desktop format `'10/25, Swim 5'`) is **owned by #70** (engine epic, M8) — which adds the field, its `setMetatype` population, and the load backfill. #82 does **not** re-declare or re-populate it; it only *reads* `identity.movement` for export (DUP3). Since #70 (M8) lands before #82 (M10), the field is already present.
- `ExpenseEntry` gains `readonly refund: boolean` (desktop parity; #88 will use it for undo semantics).

**Purchase-time population.** In the consolidated `stores/equipment/` modules (post-#75): `addWeapon`/`addArmor`/`addGear`/`addBioware`/`addVehicle`/`addFocus` copy `source`/`page` verbatim from the `Game*` argument and `avail` via `resolveAvail` (below). `addCyberware` additionally applies the grade modifier:

```ts
/** stores/equipment/avail.ts (new) */
export function resolveAvail(availExpr: string, rating: number): string;
// Catalog avail is frequently an EXPRESSION, not a literal — resolve with the known rating at purchase:
//   'FixedValues(8R,12R,20R)' -> element at index (rating-1)  ->  rating 1 => '8R'
//   'Rating * 3' / '(Rating * 5)R' -> N*rating with any suffix preserved  ->  rating 2 => '10R'
//   plain '8R' / '4' / '12F' / '—' / '' -> returned unchanged
export function applyAvailModifier(avail: string, modifier: number): string;
// applied AFTER resolveAvail, only for graded cyberware:
// '8R' + (-1) -> '7R'; '4' + 0 -> '4'; non-numeric prefixes ('—', '') returned unchanged.
```

Catalog examples that are expressions, not literals: Wired Reflexes `avail: 'FixedValues(8R,12R,20R)'` (`static/data/cyberware.json`), Muscle Toner `'(Rating * 5)R'`, Audio Enhancement `'Rating * 3'` — a naïve verbatim copy stores the expression string, which then leaks into `<avail>` on export (desktop-born files carry resolved values, e.g. Scout Sniper's Reflex Recorder `<avail>10</avail>`).

`addQuality` (`stores/character.ts:607`) and `addQualityAgain` (`:688`) copy quality `source`/`page` from `qualities.json` — as do the duplicate `addQuality`/`addQualityAgain` in `stores/attributes.ts:252`/`:305`, which also construct `CharacterQuality` (compile-enforced by the new required fields). (The lines `:644`/`:709` are the `createImprovementsFromBonus` call sites *inside* those functions; `:783` is inside `removeQuality`, which does not add a quality.) `learnMetamagic`/`removeMetamagic` (`stores/magic.ts:359`/`:391`) and `learnEcho` (`stores/technomancer.ts:101`, re-exported via `stores/index.ts:172` — **not** `stores/resonance.ts`, which does not exist) switch to `CharacterMetamagic`, looking up `source`/`page` from the `metamagic.json` entry passed by the caller (signature change: `learnMetamagic(meta: { name: string; source: string; page: number })`; UI call sites already have the full object from `gameData`). Dead duplicates `learnEcho` (`stores/character.ts:3814`) and `learnMetamagic` (`:4008`) must be updated too once the shape changes (all caught by `npm run check`).

**Migration** (`stores/migrations.ts`):

```ts
export function migrateItemMetadata(char: Character): Character;
// - every owned item missing avail/source/page -> { avail: '0', source: 'SR4', page: 0 }
//   ('SR4' matches what the exporter wrote historically; avail '0' is the plan-sanctioned fallback)
// - identity.movement backfill is owned by #70 (DUP3) — not done here
// - magic.metamagics / resonance.echoes: string entries -> { id: generateId(), name: s, source: '', page: 0 }
// - expenseLog entries missing refund -> false
// Idempotent: presence checks only; already-shaped objects pass through unchanged.
```

Wired into `loadSavedCharacter` (`persistence.ts:37–50`) and `loadImportedCharacter` (:53–58) per epic 17's migration convention. Firestore docs rewrite lazily on next save — no backfill job.

**UI ripples** (compile-time enforced by `npm run check`): `CareerAdvancement.svelte` metamagic tab (renders `metamagics` as strings today, plan §6) switches to `.name`; any `{#each}` over echoes likewise. No other component reads the new fields yet.

### Implementation steps

1. Add `ItemMetadata`, extend owned types, `CharacterMetamagic`, `identity.movement`, `ExpenseEntry.refund`. → verify: `npm run check` lists every construction site that must be updated; fix them all in this commit (test factories included).
2. `resolveAvail` + `applyAvailModifier` + population in `stores/equipment/` add-functions and `addQuality`/`learnMetamagic`/`learnEcho` (each has duplicate/dead copies until #75 — `addQuality` in `attributes.ts`, `learnEcho`/`learnMetamagic` dead copies in `character.ts`; update every copy, all compile-enforced). `setMetatype` movement population is **owned by #70** (DUP3), not touched here. → verify: unit tests below.
3. `migrateItemMetadata` + persistence hooks. → verify: migration tests below; loading a pre-#82 JSON snapshot (fixture) yields a fully-typed character.
4. Full suite. → verify: `npm run test:unit` green; `npm run lint` green.

### Test plan

- `applyAvailModifier` (`stores/__tests__/equipment.test.ts` or new `avail.test.ts`): `('8R', -1) → '7R'`; `('4', 0) → '4'`; `('12F', -1) → '11F'`; `('—', -1) → '—'`; `('', -1) → ''`.
- `resolveAvail` (`avail.test.ts`): `('FixedValues(8R,12R,20R)', 1) → '8R'`, `(…, 2) → '12R'`; `('(Rating * 5)R', 2) → '10R'`; `('Rating * 3', 4) → '12'`; `('8R', 3) → '8R'`; `('—', 1) → '—'`.
- `addCyberware preserves avail with grade` — Wired Reflexes 1 (catalog avail `FixedValues(8R,12R,20R)` → `resolveAvail` at rating 1 yields `'8R'`, SR4 p.342, 11 000¥): Standard → `'8R'`; Used → `'7R'`; Alphaware → `'8R'` (modifier 0). Assert `source === 'SR4'`, `page` equals the catalog value (compare against the loaded catalog entry, not a literal, to survive data corrections).
- `addWeapon copies metadata`: pick first weapon from `weapons.json`, assert the three fields equal the catalog entry.
- `movement export reads identity.movement`: Troll character with `identity.movement` populated by #70 → exporter emits the exact string (the `setMetatype`-stores-movement test itself belongs to #70, DUP3).
- `learnMetamagic stores source/page`: Centering → `{ name: 'Centering', source: 'SR4', page: 198 }` (real values verified in `metamagic.json`).
- `migrateItemMetadata idempotent`: legacy character (fields absent, metamagics `['Centering']`) → migrated twice === migrated once (deep equal); avail `'0'`, source `'SR4'`, metamagic object shape.
- `expense refund default`: legacy expense entry → `refund === false`.

### Dependencies

- **#75 (epic 17)** — store consolidation; without it, population must be duplicated into the `stores/character.ts` copies the wizard actually calls (see epic 17 shared decision 1). Landing after #75 is strongly preferred.
- **#76 (epic 17)** — `migrations.ts` file + persistence hooks (create them here if #76 hasn't landed, same spec).
- Consumed by **#80a/#81** (XML wiring) and **#93** (availability enforcement, rules epic).

### Risks & edge cases

- **#84/#85 (magic epic) collision:** #84 restructures initiation and touches `CharacterMagic`; `CharacterMetamagic` here is intentionally minimal (no `paidwithkarma`, no bonus payload) so #84/#85 can extend rather than replace it. Coordinate the `learnMetamagic` signature change with whoever picks up #85 (foci/metamagic improvements).
- In-flight uncommitted work (#99) already adds fields to `CharacterMagic` (`initiations`) — rebase hazard; #99 must be resolved first (plan Part II, package 0).
- Avail strings in catalogs come in **three expression classes**, all resolved by `resolveAvail` at purchase (the rating and grade are known then): (a) `FixedValues(a,b,c)` — rating-indexed selection (Wired Reflexes `'FixedValues(8R,12R,20R)'`); (b) `Rating * N` and `(Rating * N)R` — arithmetic with suffix preserved (Muscle Toner `'(Rating * 5)R'`, Audio Enhancement `'Rating * 3'`); (c) plain literals (`'8R'`, `'4'`, `'—'`, `''`) returned unchanged. Plain string substitution ("only if the string contains `Rating`") is **not** sufficient — it mishandles both `FixedValues(...)` and the parenthesised `(Rating * N)R` form. Mirror of epic 17's cost-expression approach. Never store `NaN` or an unresolved expression string; if a class is unrecognised, store `'0'` and warn.
- Firestore documents have a 1 MiB limit — three small fields per item are negligible (< 1 KB for a loaded character).
- `page: number` vs desktop `<page>` being a *string* element: desktop stores strings ('198'); web keeps number and stringifies on export; pages like '52-53' in some catalogs would break `getNumber` — the converters already normalize page to number in JSON (verified for metamagic.json); if a string page appears, `Number()` fallback 0 applies.

---

## Issue #83: Desktop round-trip validation suite

**Labels:** `epic:xml2`, `priority:medium`, `testing` · **Size: M**

### Verified current state

- No round-trip tests exist: `src/lib/xml/__tests__/` holds only `exporter.test.ts` (15 cases) and `importer.test.ts` (24 cases), all on small inline XML strings. Nothing proves import → export preserves a real desktop file.
- **Real fixtures exist in-repo**: `bin/saves/10 Mercs/**/*.chum` — 11 desktop-generated SR4 files, UTF-16 LE + BOM, CRLF (untracked in git per `?? bin/data/...` status; `bin/saves` provenance is the desktop Chummer sample distribution). Verified coverage (D6): initiation grades ✓ (Azadeh 4, Quicksilver 8, Rainwalker 16), metamagics ✓ (5/8/14), spirits ✓ (Rainwalker 20), martial arts ✓ (Quicksilver: Savate, rating 2, 2 advantages), cyberware with EssenceLoss/ArmorMod/Gear improvements ✓ (Gunnery Sergeant), bioware ✓ (Scout Sniper: Reflex Recorder + Sleep Regulator in `<cyberwares>`, `improvementsource` Bioware, category Cultured/grade Standard), expenses ✓ (all). **Not covered by any fixture: populated vehicles, techprograms/sprites (all have `<resenabled>False`), bonded foci** (`<foci />` empty everywhere).
- `fast-xml-parser` is already a dependency (used by the importer) and supports `preserveOrder` — sufficient for structural diffing; no new dependency needed.

### Design

**Fixture set** — `src/lib/xml/__tests__/fixtures/`:

| File | Source | Archetype exercised |
| --- | --- | --- |
| `azadeh.chum` | copy of `bin/saves/10 Mercs/New Assets/Azadeh.chum` | initiated mage, metamagics w/ `<extra>`-style selections, improvements, expenses |
| `quicksilver.chum` | copy | adept, martial art + advantages, 8 grades |
| `rainwalker.chum` | copy | conjurer, 20 spirits, 16 grades, 14 metamagics |
| `gunnery-sergeant.chum` | copy | street sam: nested cyberware, armor, gear, EssenceLoss improvements |
| `scout-sniper.chum` | copy of `bin/saves/10 Mercs/Free Marine Corps/Scout Sniper.chum` | **real bioware in `<cyberwares>`** (Cultured category / Standard grade), cyberware with avail expressions (`FixedValues`, `Rating * N`) — exercises `splitCyberwareAndBioware` and `resolveAvail` against desktop data |
| `synthetic-technomancer.chum` | hand-built per D2 shapes | techprograms, sprites, echoes, submersion grades |
| `synthetic-rigger.chum` | hand-built per D2 shapes | vehicle + mods + mounted weapon (activates once #74b lands), bonded focus gear (synthetic bioware no longer needed — `scout-sniper.chum` covers the real path) |
| `fixtures/expected.json` | recorded values | per-fixture derived-stat goldens (see below) |

Synthetic files are UTF-16 LE + BOM like the real ones (exercises `decodeXmlBytes`) and carry a `<gamenotes>SYNTHETIC FIXTURE — built from clsCharacter.cs Save() shapes, not desktop output</gamenotes>` marker. **`.gitattributes` must mark `*.chum binary`** — git's CRLF autoconversion corrupts UTF-16 files on checkout.

**Harness** — `src/lib/xml/__tests__/roundtrip.test.ts`:

```ts
// per fixture:
const xml1 = decodeXmlBytes(readFileSync(path).buffer);
const r = importFromChummer(xml1, 'test-user');           // success + bounded warnings
const xml2 = exportToChummer(r.character!);
const diff = diffXml(normalize(parse(xml1)), normalize(parse(xml2)), WHITELIST);
expect(diff).toEqual([]);
```

Support module `src/lib/xml/__tests__/support/xmlDiff.ts`:

```ts
export interface XmlDiffEntry { readonly path: string; readonly kind: 'missing'|'extra'|'changed'; readonly a?: string; readonly b?: string }
export function diffXml(a: ParsedNode, b: ParsedNode, whitelist: readonly WhitelistEntry[]): XmlDiffEntry[];
export interface WhitelistEntry { readonly path: RegExp; readonly reason: string; readonly removeWhen: string }
```

Normalization rules (applied to both sides): `True/true` case-fold; numeric strings canonicalized (`0.40` ≡ `0.4`; `,` decimal → `.`); `<x />` ≡ `<x></x>` ≡ missing-when-empty-string; date values truncated to seconds; element order preserved (D4 makes export order match); GUIDs compared verbatim (D1 adoption makes them survive).

**Initial whitelist** (every entry carries `reason` + `removeWhen`; the harness **fails if an entry matches nothing** so entries cannot rot):

| Path (regex over slash-path) | Reason | Remove when |
| --- | --- | --- |
| `character/appversion` | web writes a constant | never (documented) |
| `character/essenceatspecialstart` | approximated at export | #84 |
| `character/gamenotes` | not modeled | content epic |
| `character/expenses/expense/undo(/.*)?` | ExpenseUndo not modeled | #88 |
| `character/martialarts/martialart/rating` | style rating not modeled | content epic |
| `character/martialartmaneuvers(/.*)?` | maneuvers not modeled | content epic |
| `character/vehicles(/.*)?` | vehicle XML | #74b |
| `.*/weapon/(spec2?|useskill|ammocategory|ammoremaining[2-4]|ammoloaded[2-4]?|range|rangemultiply|fullburst|suppressive|included|installed|requireammo|weaponname)` | weapon fidelity fields not modeled | #72 / content epic |
| `.*/gear/(avail(3|6|10)|cost(3|6|10)|costfor|extra|homenode|response|firewall|system|signal|gearname|includedinparent|childcostmultiplier|childavailmodifier|weaponbonus|bonus|discountedcost|armorcapacity|minrating|maxrating)` | gear matrix/pricing tiers not modeled | #79 (matrix), rest documented |
| `.*/cyberware/(limbslot|subsystems|essdiscount|suite|bonus|allowgear|weaponguid|discountedcost|minrating|maxrating)` | cyberware fidelity fields not modeled (`forcegrade` removed — #80b now writes `<forcegrade />` empty, matching desktop) | #77 / documented |
| `.*/armor/(armorname|extra|armormods(/.*)?|gears(/.*)?|discountedcost)` | armor mods/gear | #73 |
| `character/skills/skill(/.*)?` | web stores only learned skills — rating-0 skills are dropped on import (`importer.ts:314`), so whole `<skill>` elements go missing; surviving skills also diff on hardcoded `attribute`/`grouped`/`allowdelete`/`ratingmax` and omitted `source`/`page` (whole-element path, not field-only) | skills fidelity follow-up (flag to #61–#71 owners) |
| `character/skillgroups/skillgroup(/.*)?` | web drops rating-0 groups and groups outside its 14-name allowlist (`importer.ts:353–377`); whole `<skillgroup>` elements go missing | skills fidelity follow-up |
| `character/(ignorerules\|iscritter\|possessed\|overridespecialattributeessloss\|maxskillrating\|magsplitadept\|magsplitmagician\|response\|signal)` | desktop header/A.I./mystic-adept scalars the web does not model (`clsCharacter.cs:297–408`); present-and-non-empty in some fixtures (e.g. Azadeh `ignorerules=True`) so `missing-when-empty` normalization cannot absorb them | documented / A.I. + mystic-adept support |
| `character/improvements/improvement/order` | improvement `order` index not modeled on the web (all other fields — including `custom`/`customname`/`customid`/`customgroup`/`notes`, which the `Improvement` type already declares — are parsed and re-exported) | documented |
| `character/spirits/spirit/(crittername|file|relative)` | not modeled | documented |
| `character/(locations|armorbundles|weaponlocations|improvementgroups|calendar)(/.*)?` | partial/no model | #80b emits locations; rest documented |
| `character/qualities/quality/(mutant|weaponguid|contributetolimit|print|qualitysource)` | quality fidelity flags | documented |

Every entry must be re-justified in the PR description; the acceptance criterion from the plan stands: *whitelist empty or every entry documented and justified* — the table above **is** that documentation and ships in `support/whitelist.ts` as code comments.

**Derived-stat goldens.** The `.chum` files already embed desktop-computed values: per-attribute `<totalvalue>`, `<totaless>`, skill `<totalvalue>`. `expected.json` is generated once by a script (`scripts/extract-chum-goldens.ts`, dev-only) that pulls those elements per fixture; the test asserts after import: `character.attributes.ess` ≈ `totaless` (±0.01), each attribute `base + bonus` = `totalvalue`. Skill dice-pool assertions are **deferred to epic 16 goldens (#71)** — they fail today because improvements aren't consumed by `calculateDicePool` (plan §3.5); the test file marks them `it.todo` with a pointer to #71.

### Implementation steps

1. Copy the 5 real fixtures (Azadeh, Quicksilver, Rainwalker, Gunnery Sergeant, Scout Sniper) + `.gitattributes` entry. → verify: `git diff --stat` shows binary; re-checkout leaves bytes identical (`sha1sum` before/after).
2. Build `xmlDiff.ts` + normalization with its own unit tests. → verify: `xmlDiff` detects an injected single-element change in a fixture; whitelist suppresses a matching path; unmatched whitelist entry fails.
3. `roundtrip.test.ts` over the 5 real fixtures. → verify: green with the initial whitelist. This requires both #80a's added scalars (esp. `blackmarket`, always present in fixtures) **and** the whitelist's skill/skillgroup whole-element entries and unmodeled-scalar entry (`ignorerules` etc.) — see the whitelist table; without them every real fixture diffs on dropped rating-0 skills, dropped skill groups, and non-empty header scalars the web cannot reproduce. The failing diff output (before whitelisting) is pasted into the PR as the audit trail.
4. Author the 2 synthetic fixtures + add to the suite. → verify: technomancer fixture exercises `parseTechPrograms`/sprites/echoes paths (coverage report shows the parsers hit).
5. `extract-chum-goldens.ts` + `expected.json` + derived-stat assertions. → verify: ess/attribute assertions pass on all 6 fixtures.
6. Wire into CI once #104 (CI epic) exists — until then `npm run test:unit` covers it.

### Test plan

The suite **is** the test plan; concrete named cases:

- `azadeh round-trips within whitelist` (+ same for quicksilver / rainwalker / gunnery-sergeant / scout-sniper / both synthetics).
- `scout-sniper: bioware round-trips`: the two Bioware entries land in `equipment.bioware` with `category === 'Cultured'`, and re-export writes them back into `<cyberwares>` as `<improvementsource>Bioware</improvementsource>`/`<grade>Standard</grade>`/`<forcegrade />`. (Avail is imported and re-exported **verbatim** on the round-trip path — the file's own `avail` strings, resolved or expression, survive byte-for-byte; `resolveAvail` is a purchase-time #82 concern, not exercised here.)
- `azadeh: 4 initiation grades survive` — import → export → re-import: `magic.initiateGrade === 4`, 5 metamagics with sources `['SR4','SM','RW','SM','SR4']` order preserved.
- `rainwalker: 20 spirits survive round-trip`; first spirit `{ type: 'Guardian Spirit', force: 12, services: 10, bound: true }`.
- `quicksilver: Savate advantages survive`: 2 `<martialartadvantage>` elements out, names byte-equal.
- `gunnery-sergeant: guids stable`: set of `<guid>` values in xml2 ⊇ set in xml1 minus whitelisted subtrees.
- `goldens: totaless matches` per fixture (±0.01).
- `whitelist hygiene: every entry matches at least one diff across the suite` (rot guard).

### Dependencies

- **#80a/#80b, #81, #82** — all must land first (this is the regression net over them).
- **#74b (epic 17)** — vehicle whitelist entry removed when it lands; synthetic-rigger vehicle section activates then.
- **#71 (epic 16)** — dice-pool goldens unblock.
- **#104 (platform epic)** — CI wiring.

### Risks & edge cases

- **Git corruption of UTF-16 fixtures** is the top operational risk — `.gitattributes` `*.chum binary` must land in the same commit as the fixtures, and the sha1 verify step guards it.
- Licensed content: the sample `.chum` files ship with the desktop Chummer distribution and contain CGL book references (names/page numbers). The repo is proprietary/private, so bundling 4 of them as test fixtures matches existing practice (`bin/saves` already in-tree) — flagged as an open question regardless.
- fast-xml-parser drops XML comments and normalizes entities — both sides pass through the same parser, so this cancels out; but `preserveOrder: true` output shape differs from the importer's default parse — the diff harness uses its own parse call, never the importer's internals.
- Whitelist regexes over slash-paths can accidentally over-match (e.g. `.*/gear/...` also matching vehicle gear) — `xmlDiff` unit tests must include an over-match probe (a path that *should* diff and is near a whitelisted one).
- Desktop files from other Chummer point-releases may add/rename elements (e.g. very old files lack `paidwithkarma` — `Metamagic.Load` guards it) — the importer's try-parse style already tolerates this; the suite pins only the 6 checked-in fixtures.
- The plan's acceptance criterion "desktop Chummer opens the exported file without errors" cannot be automated here (WinForms app) — manual verification checklist added to the PR template for #80/#83: open each re-exported fixture in desktop Chummer, confirm no dialog and matching Karma/Nuyen/Essence totals.

---

## Cross-epic coordination summary

| Touchpoint | This epic | Other epic |
| --- | --- | --- |
| `stores/equipment/` add-functions | #82 populates avail/source/page | #75 (epic 17) consolidates the duplicated suite first |
| `stores/migrations.ts` + `persistence.ts` hooks | #82 adds `migrateItemMetadata` | #76 (epic 17) introduces the file |
| `exporter.ts` weapon writer | #80a ports onto `XmlOut` | #74b (epic 17) extracts `exportWeapon` for vehicle mounts — coordinate to avoid conflicting refactors |
| `<vehicles>` XML | explicitly delegated | #74b (epic 17) |
| `<initiationgrades>` XML | #80b synthesizes / #81 derives counts | #84 (magic epic) replaces internals with the real grade list |
| `CharacterMetamagic` / `learnMetamagic` signature | #82 introduces | #85 (magic epic) extends (foci/metamagic improvements) |
| `character.improvements` import contract | #81 parses desktop improvements verbatim | #61–#71 (epic 16) write-side must not double-create for imported items |
| `ExpenseEntry.refund` / `<undo>` | #82 adds field; #80b/#81 skip undo | #88 (career epic) implements ExpenseUndo |
| Availability enforcement | #82 provides the data | #93 (rules epic) consumes it |
| Mugshot | `<mugshot />` stays hardcoded | #102 (platform epic) |

<!-- EPIC COMPLETE -->

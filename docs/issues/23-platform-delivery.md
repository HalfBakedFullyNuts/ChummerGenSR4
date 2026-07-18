# Epic: Platform & Delivery (Phase 23)

Issues #99–#104. Hardening spec for implementers. See [../FEATURE_PARITY_PLAN.md](../FEATURE_PARITY_PLAN.md) (Part III, lines 953–1072).

**Implementation order (epic-internal):**
1. **#99 first, blocking** — the tree must be green before any other work in any epic. Order 0 in the plan's dependency table (line 108).
2. **#100** (rules hardening) before **#101** (sharing) — sharing adds a public-read rule branch onto the hardened ruleset; both share the emulator test harness introduced by #100.
3. **#102, #103, #104** are parallel-safe once #99 lands. **#104** (CI) should land after #103 exists so its E2E job has specs to run (allowed-failure until then).

---

## Issue #99: Stabilize the working tree (fix 10 type errors, commit in-flight work)

**Labels:** `epic:platform`, `priority:critical` · **Size:** M

### Verified current state (plan was wrong/vague)

The plan (line 960) says "10 errors in 7 files from uncommitted, half-finished features" in source. **Corrected:** all 10 errors are in **two untracked test files**; no source `.ts`/`.svelte` file has a type error. `svelte-check` reports "7 files with problems" but 5 of those are **warnings-only** (a11y). Exact catalog (`npx svelte-check --output machine`):

`src/lib/engine/__tests__/calculations.test.ts` (untracked):
1. `1:44` — `'vi'` imported, never used → remove from import (line 1).
2. `14:13` — `age: 25` assigned to `readonly age: string` (`character.ts:129`) → change to `'25'`.
3. `54:13` — `initiations: 0` not in `CharacterMagic` (`character.ts:241–246` has `initiateGrade`, not `initiations`).
4. `65:17` — `modules: []` not in `CharacterLifestyle` (`equipment.ts:464–472` has no `modules`; test's lifestyle literal is also missing `id/name/location/notes` and adds a stray `cost`).
5. `76:13` — `overflowCurrent: 0` not in `ConditionMonitor` (`character.ts:162–169` has `overflow`, not `overflowCurrent`).

> **⚠️ These 5 are only the first visible layer in `calculations.test.ts`, not the full fix.** `createBaseCharacter()` (lines 6–86) is structurally divergent from today's `Character` type: its top level is **missing ~12 required props** (`background`, `status`, `buildMethod`, `buildPointsSpent`, `attributeLimits`, `knowledgeSkillPoints`, `resonance`, `contacts`, `startingNuyen`, `totalKarma`, `reputation`, `expenseLog`) and carries **excess props** (`careerKarma`, `notes`); its nested `identity` literal is missing `alias/playerName/metavariant/hair/eyes/skin` and adds excess `ethnicity/streetCred/notoriety/publicAwareness/karma/totalKarma`; the `magic`/`condition`/`equipment.lifestyle` sub-literals are likewise divergent. **TypeScript reports object-literal mismatches one layer at a time** — it suppresses an object's missing/excess-property errors while any inner literal still has an error (verified against this project's own tsc: `{id, inner:{a:5,extra:true}, junk:1}` → `Outer{id,inner,req1,req2}` reports only the nested `a:5`; fix `a` → reveals `extra`; fix `extra` → reveals `junk`; remove `junk` → reveals missing `req1/req2`). So patching only errors 2–5 does **not** clear the file — it *uncovers* the masked identity/magic/lifestyle/condition shape errors and then the top-level missing/excess errors. #99 must **rewrite `createBaseCharacter` wholesale to the current `Character` shape**, not just edit the 5 catalogued lines. `magic.test.ts` is unaffected by this: it builds its character via the real `startNewCharacter` factory, so its errors 6–10 are genuine readonly-assignment fixes that do resolve directly.

`src/lib/stores/__tests__/magic.test.ts` (untracked):
6. `5:5` — `magicType` imported, never used.
7. `95:43` — `c.magic.powerPoints = 6` — assign to readonly (`character.ts:245`).
8/9. `163:43`, `174:43` — `c.magic.initiateGrade = 1` — assign to readonly (`character.ts:244`).
10. `189:36` — `c.equipment.foci = [...]` — assign to readonly (`equipment.ts:514`).

Working tree: 35 modified + 41 untracked, ~3,241 insertions / 2,211 deletions.

### Design (resolution decisions — do NOT add speculative type fields)

- **Rewrite `createBaseCharacter` to today's `Character` shape (not a 5-line patch).** Because TS masks the shape cascade one layer at a time (see Verified current state), the helper must be rebuilt to satisfy the full current `Character` / `CharacterIdentity` / `CharacterMagic` / `ConditionMonitor` / `CharacterEquipment` interfaces — add the ~12 missing top-level props and 6 missing identity props with valid defaults, and drop the excess props (`careerKarma`, `notes`, `ethnicity`, `streetCred`, …). Use `createEmptyCharacter` in `character.ts` as the reference shape (or call it directly and override only the fields the tests need).
- **Errors 3/4/5 (`initiations`, `modules`, `overflowCurrent`):** these test literals anticipate features owned by **#84** (structured initiation grades) and **#91** (lifestyle modules), plus a mis-named condition field. #99 must NOT pre-add these type fields (YAGNI; those issues design them properly). In the rewrite, drop `initiations`, use the real `CharacterLifestyle` shape (`{id,name,level,monthlyCost,monthsPrepaid,location,notes}`), rename `overflowCurrent`→`overflow`. Leave a `// TODO(#84)` / `// TODO(#91)` only if the test genuinely needs the field once those land — otherwise no marker.
- **Errors 7/8/9/10 (readonly assignment):** the tests mutate readonly props directly inside `characterStore.update`. Replace each with an **immutable nested update** returning a new object (spread `c`, `c.magic`, `c.equipment`), matching the store's `{success,error}` mutation style. Where a real mutation function exists (e.g. an adept power-point setter, `learnMetamagic`), prefer calling it over hand-mutating.
- **Errors 1/2/6:** trivial — drop unused imports, fix the `age` literal type.
- No source-type change is in scope for #99.

### Implementation steps

1. Rewrite `createBaseCharacter` in `calculations.test.ts` to the current `Character` shape (this both fixes errors 1–5 and clears the masked identity/magic/lifestyle/condition/top-level shape errors they hide). Verify: `npx svelte-check` reports **no errors in `calculations.test.ts`** — the only remaining errors are the 5 in `magic.test.ts`. Note: mid-edit the total error count will *rise* above 10 as masked layers surface before it falls; a transient increase is expected, not a regression.
2. Fix `magic.test.ts` errors 6–10 as above → 0 errors. Verify: `npm run check` → `0 errors`.
3. `npm run test:unit` → all green (the two files now compile and run). Verify: exit 0.
4. Delete stray root files: `nul`, `check.log`, `check_output.json`, `check_output.txt`, `check_output_new.json`, `check_output_new3.json`, `svelte.log`, `svelte_check.txt`, `svelte_check_machine.txt`, `ts_errors.txt`, `typescript_errors.log`. Add glob patterns (`check_output*`, `svelte_check*.txt`, `*_errors.txt`, `nul`, `*.log`) to `.gitignore`. Verify: `git status` shows none of them.
5. Commit in logical groups (plan line 967): equipment nesting, `qualityBonuses.ts` removal, XML changes, foci work, test additions, gitignore/cleanup. Verify: `git status` clean.

### Test plan

- `npm run check` → `0 errors, 15 warnings` (a11y warnings out of scope).
- `npm run test:unit` → green; specifically the reverted `calculations.test.ts` condition case asserts `overflow` (not `overflowCurrent`).
- `git status --porcelain` empty after commits.

### Dependencies

- **#84** (initiation grades) and **#91** (lifestyle modules): own the type fields the tests were reaching for. #99 reverts rather than blocks on them; they re-introduce the fields and can restore the test assertions.

### Risks & edge cases

- Reverting test literals could mask that a source feature was mid-flight. Confirm via `git log`/diff that no **source** file expects `initiations`/`modules`/`overflowCurrent` (verified: none do today) before deleting the test usage.
- Committing 3k lines in groups risks an intermediate red commit. Run `npm run check && npm run test:unit` after staging each group, not only at the end.

---

## Issue #100: Firestore rules hardening and indexes file

**Labels:** `epic:platform`, `priority:high`, `security` · **Size:** M

### Verified current state

`firestore.rules` (full file, 9 lines): the `characters/{charId}` match has
`allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;` and a separate `allow create`. Confirmed defects:
- **Reassignment hole:** `write` (covering update) checks only the *existing* `resource.data.userId`; nothing pins `request.resource.data.userId` to it → an owner can rewrite `userId` to another uid (orphan / hand-off).
- **`read` on a non-existent doc:** `resource.data.userId` is null on a missing doc, so read of a missing id is denied (acceptable) — but no field/size validation on create/update.
- `firebase.json` references `firestore.indexes.json` which **does not exist** → `firebase deploy` fails.
- `@firebase/rules-unit-testing` is **not** in `package.json`; `firebase.json` has **no `emulators` block**; `src/lib/firebase/config.ts` has no emulator connection code.

`saveCharacter` (`characters.ts:49–66`) writes the whole `Character` via `setDoc` (a full overwrite, not merge) including `userId` (`character.ts:177`), so rules must tolerate full-document updates.

### Design

Rewrite `firestore.rules` `characters/{charId}`:
```
allow get: if isSignedIn() && resource.data.userId == request.auth.uid;
allow list: if isSignedIn() && request.query.limit <= 200
            && resource.data.userId == request.auth.uid; // where('userId','==',uid) queries
allow create: if isSignedIn()
              && request.resource.data.userId == request.auth.uid
              && request.resource.data.identity.name is string
              && request.resource.data.identity.name.size() > 0
              && request.resource.size() < 1000000; // ~1MB doc cap (mugshot, #102)
allow update: if isSignedIn()
              && resource.data.userId == request.auth.uid
              && request.resource.data.userId == resource.data.userId // pin owner
              && request.resource.size() < 1000000; // ~1MB doc cap — every save is a full-overwrite update (#102 backstop)
allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
```
with `function isSignedIn() { return request.auth != null; }`. **Name path resolved:** `Character` has no top-level `name` — the persisted name is `character.identity.name` (`CharacterIdentity`, `character.ts:123`; `saveCharacter` spreads the full `Character`). The create rule above therefore validates `request.resource.data.identity.name`, consistent with the Test plan's `identity.name` deny case. Alternative if `identity.name` may legitimately be empty at first save: relax create validation to `userId` + size only — and if so, drop the corresponding Test-plan deny case to keep them in sync.

Add `firestore.indexes.json`. **Correction to plan (line 987 "empty indexes array"):** a composite index IS required. `listUserCharacters` (`characters.ts:127–132`) runs `where('userId','==',uid)` + `orderBy('updatedAt','desc')` + `limit(100)` — an equality filter plus an orderBy on a different field forces a composite index:
```json
{ "indexes": [
  { "collectionGroup": "characters", "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "userId", "order": "ASCENDING" },
      { "fieldPath": "updatedAt", "order": "DESCENDING" }
    ] }
], "fieldOverrides": [] }
```
Default `maxResults=100` satisfies the `request.query.limit <= 200` guard.

Add emulator wiring for tests only:
- devDep `@firebase/rules-unit-testing`.
- `firebase.json` `emulators.firestore.port` (e.g. 8080).
- Test file `src/lib/firebase/__tests__/rules.test.ts` using `initializeTestEnvironment`.

### Implementation steps

1. Rewrite `firestore.rules` per Design. Verify: `firebase emulators:exec --only firestore "npm run test:unit -- rules"` (or the rules test) passes.
2. Add `firestore.indexes.json`. Verify: `firebase deploy --only firestore --dry-run` (or `firestore:indexes`) no longer errors on missing file.
3. Add `@firebase/rules-unit-testing`, emulator config, `rules.test.ts`. Verify: `npm run test:unit` includes and passes rules cases.
4. Add the composite index (Design). Verify: `listUserCharacters` against the emulator returns without a "requires an index" error.

### Test plan (emulator, concrete)

- **owner read:** uid A reads own doc → allow; uid B reads A's doc → deny.
- **create:** authed create with `userId==auth.uid` → allow; create with `userId` = other uid → deny; create with empty `identity.name` → deny.
- **reassign block:** owner A updates own doc changing `userId` to B → **deny** (core fix).
- **owner update:** A updates own doc keeping `userId` → allow.
- **delete:** non-owner delete → deny; owner delete → allow.
- **oversize:** create *and update* with a >1MB body → deny (a mugshot is normally added while editing an existing character, i.e. an `update` — so the guard must be on both clauses, not just `create`).

### Dependencies

- **#101** extends this ruleset with a public-read branch; keep the rule structure so #101 adds one `allow get` clause. Shares the emulator harness built here.
- **#102** mugshot base64 motivates the <1MB size guard.

### Risks & edge cases

- `setDoc` full overwrite means every save is an `update` that resends `userId`; the pin clause must compare equal values (it does) — but a client that omits `userId` on update would fail. `saveCharacter` always includes it (spreads full `Character`), so safe. Do not switch `saveCharacter` to `merge`.
- Rules `list` limit: `listUserCharacters` passes `limit(100)` (`characters.ts:131`), so the `request.query.limit <= 200` guard is safe; keep them in sync if the default changes.

---

## Issue #101: Character sharing (FR-8)

**Labels:** `epic:platform`, `priority:medium` · **Size:** L

### Verified current state

No sharing exists: no `shareToken` on `Character` (`character.ts:175–230`), no `/character/shared` route (`src/routes/character/` has only `edit`, `manual`, `new`, `view`), no public-read rule. Persistence: `saveCharacter` (`characters.ts:49–66`) does a full `setDoc` of the `Character`, so a top-level `shareToken` field is persisted automatically. `CharacterSheet.svelte:23–29` already takes `char: Character`, `skillDefs` (default `[]`), and `interactive` (default `false` = read-only) — the shared route reuses it with `interactive={false}` (i.e. the component default). Note `view/[id]/+page.svelte:807–810` passes `interactive={true}` for the editable owner view, so it is **not** a read-only precedent to mirror; the shared route relies on the `interactive=false` default instead.

### Design

**Model change** — add to `Character` (`character.ts`, near `id`/`userId`):
```ts
readonly shareToken: string | null; // null = private; non-null = public read enabled
```
Default `null` in the character factory. Zod `CharacterSchema` must add `shareToken: z.string().nullable().default(null)` so existing docs without the field still parse (`loadCharacter` at `characters.ts:85` uses `safeParse`). (Backfill-mechanism note, MC5/D6: the Zod `.default()` is the sanctioned mechanism **for nullable fields like this one** — do not move it into `migrateCharacter`; required structural fields elsewhere (#89 calendar, #91 lifestyles, …) use `migrations.ts` instead.)

**Token:** `crypto.randomUUID()` (no `-`) or a 22-char base64url random — unguessable, opaque, not derived from `id`/`userId`. Store the token on the doc itself (no separate secret).

**Firestore rule** (add to the hardened `characters/{charId}` from #100 — do NOT open `list`):
```
allow get: if resource.data.shareToken != null
           && resource.data.shareToken == <token>;
```
The rule cannot read the query string, so the token must be matched by the **client fetching the doc by id**, not by the rule. Two viable shapes — pick **B**:
- **A. Mirror collection** `sharedCharacters/{token}` holding a read-only copy or a pointer `{ characterId }` with `allow get: if true`. Extra write path to keep in sync; risk of staleness.
- **B (chosen). Token-in-doc + rule + link carries both id and token.** Public link is `/character/shared/[charId]/[token]` (or `[token]` that encodes the id). Rule: `allow get: if resource.data.shareToken != null && resource.data.shareToken == token` — but rules can't see path params for a `get` on `/characters/{charId}`... **Firestore limitation:** a `get` rule cannot compare against a URL/path segment outside `{charId}`. Therefore the public link must resolve to the doc id, and the rule reduces to `allow get: if resource.data.shareToken != null` (anyone with the id + a non-null token can read). Unguessable id + revocation (set token null) is the security boundary. Document this explicitly. To avoid exposing the owner's real character id, route on the **token** and keep a minimal public index: `sharedCharacters/{shareToken}` = `{ characterId, userId }` with `allow get: if true`, `allow create/delete: if isSignedIn() && request.auth.uid == request.resource.data.userId`. Client: read `sharedCharacters/{token}` → get `characterId` → read `characters/{characterId}` (allowed because its `shareToken != null`).

Final rule additions:
```
match /characters/{charId} { allow get: if resource.data.shareToken != null; ... } // OR the private-owner get from #100
match /sharedCharacters/{token} {
  allow get: if true;
  allow create, delete: if isSignedIn() && request.auth.uid == request.resource.data.userId;
}
```
Combine the two `characters` `get` clauses with `||` (owner OR shared).

**New functions** (`characters.ts`):
```ts
export async function enableSharing(characterId: string, userId: string): Promise<DbResult<string>>; // returns token
export async function disableSharing(characterId: string, userId: string): Promise<DbResult>;
export async function loadSharedCharacter(shareToken: string): Promise<DbResult<Character | null>>;
```
`enableSharing`: generate token, update character doc `shareToken`, `setDoc(sharedCharacters/{token}, {characterId, userId})`. `disableSharing`: set character `shareToken=null`, `deleteDoc(sharedCharacters/{oldToken})`. `loadSharedCharacter`: read mirror → read character; return read-only.

**Route:** `src/routes/character/shared/[token]/+page.svelte` — `onMount` calls `loadSharedCharacter`, renders `<CharacterSheet char={...} skillDefs={$gameData.skills} interactive={false} />`. Must not require auth (`+layout` guard must allow this path). Load `gameData` (may need public gamedata access — it's static JSON in `static/data/`, so fine).

**UI:** Share/Revoke button in character list and `view/[id]`; on enable, show copyable `/character/shared/{token}` URL.

### Implementation steps

1. Add `shareToken` to `Character` + factory default + Zod schema. Verify: `npm run check` 0 errors; existing-doc load test parses with `shareToken` defaulting null.
2. Add `sharedCharacters` rules + `characters` get `||` shared. Verify: rules tests below pass on emulator.
3. Implement `enableSharing`/`disableSharing`/`loadSharedCharacter`. Verify: unit test round-trips via emulator.
4. Add `/character/shared/[token]` route + auth-guard exemption. Verify: e2e/manual — signed-out load renders sheet.
5. Share/revoke UI + copy link. Verify: manual — enable shows link, revoke 404s the link.

### Test plan (rules + concrete)

- Owner enables sharing → `sharedCharacters/{token}` created, character `shareToken` set.
- **Signed-out** `get sharedCharacters/{token}` → allow; then `get characters/{id}` (shareToken≠null) → allow; sheet renders read-only (no edit controls, `interactive=false`).
- Character with `shareToken==null` → signed-out `get characters/{id}` → deny.
- Revoke → `shareToken=null`, mirror deleted → signed-out link → deny/404.
- Non-owner cannot create a `sharedCharacters` entry for someone else's `userId` → deny.
- `list characters` still owner-only (sharing must not enable enumeration).

### Dependencies

- **#100** (hard dep): builds on the hardened ruleset + emulator harness. Do #100 first.
- **#102**: shared sheet should display the mugshot once #102 lands (additive, not blocking).

### Risks & edge cases

- **Firestore rules cannot match a token against a path segment on the primary doc** — this is why the mirror collection exists; do not attempt `allow get: if resource.data.shareToken == request.path[...]`.
- Anyone who ever had a link retains access until revoked; revocation is the only control. State this in UI ("anyone with the link can view").
- `loadSharedCharacter` returns the full `Character` incl. `userId`/notes — confirm no field is sensitive for public view, or strip `userId`/private notes before returning. Decide in impl.
- Two-hop read (mirror → character) is not atomic; a revoke racing a read is acceptable (read may briefly succeed).

---

## Issue #102: Portrait/mugshot support

**Labels:** `epic:platform`, `priority:low` · **Size:** M

### Verified current state

No portrait field: `CharacterIdentity` (`character.ts:122–135`) has name/alias/…/skin, no mugshot. `exporter.ts:30` writes a self-closing `<mugshot />` (empty). `importer.ts` has no `mugshot` read.

**Desktop parity (exact, from `clsCharacter.cs`):**
- Save file element: `objWriter.WriteElementString("mugshot", _strMugshot)` (line 266) where `_strMugshot` (line 67) is a **raw base64 string, no `data:` prefix**.
- Load: `_strMugshot = objXmlCharacter["mugshot"].InnerText` (line 795) — plain base64.
- The *print* export (lines 1552–1567) additionally emits a `file://` path in `<mugshot>` and the base64 in `<mugshotbase64>` — **print-only, not the save format**; the round-trip target is the **save** shape: `<mugshot>BASE64</mugshot>`.

### Design

**Model** — add to `CharacterIdentity`:
```ts
readonly mugshot: string | null; // data URL "data:image/…;base64,…" in-app; null = none
```
Factory default `null`; Zod `identity.mugshot: z.string().nullable().default(null)`. (Nullable field → Zod `.default()` is the correct backfill mechanism per MC5/D6; no `migrateCharacter` entry.)

**Storage cap:** raw base64 capped ~200KB (plan line 1026) to stay well under Firestore's 1MB document limit (whole `Character` is one doc; mugshot dominates). Enforce on upload (reject/downscale). The #100 create/update rule's `<1MB` size guard is the backstop.

**In-app vs XML representation:** app stores a **data URL** (`data:image/png;base64,AAAA…`) for direct `<img src>`. Desktop XML stores **bare base64**. Therefore:
- **Export** (`exporter.ts:30`): if `identity.mugshot` non-null, strip the `data:…;base64,` prefix and write `<mugshot>{bare}</mugshot>`; else keep `<mugshot />`.
- **Import** (`importer.ts`): read `<mugshot>` InnerText; if non-empty, re-wrap as a data URL. MIME unknown from bare base64 → default `image/jpeg` (desktop uses JPEG) or sniff magic bytes (`/9j/`→jpeg, `iVBOR`→png). Store the data URL.

**UI:** upload + crop in the identity wizard step and a display slot on `CharacterSheet`. Downscale/re-encode client-side (canvas) to enforce the size cap; produce a data URL.

### Implementation steps

1. Add `mugshot` to `CharacterIdentity` + factory + Zod. Verify: `npm run check` 0 errors.
2. Export: emit `<mugshot>` with bare base64. Verify: exporter unit test — data-URL in → bare base64 in XML.
3. Import: parse `<mugshot>` → data URL. Verify: importer unit test — bare base64 in XML → data URL, and empty `<mugshot />` → null.
4. Upload/crop UI + canvas downscale to ≤200KB; display on sheet. Verify: manual — upload large image, confirm stored size and render.

### Test plan (concrete)

- **Round-trip web→desktop:** export a character with a known 1x1 PNG data URL → `<mugshot>iVBORw0KGgo…</mugshot>` (bare, no `data:`). Re-import → identical data URL (modulo MIME default). Assert base64 payload byte-equal.
- Empty portrait exports `<mugshot />` and imports to `null`.
- MIME sniff: base64 starting `/9j/` imports as `image/jpeg`, `iVBOR` as `image/png`.
- Upload of a >200KB image is downscaled/rejected (final stored ≤200KB).

### Dependencies

- **#18/XML epic:** touches `exporter.ts`/`importer.ts` — coordinate the `<mugshot>` element with any XML-compat rework there (shared files).
- **#101:** shared read-only sheet displays the mugshot (additive).

### Risks & edge cases

- Bare-base64 MIME loss on desktop round-trip: desktop keeps no MIME; picking the wrong default renders fine in browsers regardless (they sniff), so cosmetic only.
- 1MB Firestore doc limit: a near-cap mugshot plus a large character could exceed it; the 200KB cap + #100 rule guard mitigate. Document the rationale in the field comment.
- `exactOptionalPropertyTypes`: use `string | null`, not optional `?`, to match existing identity fields.

---

## Issue #103: E2E test suite (Playwright)

**Labels:** `epic:platform`, `priority:medium`, `testing` · **Size:** L

### Verified current state

`@playwright/test ^1.40.0` installed (`package.json:21`); `test:e2e: "playwright test"` scripted (line 17); **no `playwright.config.*` and no specs** → the script fails immediately. App: SvelteKit 2, `adapter-static` (`svelte.config.js`) with `fallback: index.html` (SPA), dev server on **port 3000** (`vite.config.ts:20–21`). No global auth guard in `+layout` (grep: none) — the creation wizard (`routes/character/new/+page.svelte`) runs against in-memory Svelte stores; **only save/load touches Firebase**. So the wizard smoke test needs **no auth and no Firestore**. Firebase config reads `VITE_*` env (`config.ts:17–22`).

### Design

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'npm run build && npm run preview', port: 4173, reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
```
**Decide dev vs preview:** prefer `preview` of the static build (deterministic, matches prod SPA fallback). `vite preview` default port is 4173; align `webServer.port`/`baseURL`. If tests need HMR speed, use `npm run dev` on 3000 instead — but preview is the CI-safe default.

**Persistence:** for wizard/import/career specs, avoid live Firebase — the wizard is store-only. For anything that would call `saveCharacter`/`loadCharacter`, either (a) drive only the pre-save flow, or (b) stub the firebase module via a Playwright route/init script, or (c) point `VITE_*` at the Firestore emulator (heavier; reuse #100 harness). Choose (a)+(b) for smoke; reserve (c) for a later persistence spec.

Specs in `e2e/`:
- `wizard-bp.spec.ts` — full BP creation: metatype → attributes → qualities → skills → equipment → finalize; assert BP total on each step.
- `import-chum.spec.ts` — import a `.chum` fixture (reuse an existing XML test fixture from `src/lib/xml/__tests__/`), assert rendered sheet values.
- `career.spec.ts` — enter career mode, spend karma on a skill, assert the expense log entry.

### Implementation steps

1. Add `playwright.config.ts` + `e2e/` dir. Verify: `npx playwright test --list` enumerates specs.
2. `wizard-bp.spec.ts` (locators via `data-testid` — add testids to wizard step controls as needed). Verify: `npm run test:e2e` green for this spec.
3. `import-chum.spec.ts` using a shared fixture. Verify: green.
4. `career.spec.ts`. Verify: green.
5. Ensure `npx playwright install --with-deps chromium` documented for CI. Verify: full `npm run test:e2e` green locally.

### Test plan (concrete SR4 values)

- **wizard-bp:** default **400 BP** budget shown; select Human metatype (0 BP) → remaining 400; raise BOD from racial min to +1 → **10 BP** spent (10 BP/point per CLAUDE.md); a Rating-2 active skill → **8 BP** (4 BP/rating); finalize enabled only when spent ≤ 400 and validation passes.
- **import-chum:** import fixture → attribute/skill values on the sheet equal the fixture's known values (reuse assertions from `importer.test.ts`).
- **career:** spend 2 karma raising a skill Rating 1→2 (career skill cost = new rating × 2 = 4 karma — confirm against career epic #20); expense log gains one entry with the correct karma delta and running total.

### Dependencies

- **#99** (green baseline). **#100** emulator harness optional for a persistence spec (option c).
- **#20 (career mode):** career.spec karma-cost expectations must match that epic's cost function — cross-check `career.ts` before asserting.
- **#104:** CI runs this as an allowed-failure job initially.

### Risks & edge cases

- Adding `data-testid`s touches wizard `.svelte` components (cross-epic surface with wizard-owning epics) — keep additive, no logic change.
- `adapter-static` SPA fallback: deep-link specs (`/character/shared/[token]`) rely on `fallback: index.html`; verify preview serves it.
- Playwright browser download in CI must be cached or installed per run (`playwright install`).

---

## Issue #104: CI pipeline

**Labels:** `epic:platform`, `priority:high` · **Size:** M

### Verified current state

No `.github/` in repo. Scripts available (`package.json:7–18`): `check` (`svelte-kit sync && svelte-check`), `lint` (`eslint . --fix` — **has `--fix`, unsafe for CI**), `test:unit` (`vitest run`), `test:coverage` (`vitest run --coverage`, `@vitest/coverage-v8` installed line 30), `build` (`vite build`), `test:e2e` (`playwright test`). No CI-specific lint script.

### Design

**Add a CI-safe lint script** (do not run `--fix` in CI — it can mask violations and mutate the tree):
```json
"lint:ci": "eslint ."
```
`.github/workflows/ci.yml` — triggers `push` (master) + `pull_request`:
- Job **build-test** (Ubuntu, Node 20 — matches `@types/node ^20`):
  1. checkout; `actions/setup-node@v4` with `node-version: 20`, `cache: npm`
  2. `npm ci`
  3. `npm run check`
  4. `npm run lint:ci`
  5. `npm run test:coverage` (covers unit + emits coverage; upload `coverage/` via `actions/upload-artifact@v4`)
  6. `npm run build` (needs `VITE_*` — provide dummy build-time env vars via `env:` so the static build succeeds without real Firebase creds)
- Job **e2e** (`needs: build-test`, `continue-on-error: true` initially per plan line 1066): `npm ci` → `npx playwright install --with-deps chromium` → `npm run test:e2e`; upload `playwright-report/`.

**README badge:** `![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)`.

Note: `test:coverage` supersedes a separate `test:unit` step (coverage runs the same suite). If coverage flakes, split them; otherwise one step.

### Implementation steps

1. Add `lint:ci` script. Verify: `npm run lint:ci` runs read-only (no tree mutation — `git status` clean after).
2. Add `.github/workflows/ci.yml` (build-test job). Verify: push a branch → Actions run goes green through check→lint→coverage→build.
3. Add e2e job (`continue-on-error: true`). Verify: job runs after #103 lands; failures don't block merge yet.
4. Add badge to `README`. Verify: badge renders on the repo page.

### Test plan

- PR against master triggers the workflow; a deliberate type error makes `check` fail and blocks. 
- `lint:ci` fails on an injected lint violation (proves no silent `--fix`).
- `build` succeeds with dummy `VITE_*` env; artifact `coverage/` uploaded.
- e2e job failure does not fail the overall required check (allowed-failure) until flipped.

### Dependencies

- **#99** (green baseline) — CI is meaningless on a red tree; land first.
- **#103** — e2e job needs specs; keep allowed-failure until specs exist and pass.

### Risks & edge cases

- `vite build` referencing `VITE_*` at build time: static adapter inlines env; supply placeholder values in CI `env:` or the build throws on undefined. Do not commit real Firebase keys.
- `eslint . --fix` vs `lint:ci`: ensure CI uses the non-fix variant so violations surface as failures, not silent rewrites.
- CRLF: repo shows LF→CRLF warnings on Windows; set `.gitattributes` or `git config core.autocrlf` expectations so ESLint/Prettier line-ending rules don't fail only in CI (Ubuntu = LF). Confirm Prettier `endOfLine` setting is `lf` or `auto`.

<!-- EPIC COMPLETE -->


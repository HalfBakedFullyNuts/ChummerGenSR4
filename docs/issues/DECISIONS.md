# Design Decisions — Feature Parity Effort

> Recorded 2026-07-17 by the project owner. These resolve the open product questions in `00-consistency-report.md`. Implementers: treat these as binding; where a spec's "Open questions" or "Risks" section conflicts, this file wins.

## Standing policy

**Copy the desktop ChummerGenSR4 application in terms of values and mechanics as closely as possible. Only innovate on web-specific concerns** (persistence, sharing, auth, PWA, CI, UI presentation, migration of existing web data). When desktop behavior and the SR4 rules-as-written diverge, **desktop wins** (it is the parity target).

This single policy resolves, by "match the source":

- **Engine:** drop SR5-style physical/mental/social limits (desktop SR4 has none); Uneducated/Uncouth/Infirm double only the categories desktop doubles (Technical Active), not SR4-RAW knowledge skills; essence multipliers recalculate retroactively (desktop behavior); regenerate game-data JSON from desktop XML as the authoritative source (#62b), accepting that hand-tuned non-bonus fields get overwritten.
- **Equipment:** armor-capacity house rules **off by default** (desktop ships both disabled); weapon mounts attach leniently (desktop behavior); resources use the SR4 tier table / karma rate.
- **Magic:** complex-form costs = desktop defaults (chargen Rating×1 BP; career-new 2 karma) — overrides the plan's "5 BP/form" text; implement desktop's chargen-karma mechanic so BP builds can initiate/bond foci at creation; no karma refund on career focus unbond.
- **Career:** port desktop's GM-prompted sell-back percentage; model BurntStreetCred (`clsCharacter.cs:2950`); over-cap purchases behave as desktop does (look up exact behavior during #92).
- **Rules:** port the full desktop `CharacterOptions` house-rule set (not a 15-flag subset) — see house-rules decision below for the web-specific storage twist.
- **Content:** maneuvers = desktop-faithful global list at 2 BP each (not style-nested).

## Web-specific decisions (owner answers)

| # | Question | Decision |
| --- | --- | --- |
| P-1 | Strip private fields from shared characters? | **No** — share the full sheet as-is. |
| P-2 | Public link format: opaque token+mirror vs raw character id? | **Raw character ID.** Simpler; no mirror collection. (Adjust #101 Firestore rules to allow public read by id when a `shareToken`/`isPublic` flag is set, without a mirror doc.) |
| P-3 | Mugshot size cap / oversize behavior? | **Follow Firestore's own guidelines** — keep the whole character doc under the 1 MB limit; downscale/re-encode client-side to fit. |
| P-4 | E2E CI job: allowed-failure vs required check? | **Implementer's call** — optimize for app stability, maintainability, and CI performance. (Recommended: start allowed-failure, promote to required once #103 specs are stable and non-flaky.) |
| R-3 | House-rule flag subset vs all? | Port desktop's full set (per standing policy). |
| R-4 | House-rule settings storage/transfer | **Web-specific innovation:** store house rules as a **transferable code** the user can enter, saved per character *and* per account. (Supersedes the spec's embed-literal-XML approach; desktop's external-options-file model does not apply.) |
| Sourcebooks | Default enabled set | **All books enabled by default.** |
| Sourcebooks | Provenance highlighting | In the UI, **clearly highlight anything from a source that is NOT one of:** basic rules (SR4), Arsenal, Unwired, Augmentation (Body Shop), Street Magic, Vice, Spy Games, Attitude, Runner's Companion, State of the Art, Way of the Adept. (Web-specific presentation; drives the #96 legality/provenance UI and the books.json reconciliation in #94.) |
| X-1 | Test-fixture licensing | **Non-issue** — freeware / public-domain app. Bundle `.chum` fixtures freely. |
| X-2 | Manual desktop verification | **Owner will run** open-in-desktop checks personally. |
| C-2 | Advanced Lifestyle builder UI | **Build lifestyle options last** (lowest priority within the effort). |

## Clean slate — no data migration

**There are no existing web characters of note. Development starts on a clean slate; no persisted Firestore character data must be preserved.**

This resolves the last open items and removes a large class of work/risk across every epic:

- **Drop all "migrate persisted Firestore characters" tasks and risks.** Wherever a spec adds a backfill migration purely for backward-compatibility of saved characters (#76 gear-container migration, #82 item-metadata backfill, #84 initiation backfill, #91 lifestyle single→array, #97 type/qualities, #70 movement backfill, #79 commlink normalize, etc.), the migration itself is **not required** — the new shape is simply the shape. Keep only: (a) Zod `.default()`s that make new optional/nullable fields forward-safe, and (b) any transform still needed to parse **imported desktop `.chum` files** (that is XML import, not save-migration). `migrations.ts` may still exist as the import-normalization home but does not need legacy-web-save handling.
- **#78 (bpToNuyen):** implement the correct karma rate (2,500¥/karma) directly. No existing-character concern, **no user-facing notice, no migration** — just the correct value from day one.
- **#74a (vehicle.weapons):** delete the flat `CharacterVehicle.weapons` field outright; **no web-save migration needed.** The XML importer still maps any vehicle-level `<weapons>` in a desktop file into a mod on import (desktop exports are normally mod-nested anyway).
- **#94 (orphan source codes):** **display raw source codes as-is for now** (e.g. show `"2050"` literally). Do **not** reconcile `books.json` at this stage. The provenance-highlighting UI keys off the known core-source list; anything unmatched is simply highlighted with its raw code. (books.json cleanup can be a later polish task.)

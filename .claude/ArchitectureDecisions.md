# Architecture Decisions

## CSS Import Strategy (2025-12-02)

### Problem

The `chummer-design-system.css` file was not loading correctly when imported via `@import` in `app.css`.

1.  **Import Placement**: The `@import` was at the bottom of `app.css`, violating standard CSS rules (must be at the top).
2.  **Alias Resolution**: The build system (Vite/PostCSS) was not resolving the `$styles` alias within the CSS file due to missing `postcss-import` configuration.
3.  **Tailwind Layers**: The file used `@layer` directives, which caused build errors when processed outside of the main Tailwind context.

### Solution

1.  **Moved Import**: The import was moved from `src/app.css` to `src/routes/+layout.svelte`.
    - This allows Vite to handle the import and resolve the `$styles` alias correctly.
    - It ensures the styles are loaded globally.
2.  **Removed Layers**: Commented out `@layer base` and `@layer utilities` in `chummer-design-system.css`.
    - Since the file is imported separately, it is treated as standard CSS.
    - Removing the directives prevents PostCSS errors while preserving the styles.

### Result

The design system styles (including the cyan buttons) now load correctly without build errors.

## No Transaction System for Improvements (2026-07-18, issue #66)

### Problem

Desktop's `ImprovementManager` has an explicit `Commit()`/`Rollback()` transaction
system (`clsImprovement.cs:2800-2817`): improvement creation accumulates in a
pending list, and a user cancelling a selection dialog (e.g. picking a skill
for Aptitude) triggers `Rollback()` to discard the half-created improvements.
The question for the web port: does `engine/improvementManager.ts` need an
equivalent transaction/rollback mechanism?

### Decision

**Do not port a transaction system.** `createImprovementsFromBonus` is a pure
function returning a plain array — nothing is written to character state
until the caller assembles a single new `Character` object and passes it to
`characterStore.set()`. Store mutation functions already follow this pattern
project-wide (see CLAUDE.md Conventions: immutable updates, `{ success, error }`
returns). This means:

- Improvement creation and the corresponding character-state change land in
  the **same atomic `characterStore.set()` call**, or not at all — there is
  no intermediate state to roll back from.
- User-cancelled selection dialogs (e.g. `AddQualityOptions.selectedSkill`)
  are resolved by the wizard **before** the mutation function is ever called
  — if the user cancels, the mutation function simply never runs. Desktop's
  rollback need only exists because its improvement list is a mutable,
  shared, long-lived collection that dialogs write into directly; the web
  store has no equivalent shared mutable state to unwind.

### Consequence

`valueOf`/`removeImprovements`/`createImprovementsFromBonus` stay pure
functions with no enable/disable-by-transaction bookkeeping. If a future
issue introduces genuinely multi-step improvement creation that can fail
partway (e.g. #68's more complex handlers), prefer building the full
`Improvement[]` array first and only appending it to character state once
complete, rather than introducing a rollback mechanism.

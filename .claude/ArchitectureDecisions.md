# Architecture Decisions

## CSS Import Strategy (2025-12-02)

### Problem
The `chummer-design-system.css` file was not loading correctly when imported via `@import` in `app.css`.
1.  **Import Placement**: The `@import` was at the bottom of `app.css`, violating standard CSS rules (must be at the top).
2.  **Alias Resolution**: The build system (Vite/PostCSS) was not resolving the `$styles` alias within the CSS file due to missing `postcss-import` configuration.
3.  **Tailwind Layers**: The file used `@layer` directives, which caused build errors when processed outside of the main Tailwind context.

### Solution
1.  **Moved Import**: The import was moved from `src/app.css` to `src/routes/+layout.svelte`.
    -   This allows Vite to handle the import and resolve the `$styles` alias correctly.
    -   It ensures the styles are loaded globally.
2.  **Removed Layers**: Commented out `@layer base` and `@layer utilities` in `chummer-design-system.css`.
    -   Since the file is imported separately, it is treated as standard CSS.
    -   Removing the directives prevents PostCSS errors while preserving the styles.

### Result
The design system styles (including the cyan buttons) now load correctly without build errors.

# ChummerWeb - GitHub Issues

This document contains all planned issues for the ChummerWeb project. Each issue is formatted for easy creation in GitHub.

---

## Epic: Foundation (Phase 1)

### Issue #1: Project Setup and Configuration

**Labels:** `epic:foundation`, `priority:critical`

**Description:**
Initialize the SvelteKit project with all necessary dependencies and configuration files.

**Tasks:**
- [ ] Create new SvelteKit project with TypeScript
- [ ] Configure TailwindCSS
- [ ] Set up ESLint and Prettier with strict rules
- [ ] Configure Vitest for unit testing
- [ ] Configure Playwright for E2E testing
- [ ] Set up TypeScript strict mode
- [ ] Create base project structure (lib/, routes/, etc.)
- [ ] Add agents.md code quality rules to linting
- [ ] Create initial README.md

**Acceptance Criteria:**
- Project builds without warnings
- All linting passes
- Test framework runs successfully
- TypeScript strict mode enabled

---

### Issue #2: Firebase Integration Setup

**Labels:** `epic:foundation`, `priority:critical`

**Description:**
Integrate Firebase SDK and configure authentication and Firestore with offline persistence.

**Tasks:**
- [ ] Install Firebase SDK dependencies
- [ ] Create Firebase configuration module
- [ ] Set up Firebase Authentication (Google provider)
- [ ] Set up Firestore with offline persistence enabled
- [ ] Create Firestore security rules
- [ ] Add environment variable handling for Firebase config
- [ ] Create auth state store (Svelte store)
- [ ] Implement sign-in/sign-out functions
- [ ] Add anonymous auth fallback

**Acceptance Criteria:**
- Users can sign in with Google
- Users can sign out
- Auth state persists across refreshes
- Firestore offline mode works
- Security rules prevent unauthorized access

---

### Issue #3: TypeScript Type Definitions

**Labels:** `epic:foundation`, `priority:critical`

**Description:**
Create comprehensive TypeScript interfaces for all character data structures based on the original C# classes.

**Tasks:**
- [ ] Create `types/character.ts` - main character interface
- [ ] Create `types/attributes.ts` - attribute system
- [ ] Create `types/skills.ts` - skills and skill groups
- [ ] Create `types/qualities.ts` - positive/negative qualities
- [ ] Create `types/equipment.ts` - gear, weapons, armor
- [ ] Create `types/augmentations.ts` - cyberware, bioware
- [ ] Create `types/magic.ts` - spells, powers, spirits
- [ ] Create `types/technomancer.ts` - complex forms, sprites
- [ ] Create `types/improvements.ts` - improvement system (88+ types)
- [ ] Create `types/vehicles.ts` - vehicles and mods
- [ ] Create `types/gamedata.ts` - game data file structures
- [ ] Add Zod schemas for runtime validation

**Acceptance Criteria:**
- All major data structures have TypeScript interfaces
- Zod schemas match TypeScript interfaces
- Types match original Chummer data model
- No `any` types used

**Reference Files:**
- `Chummer/clsCharacter.cs`
- `Chummer/clsEquipment.cs`
- `Chummer/clsUnique.cs`
- `Chummer/clsImprovement.cs`

---

### Issue #4: Base Layout and Navigation

**Labels:** `epic:foundation`, `priority:high`

**Description:**
Create the base application layout with navigation, responsive design, and theming.

**Tasks:**
- [ ] Create root layout component (+layout.svelte)
- [ ] Implement responsive navigation bar
- [ ] Add mobile hamburger menu
- [ ] Create sidebar for character list (desktop)
- [ ] Implement dark/light theme toggle
- [ ] Add theme persistence (localStorage)
- [ ] Create loading spinner component
- [ ] Create error boundary component
- [ ] Add toast notification system

**Acceptance Criteria:**
- Layout works on mobile and desktop
- Navigation is accessible (keyboard, screen reader)
- Theme preference persists
- Loading states are handled gracefully

---

### Issue #5: Authentication UI

**Labels:** `epic:foundation`, `priority:high`

**Description:**
Create the authentication pages and components.

**Tasks:**
- [ ] Create login page (/auth/login)
- [ ] Add Google sign-in button
- [ ] Add email/password form (optional)
- [ ] Create user profile dropdown
- [ ] Add sign-out functionality
- [ ] Handle auth errors gracefully
- [ ] Add "Continue as Guest" option
- [ ] Create account linking flow (guest -> permanent)
- [ ] Add auth guards for protected routes

**Acceptance Criteria:**
- Users can sign in with Google
- Users can continue without account
- Auth state reflected in UI
- Protected routes redirect to login

---

## Epic: Game Data (Phase 2)

### Issue #6: XML to JSON Converter Tool

**Labels:** `epic:gamedata`, `priority:critical`

**Description:**
Create a build-time script to convert Chummer XML data files to optimized JSON format.

**Tasks:**
- [ ] Create converter script in TypeScript
- [ ] Parse skills.xml → skills.json
- [ ] Parse metatypes.xml → metatypes.json
- [ ] Parse qualities.xml → qualities.json
- [ ] Parse spells.xml → spells.json
- [ ] Parse powers.xml → powers.json
- [ ] Parse gear.xml → gear.json
- [ ] Parse weapons.xml → weapons.json
- [ ] Parse armor.xml → armor.json
- [ ] Parse cyberware.xml → cyberware.json
- [ ] Parse bioware.xml → bioware.json
- [ ] Parse vehicles.xml → vehicles.json
- [ ] Parse programs.xml → programs.json
- [ ] Parse critterpowers.xml → critterpowers.json
- [ ] Parse martialarts.xml → martialarts.json
- [ ] Parse traditions.xml → traditions.json
- [ ] Parse mentors.xml → mentors.json
- [ ] Parse metamagic.xml → metamagic.json
- [ ] Parse echoes.xml → echoes.json
- [ ] Parse lifestyles.xml → lifestyles.json
- [ ] Add npm script to run conversion
- [ ] Validate output against Zod schemas

**Acceptance Criteria:**
- All XML files convert without data loss
- JSON validates against schemas
- Conversion is repeatable (deterministic)
- Source book references preserved

**Input Files:** `bin/data/*.xml`
**Output:** `static/data/*.json`

---

### Issue #7: Game Data Loading System

**Labels:** `epic:gamedata`, `priority:critical`

**Description:**
Create stores and utilities to load and cache game data.

**Tasks:**
- [ ] Create gameDataStore (Svelte store)
- [ ] Implement lazy loading for large data files
- [ ] Cache loaded data in memory
- [ ] Add IndexedDB caching for offline
- [ ] Create utility functions for data lookup
- [ ] Implement search/filter functions
- [ ] Add source book filtering
- [ ] Handle loading errors gracefully

**Acceptance Criteria:**
- Game data loads on first use
- Data cached for subsequent access
- Works offline after first load
- Search returns results in <100ms

---

### Issue #8: Game Data Browser UI

**Labels:** `epic:gamedata`, `priority:medium`

**Description:**
Create a browsable interface for all game data (skills, spells, gear, etc.).

**Tasks:**
- [ ] Create data browser route (/browse)
- [ ] Add category tabs (Skills, Spells, Gear, etc.)
- [ ] Implement search across all data
- [ ] Add filtering by source book
- [ ] Create detail view for each item type
- [ ] Add sorting options
- [ ] Implement pagination for large lists
- [ ] Add "Add to Character" button (when in context)

**Acceptance Criteria:**
- Users can browse all game data
- Search works across all types
- Performance acceptable with full dataset
- Mobile-friendly list views

---

## Epic: Character Management (Phase 3)

### Issue #9: Character List and Dashboard

**Labels:** `epic:character`, `priority:critical`

**Description:**
Create the main dashboard showing user's characters.

**Tasks:**
- [ ] Create dashboard route (/)
- [ ] Display character cards with summary info
- [ ] Add "New Character" button
- [ ] Implement character deletion with confirmation
- [ ] Add character duplication
- [ ] Show last modified date
- [ ] Add sorting/filtering options
- [ ] Handle empty state (no characters)
- [ ] Show sync status indicator

**Acceptance Criteria:**
- Users see their characters on load
- Can create, delete, duplicate characters
- Works offline with local data
- Sync status visible

---

### Issue #10: Character Firestore Integration

**Labels:** `epic:character`, `priority:critical`

**Description:**
Implement character CRUD operations with Firestore.

**Tasks:**
- [ ] Create character collection schema
- [ ] Implement createCharacter function
- [ ] Implement getCharacter function
- [ ] Implement updateCharacter function
- [ ] Implement deleteCharacter function
- [ ] Implement listCharacters function
- [ ] Add real-time listeners for changes
- [ ] Implement optimistic updates
- [ ] Handle offline queue
- [ ] Add conflict resolution strategy
- [ ] Implement auto-save with debounce

**Acceptance Criteria:**
- Characters persist to Firestore
- Works offline with queue
- Real-time sync between tabs
- No data loss on conflicts

---

### Issue #11: Character Store and State Management

**Labels:** `epic:character`, `priority:critical`

**Description:**
Create reactive Svelte stores for character state management.

**Tasks:**
- [ ] Create characterStore for current character
- [ ] Implement derived stores for computed values
- [ ] Add validation store for build rules
- [ ] Create history store for undo/redo
- [ ] Implement character dirty state tracking
- [ ] Add auto-save trigger on changes
- [ ] Create character factory function
- [ ] Implement character reset function

**Acceptance Criteria:**
- Character changes are reactive
- Computed values update automatically
- Undo/redo works
- Changes trigger auto-save

---

## Epic: Character Creation (Phase 4)

### Issue #12: Character Creation Wizard

**Labels:** `epic:creation`, `priority:critical`

**Description:**
Create the step-by-step character creation flow.

**Tasks:**
- [ ] Create character creation route (/character/new)
- [ ] Implement wizard step navigation
- [ ] Create step: Build method selection (BP/Karma)
- [ ] Create step: Metatype selection
- [ ] Create step: Attributes allocation
- [ ] Create step: Qualities selection
- [ ] Create step: Skills allocation
- [ ] Create step: Magic/Resonance (conditional)
- [ ] Create step: Equipment purchase
- [ ] Create step: Contacts
- [ ] Create step: Background/Notes
- [ ] Add step validation before proceeding
- [ ] Show BP/Karma remaining throughout
- [ ] Add finalize character action

**Acceptance Criteria:**
- Users can complete character creation
- Validation prevents invalid characters
- Progress saves automatically
- Can return to previous steps

---

### Issue #13: Metatype Selection Component

**Labels:** `epic:creation`, `priority:critical`

**Description:**
Create the metatype selection UI with attribute limits display.

**Tasks:**
- [ ] Display all metatypes from data
- [ ] Show metatype BP/Karma cost
- [ ] Display attribute min/max/aug limits
- [ ] Show metatype special abilities
- [ ] Support metavariants selection
- [ ] Filter by category (Metahuman, Shapeshifter, etc.)
- [ ] Show source book reference
- [ ] Update character on selection

**Acceptance Criteria:**
- All metatypes from data displayed
- Attribute limits shown clearly
- Metavariants accessible
- Selection updates character state

---

### Issue #14: Attribute Allocation Component

**Labels:** `epic:creation`, `priority:critical`

**Description:**
Create the attribute allocation UI respecting metatype limits.

**Tasks:**
- [ ] Display all 8 base attributes
- [ ] Show metatype min/max limits
- [ ] Implement increment/decrement controls
- [ ] Calculate and display BP/Karma cost
- [ ] Show attribute bonuses from qualities
- [ ] Display augmented maximum
- [ ] Validate against metatype limits
- [ ] Calculate derived stats (Initiative, etc.)
- [ ] Handle Edge, Magic, Resonance specially

**Acceptance Criteria:**
- Attributes respect metatype limits
- Cost calculated correctly
- Derived stats update
- Clear feedback on limits

---

### Issue #15: Quality Selection Component

**Labels:** `epic:creation`, `priority:critical`

**Description:**
Create the quality selection UI with requirement checking.

**Tasks:**
- [ ] Display all qualities from data
- [ ] Separate positive and negative tabs
- [ ] Show BP/Karma cost
- [ ] Display quality effects/bonuses
- [ ] Check quality requirements (metatype, other qualities)
- [ ] Check forbidden combinations
- [ ] Enforce quality limits (max positive/negative)
- [ ] Apply improvements on selection
- [ ] Show source book reference

**Acceptance Criteria:**
- All qualities from data displayed
- Requirements/forbidden checked
- Limits enforced
- Improvements applied correctly

---

### Issue #16: Skill Allocation Component

**Labels:** `epic:creation`, `priority:critical`

**Description:**
Create the skill selection and rating UI.

**Tasks:**
- [ ] Display all active skills by category
- [ ] Display knowledge skills separately
- [ ] Implement skill group purchases
- [ ] Add skill rating controls (1-6)
- [ ] Calculate BP/Karma cost
- [ ] Show linked attribute
- [ ] Add specialization selection
- [ ] Apply skill bonuses from improvements
- [ ] Track knowledge skill points
- [ ] Validate against maximum ratings

**Acceptance Criteria:**
- All skills selectable
- Costs calculated correctly
- Skill groups work properly
- Specializations tracked

---

### Issue #17: Equipment Purchase Component

**Labels:** `epic:creation`, `priority:high`

**Description:**
Create the equipment purchase interface.

**Tasks:**
- [ ] Display gear by category (Weapons, Armor, etc.)
- [ ] Implement search and filtering
- [ ] Show item cost and availability
- [ ] Add quantity selection
- [ ] Track remaining nuyen
- [ ] Check availability restrictions
- [ ] Support item customization (accessories, mods)
- [ ] Handle capacity for containers
- [ ] Add to character inventory

**Acceptance Criteria:**
- Users can purchase all equipment types
- Nuyen tracked accurately
- Availability restrictions work
- Inventory displays correctly

---

### Issue #18: Contact Management Component

**Labels:** `epic:creation`, `priority:high`

**Description:**
Create the contact creation and management interface.

**Tasks:**
- [ ] Add new contact form
- [ ] Set loyalty rating (1-6)
- [ ] Set connection rating (1-6)
- [ ] Calculate contact BP/Karma cost
- [ ] Add contact notes/description
- [ ] Edit existing contacts
- [ ] Delete contacts
- [ ] Display contact list

**Acceptance Criteria:**
- Contacts can be added/edited/deleted
- Costs calculated correctly
- Contact info saved with character

---

## Epic: Magic System (Phase 5)

### Issue #19: Magic Type Selection

**Labels:** `epic:magic`, `priority:high`

**Description:**
Handle Adept, Magician, Mystic Adept quality selection and setup.

**Tasks:**
- [ ] Detect magic-enabling qualities
- [ ] Enable MAG attribute when appropriate
- [ ] Show magic tradition selection (Magician)
- [ ] Show mentor spirit selection
- [ ] Calculate magic attribute correctly
- [ ] Handle Mystic Adept power point split
- [ ] Apply magic-related improvements

**Acceptance Criteria:**
- Magic qualities enable correctly
- Tradition selection works
- MAG attribute functions properly

---

### Issue #20: Spell Selection Component

**Labels:** `epic:magic`, `priority:high`

**Description:**
Create the spell learning and management interface.

**Tasks:**
- [ ] Display all spells by category
- [ ] Show spell details (type, range, duration, DV)
- [ ] Calculate free spells from MAG
- [ ] Track additional spell costs
- [ ] Filter by tradition
- [ ] Add spell to character
- [ ] Remove spell from character
- [ ] Show source book reference

**Acceptance Criteria:**
- All spells accessible
- Free spell limit enforced
- Tradition restrictions work
- Spells save to character

---

### Issue #21: Adept Power Selection Component

**Labels:** `epic:magic`, `priority:high`

**Description:**
Create the adept power selection and management interface.

**Tasks:**
- [ ] Display all adept powers
- [ ] Show power point cost
- [ ] Calculate total power points available
- [ ] Handle powers with levels
- [ ] Apply power improvements
- [ ] Track remaining power points
- [ ] Show power descriptions
- [ ] Handle power prerequisites

**Acceptance Criteria:**
- Powers display correctly
- Point costs accurate
- Prerequisites checked
- Improvements applied

---

### Issue #22: Spirit Management Component

**Labels:** `epic:magic`, `priority:medium`

**Description:**
Create the spirit binding and management interface.

**Tasks:**
- [ ] Display available spirit types (by tradition)
- [ ] Add bound spirit
- [ ] Set spirit force
- [ ] Track services owed
- [ ] Calculate binding cost
- [ ] Remove/release spirits
- [ ] Show spirit powers
- [ ] Handle ally spirits

**Acceptance Criteria:**
- Spirits bind correctly
- Force and services tracked
- Tradition restrictions work

---

### Issue #23: Initiation Management

**Labels:** `epic:magic`, `priority:medium`

**Description:**
Create the initiation grade and metamagic management.

**Tasks:**
- [ ] Display initiation grade
- [ ] Add new initiation grade
- [ ] Calculate initiation karma cost
- [ ] Select metamagic ability
- [ ] Show available metamagics
- [ ] Apply initiation bonuses
- [ ] Track group membership (ordeal discount)

**Acceptance Criteria:**
- Initiation grades add correctly
- Karma costs accurate
- Metamagics selectable
- Bonuses applied

---

## Epic: Technomancer System (Phase 6)

### Issue #24: Technomancer Setup

**Labels:** `epic:technomancer`, `priority:high`

**Description:**
Handle Technomancer quality and stream selection.

**Tasks:**
- [ ] Detect Technomancer quality
- [ ] Enable RES attribute
- [ ] Show stream selection
- [ ] Calculate living persona attributes
- [ ] Apply technomancer improvements

**Acceptance Criteria:**
- Technomancer enables correctly
- Stream selection works
- Living persona calculates properly

---

### Issue #25: Complex Form Selection

**Labels:** `epic:technomancer`, `priority:high`

**Description:**
Create the complex form learning interface.

**Tasks:**
- [ ] Display all complex forms
- [ ] Show form details
- [ ] Calculate free forms from RES
- [ ] Add form to character
- [ ] Remove form from character
- [ ] Show options/variations

**Acceptance Criteria:**
- All forms accessible
- Free form limit enforced
- Forms save correctly

---

### Issue #26: Sprite Management

**Labels:** `epic:technomancer`, `priority:medium`

**Description:**
Create the sprite compilation and management interface.

**Tasks:**
- [ ] Display sprite types
- [ ] Compile new sprite
- [ ] Set sprite rating
- [ ] Track tasks owed
- [ ] Register sprites
- [ ] Release sprites
- [ ] Show sprite powers

**Acceptance Criteria:**
- Sprites compile correctly
- Tasks tracked properly

---

### Issue #27: Submersion Management

**Labels:** `epic:technomancer`, `priority:medium`

**Description:**
Create the submersion grade and echo management.

**Tasks:**
- [ ] Display submersion grade
- [ ] Add new submersion grade
- [ ] Calculate submersion karma cost
- [ ] Select echo ability
- [ ] Show available echoes
- [ ] Apply submersion bonuses

**Acceptance Criteria:**
- Submersion grades add correctly
- Echoes selectable
- Bonuses applied

---

## Epic: Augmentations (Phase 7)

### Issue #28: Cyberware Management

**Labels:** `epic:augmentations`, `priority:high`

**Description:**
Create the cyberware purchase and management interface.

**Tasks:**
- [ ] Display all cyberware by category
- [ ] Show essence cost
- [ ] Support cyberware grades (standard, alpha, beta, delta)
- [ ] Calculate grade cost/essence multipliers
- [ ] Show availability rating
- [ ] Handle capacity (cyberlimbs)
- [ ] Apply cyberware improvements
- [ ] Track total essence loss
- [ ] Check essence minimum

**Acceptance Criteria:**
- All cyberware accessible
- Essence calculated correctly
- Grades modify costs properly
- Improvements applied

---

### Issue #29: Bioware Management

**Labels:** `epic:augmentations`, `priority:high`

**Description:**
Create the bioware purchase and management interface.

**Tasks:**
- [ ] Display all bioware by category
- [ ] Show essence cost
- [ ] Support bioware grades
- [ ] Calculate grade multipliers
- [ ] Show availability rating
- [ ] Apply bioware improvements
- [ ] Handle cultured vs standard
- [ ] Check essence minimum

**Acceptance Criteria:**
- All bioware accessible
- Essence calculated correctly
- Grades work properly

---

### Issue #30: Essence Tracking System

**Labels:** `epic:augmentations`, `priority:critical`

**Description:**
Implement accurate essence calculation and tracking.

**Tasks:**
- [ ] Calculate base essence (6.0)
- [ ] Subtract cyberware essence
- [ ] Subtract bioware essence (separate pool option)
- [ ] Apply grade multipliers
- [ ] Handle essence cost improvements
- [ ] Track essence at special start
- [ ] Update MAG/RES limits based on essence
- [ ] Display essence with decimal precision

**Acceptance Criteria:**
- Essence calculates accurately
- Grade reductions work
- MAG/RES affected correctly
- Matches Chummer calculations

---

## Epic: Equipment Details (Phase 8)

### Issue #31: Weapon Management

**Labels:** `epic:equipment`, `priority:high`

**Description:**
Create comprehensive weapon management.

**Tasks:**
- [ ] Display weapon stats (DV, AP, mode, RC)
- [ ] Add weapon accessories
- [ ] Add weapon modifications
- [ ] Calculate modified stats
- [ ] Track ammunition
- [ ] Handle smartlink bonuses
- [ ] Show range categories
- [ ] Support melee and ranged

**Acceptance Criteria:**
- All weapon types work
- Accessories modify stats
- Range info displayed

---

### Issue #32: Armor Management

**Labels:** `epic:equipment`, `priority:high`

**Description:**
Create comprehensive armor management.

**Tasks:**
- [ ] Display armor ratings (Ballistic, Impact)
- [ ] Add armor modifications
- [ ] Calculate total armor
- [ ] Handle armor stacking rules
- [ ] Track encumbrance
- [ ] Show armor capacity
- [ ] Support armor bundles

**Acceptance Criteria:**
- Armor stacking works correctly
- Modifications apply properly
- Encumbrance calculated

---

### Issue #33: Vehicle Management

**Labels:** `epic:equipment`, `priority:medium`

**Description:**
Create vehicle purchase and customization.

**Tasks:**
- [ ] Display vehicle stats
- [ ] Add vehicle modifications
- [ ] Mount weapons on vehicles
- [ ] Store gear in vehicles
- [ ] Calculate mod slots
- [ ] Handle drones separately
- [ ] Track vehicle condition

**Acceptance Criteria:**
- Vehicles purchasable
- Mods work correctly
- Gear storage works

---

### Issue #34: Gear Hierarchy and Capacity

**Labels:** `epic:equipment`, `priority:medium`

**Description:**
Implement nested gear and capacity tracking.

**Tasks:**
- [ ] Support gear parent/child relationships
- [ ] Track container capacity
- [ ] Display gear tree structure
- [ ] Move gear between containers
- [ ] Calculate total weight/capacity
- [ ] Handle special containers (cyberlimbs, vehicles)

**Acceptance Criteria:**
- Nested gear works
- Capacity enforced
- Drag-and-drop works

---

## Epic: Career Mode (Phase 9)

### Issue #35: Career Mode Conversion

**Labels:** `epic:career`, `priority:high`

**Description:**
Implement character finalization and career mode switch.

**Tasks:**
- [ ] Validate character for finalization
- [ ] Show finalization warnings
- [ ] Convert BP to karma (if needed)
- [ ] Set character as created
- [ ] Enable career mode UI
- [ ] Lock build mode changes
- [ ] Record starting karma/nuyen

**Acceptance Criteria:**
- Characters finalize correctly
- Career mode enables
- Build points converted

---

### Issue #36: Karma Tracking System

**Labels:** `epic:career`, `priority:high`

**Description:**
Implement karma earning and spending for career mode.

**Tasks:**
- [ ] Add karma to character
- [ ] Log karma sources
- [ ] Spend karma on improvements
- [ ] Calculate improvement costs
- [ ] Track total career karma
- [ ] Display karma history
- [ ] Validate karma spending

**Acceptance Criteria:**
- Karma tracks accurately
- All improvements purchasable
- History complete

---

### Issue #37: Nuyen Tracking System

**Labels:** `epic:career`, `priority:high`

**Description:**
Implement nuyen earning and spending for career mode.

**Tasks:**
- [ ] Add nuyen to character
- [ ] Log nuyen sources
- [ ] Spend nuyen on gear
- [ ] Pay lifestyle costs
- [ ] Track transaction history
- [ ] Handle debt/loans

**Acceptance Criteria:**
- Nuyen tracks accurately
- Purchases work
- History complete

---

### Issue #38: Advancement History

**Labels:** `epic:career`, `priority:medium`

**Description:**
Create advancement history view and logging.

**Tasks:**
- [ ] Log all character changes
- [ ] Display change history
- [ ] Show date/session for changes
- [ ] Filter by change type
- [ ] Export history

**Acceptance Criteria:**
- All changes logged
- History viewable
- Filtering works

---

### Issue #39: Calendar and Time Tracking

**Labels:** `epic:career`, `priority:low`

**Description:**
Implement in-game calendar and time tracking.

**Tasks:**
- [ ] Add calendar weeks
- [ ] Track game dates
- [ ] Associate events with dates
- [ ] Calculate lifestyle intervals
- [ ] Display timeline view

**Acceptance Criteria:**
- Calendar works
- Events tracked
- Lifestyle timing correct

---

## Epic: Improvement Engine (Phase 10)

### Issue #40: Improvement Manager Core

**Labels:** `epic:engine`, `priority:critical`

**Description:**
Port the core improvement management system from C#.

**Tasks:**
- [ ] Create ImprovementManager class
- [ ] Implement all 88 improvement types
- [ ] Implement all 27 improvement sources
- [ ] Create addImprovement function
- [ ] Create removeImprovement function
- [ ] Implement improvement stacking
- [ ] Handle conditional improvements
- [ ] Create improvement validation

**Reference:** `Chummer/clsImprovement.cs`

**Acceptance Criteria:**
- All improvement types supported
- Stacking works correctly
- Matches Chummer behavior

---

### Issue #41: Attribute Calculator

**Labels:** `epic:engine`, `priority:critical`

**Description:**
Implement attribute calculation with all modifiers.

**Tasks:**
- [ ] Calculate base attribute value
- [ ] Apply metatype limits
- [ ] Add improvement bonuses
- [ ] Calculate augmented value
- [ ] Handle temporary vs permanent
- [ ] Calculate attribute maximum
- [ ] Derive initiative from attributes

**Acceptance Criteria:**
- Attributes calculate correctly
- All modifiers applied
- Matches Chummer math

---

### Issue #42: Skill Calculator

**Labels:** `epic:engine`, `priority:critical`

**Description:**
Implement skill calculation with all modifiers.

**Tasks:**
- [ ] Calculate base skill rating
- [ ] Apply skill improvements
- [ ] Calculate skill dice pool
- [ ] Handle defaulting
- [ ] Apply specialization bonus
- [ ] Handle skill groups
- [ ] Calculate knowledge skill points

**Acceptance Criteria:**
- Skills calculate correctly
- Dice pools accurate
- Defaulting works

---

### Issue #43: Combat Stats Calculator

**Labels:** `epic:engine`, `priority:high`

**Description:**
Calculate combat-related derived statistics.

**Tasks:**
- [ ] Calculate condition monitors (Physical, Stun)
- [ ] Calculate initiative
- [ ] Calculate defense pool
- [ ] Calculate armor values
- [ ] Calculate movement rates
- [ ] Apply combat improvements

**Acceptance Criteria:**
- All combat stats accurate
- Condition monitors correct
- Initiative calculates properly

---

### Issue #44: Build Validation Engine

**Labels:** `epic:engine`, `priority:critical`

**Description:**
Implement character build validation.

**Tasks:**
- [ ] Validate attribute limits
- [ ] Validate skill limits
- [ ] Validate quality limits
- [ ] Validate BP/Karma budget
- [ ] Validate availability restrictions
- [ ] Validate essence minimum
- [ ] Generate validation errors/warnings
- [ ] Block finalization on errors

**Acceptance Criteria:**
- Invalid builds caught
- Clear error messages
- Warnings for recommendations

---

## Epic: XML Compatibility (Phase 11)

### Issue #45: Chummer XML Import

**Labels:** `epic:xml`, `priority:high`

**Description:**
Implement Chummer character XML import.

**Tasks:**
- [ ] Parse Chummer XML format
- [ ] Map XML elements to data model
- [ ] Handle version differences
- [ ] Import all character data
- [ ] Validate imported data
- [ ] Handle missing data gracefully
- [ ] Show import summary/warnings
- [ ] Support drag-and-drop import

**Acceptance Criteria:**
- Chummer files import successfully
- No data loss on import
- Warnings for issues

---

### Issue #46: Chummer XML Export

**Labels:** `epic:xml`, `priority:high`

**Description:**
Implement Chummer character XML export.

**Tasks:**
- [ ] Generate Chummer XML format
- [ ] Include all character data
- [ ] Match Chummer schema
- [ ] Handle file download
- [ ] Test round-trip (import→export→import)
- [ ] Include version info

**Acceptance Criteria:**
- Export matches Chummer format
- Files open in original Chummer
- Round-trip preserves data

---

### Issue #47: Custom Content Import

**Labels:** `epic:xml`, `priority:medium`

**Description:**
Support importing custom content XML files.

**Tasks:**
- [ ] Accept custom content XML
- [ ] Convert to JSON on import
- [ ] Merge with base data
- [ ] Store custom content locally
- [ ] Allow enabling/disabling custom content
- [ ] Handle conflicts with base data

**Acceptance Criteria:**
- Custom content loads
- Merges correctly
- Can be toggled

---

## Epic: Character Sharing (Phase 12)

### Issue #48: Public Character Sharing

**Labels:** `epic:sharing`, `priority:medium`

**Description:**
Implement public link sharing for characters.

**Tasks:**
- [ ] Generate unique share ID
- [ ] Create public view route
- [ ] Display character read-only
- [ ] Track view count
- [ ] Allow revoking share
- [ ] Copy link to clipboard

**Acceptance Criteria:**
- Share links work
- Character displays correctly
- Can revoke access

---

### Issue #49: User-to-User Sharing

**Labels:** `epic:sharing`, `priority:low`

**Description:**
Implement sharing characters with specific users.

**Tasks:**
- [ ] Share with user by email
- [ ] Accept/decline share invites
- [ ] Display shared characters
- [ ] Allow read or edit access
- [ ] Revoke user access

**Acceptance Criteria:**
- Can share with specific users
- Permissions work correctly

---

## Epic: PWA and Offline (Phase 13)

### Issue #50: Service Worker Setup

**Labels:** `epic:pwa`, `priority:high`

**Description:**
Implement service worker for offline support.

**Tasks:**
- [ ] Configure Workbox via Vite
- [ ] Cache app shell
- [ ] Cache game data files
- [ ] Implement offline fallback
- [ ] Handle service worker updates
- [ ] Show update notification

**Acceptance Criteria:**
- App works fully offline
- Updates handled gracefully
- Cache invalidates properly

---

### Issue #51: PWA Manifest and Install

**Labels:** `epic:pwa`, `priority:high`

**Description:**
Create PWA manifest and installation support.

**Tasks:**
- [ ] Create manifest.json
- [ ] Add app icons (all sizes)
- [ ] Configure theme colors
- [ ] Implement install prompt
- [ ] Handle standalone mode
- [ ] Add splash screen

**Acceptance Criteria:**
- App installable
- Icons display correctly
- Standalone mode works

---

### Issue #52: Offline Data Sync

**Labels:** `epic:pwa`, `priority:high`

**Description:**
Implement robust offline sync with conflict resolution.

**Tasks:**
- [ ] Queue changes when offline
- [ ] Sync when connection restored
- [ ] Detect sync conflicts
- [ ] Implement conflict resolution UI
- [ ] Show sync status indicator
- [ ] Handle sync errors

**Acceptance Criteria:**
- Changes sync reliably
- Conflicts resolved sensibly
- User informed of status

---

## Epic: Polish and UX (Phase 14)

### Issue #53: Character Sheet Print View

**Labels:** `epic:polish`, `priority:medium`

**Description:**
Create printable character sheet view.

**Tasks:**
- [ ] Design print-friendly layout
- [ ] Include all character data
- [ ] Optimize for A4/Letter
- [ ] Add print CSS
- [ ] Support PDF export (print to PDF)

**Acceptance Criteria:**
- Prints cleanly
- All data included
- Readable format

---

### Issue #54: Dice Roller Integration

**Labels:** `epic:polish`, `priority:low`

**Description:**
Add integrated dice roller utility.

**Tasks:**
- [ ] Create dice roller component
- [ ] Roll d6 pools
- [ ] Count hits (5, 6)
- [ ] Track glitches (>half ones)
- [ ] Show roll history
- [ ] Add common roll shortcuts

**Acceptance Criteria:**
- Dice roller works
- Hits counted correctly
- Glitches detected

---

### Issue #55: Mobile Optimization

**Labels:** `epic:polish`, `priority:high`

**Description:**
Optimize UI for mobile devices.

**Tasks:**
- [ ] Review all components for mobile
- [ ] Add touch-friendly controls
- [ ] Optimize tap targets
- [ ] Test on various screen sizes
- [ ] Add mobile-specific navigation
- [ ] Optimize performance on mobile

**Acceptance Criteria:**
- All features work on mobile
- Touch interactions smooth
- Performance acceptable

---

### Issue #56: Accessibility Audit

**Labels:** `epic:polish`, `priority:medium`

**Description:**
Ensure application meets accessibility standards.

**Tasks:**
- [ ] Add ARIA labels
- [ ] Ensure keyboard navigation
- [ ] Test with screen reader
- [ ] Fix color contrast issues
- [ ] Add focus indicators
- [ ] Test with accessibility tools

**Acceptance Criteria:**
- WCAG 2.1 AA compliant
- Screen reader compatible
- Keyboard navigable

---

### Issue #57: Performance Optimization

**Labels:** `epic:polish`, `priority:medium`

**Description:**
Optimize application performance.

**Tasks:**
- [ ] Analyze bundle size
- [ ] Implement code splitting
- [ ] Lazy load routes
- [ ] Optimize images
- [ ] Add loading skeletons
- [ ] Profile and fix bottlenecks

**Acceptance Criteria:**
- Bundle under 500KB
- LCP under 2.5s
- Smooth interactions

---

## Epic: Testing (Phase 15)

### Issue #58: Unit Test Suite

**Labels:** `epic:testing`, `priority:high`

**Description:**
Create comprehensive unit test suite.

**Tasks:**
- [ ] Test all engine calculations
- [ ] Test improvement manager
- [ ] Test validation logic
- [ ] Test data transformations
- [ ] Test utility functions
- [ ] Achieve 80% coverage

**Acceptance Criteria:**
- 80%+ code coverage
- All critical paths tested
- Tests run in CI

---

### Issue #59: Integration Test Suite

**Labels:** `epic:testing`, `priority:high`

**Description:**
Create integration tests for key flows.

**Tasks:**
- [ ] Test character creation flow
- [ ] Test Firebase integration
- [ ] Test XML import/export
- [ ] Test offline sync
- [ ] Test authentication flows

**Acceptance Criteria:**
- All major flows tested
- Tests reliable in CI

---

### Issue #60: E2E Test Suite

**Labels:** `epic:testing`, `priority:medium`

**Description:**
Create end-to-end tests with Playwright.

**Tasks:**
- [ ] Test full character creation
- [ ] Test career mode advancement
- [ ] Test sharing features
- [ ] Test offline functionality
- [ ] Test on multiple browsers

**Acceptance Criteria:**
- Critical user journeys tested
- Cross-browser verified

---

## Labels Reference

| Label | Description |
|-------|-------------|
| `epic:foundation` | Project setup and infrastructure |
| `epic:gamedata` | Game data loading and management |
| `epic:character` | Character management features |
| `epic:creation` | Character creation wizard |
| `epic:magic` | Magic system features |
| `epic:technomancer` | Technomancer system features |
| `epic:augmentations` | Cyberware/bioware features |
| `epic:equipment` | Equipment management |
| `epic:career` | Career mode features |
| `epic:engine` | Rules engine and calculations |
| `epic:xml` | XML compatibility |
| `epic:sharing` | Character sharing |
| `epic:pwa` | PWA and offline support |
| `epic:polish` | UX and polish |
| `epic:testing` | Test coverage |
| `priority:critical` | Must have for MVP |
| `priority:high` | Important for release |
| `priority:medium` | Should have |
| `priority:low` | Nice to have |

---

## Milestones

### Milestone 1: MVP
Issues: #1-5, #6-7, #9-11, #12-18, #40-44

### Milestone 2: Magic & Tech
Issues: #19-27

### Milestone 3: Augmentations & Equipment
Issues: #28-34

### Milestone 4: Career Mode
Issues: #35-39

### Milestone 5: XML & Sharing
Issues: #45-49

### Milestone 6: PWA & Polish
Issues: #50-57

### Milestone 7: Full Testing
Issues: #58-60

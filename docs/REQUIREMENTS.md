# ChummerWeb - Requirements Specification

## Project Overview

ChummerWeb is a modern web-based reimplementation of ChummerGenSR4, a Shadowrun 4th Edition character generator and career manager. The application enables players to create, manage, and share characters online with full offline support via Progressive Web App (PWA) technology.

---

## Stakeholder Goals

| Stakeholder | Goal |
|-------------|------|
| Players | Create and manage SR4 characters from any device |
| Game Masters | Access player characters, share game data |
| Community | Share characters, import/export Chummer XML files |
| Maintainers | Lightweight, maintainable codebase |

---

## Functional Requirements

### FR-1: User Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Users can sign in with Google account | High |
| FR-1.2 | Users can sign in with email/password | Medium |
| FR-1.3 | Users can use app anonymously (local only) | High |
| FR-1.4 | Users can link anonymous account to permanent account | Medium |
| FR-1.5 | User sessions persist across browser restarts | High |

### FR-2: Character Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Users can create new characters | High |
| FR-2.2 | Users can view list of their characters | High |
| FR-2.3 | Users can delete characters | High |
| FR-2.4 | Users can duplicate characters | Medium |
| FR-2.5 | Users can import characters from Chummer XML | High |
| FR-2.6 | Users can export characters to Chummer XML | High |
| FR-2.7 | Characters auto-save on changes | High |
| FR-2.8 | Users can manually trigger character save | Medium |

### FR-3: Character Creation (Build Mode)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Support Build Point (BP) creation method | High |
| FR-3.2 | Support Karma creation method | High |
| FR-3.3 | Select metatype with attribute limits | High |
| FR-3.4 | Allocate attributes within metatype limits | High |
| FR-3.5 | Select positive and negative qualities | High |
| FR-3.6 | Select and rate active skills | High |
| FR-3.7 | Select and rate knowledge skills | High |
| FR-3.8 | Select skill specializations | High |
| FR-3.9 | Purchase gear within starting nuyen | High |
| FR-3.10 | Select contacts with loyalty/connection | High |
| FR-3.11 | Track BP/Karma spent in real-time | High |
| FR-3.12 | Validate character against build rules | High |
| FR-3.13 | Finalize character for career mode | High |

### FR-4: Magic System

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Support Adept quality and powers | High |
| FR-4.2 | Support Magician quality and spellcasting | High |
| FR-4.3 | Support Mystic Adept quality | High |
| FR-4.4 | Select magic tradition | High |
| FR-4.5 | Learn and manage spells | High |
| FR-4.6 | Manage adept powers with power points | High |
| FR-4.7 | Bind and manage foci | Medium |
| FR-4.8 | Summon and manage spirits | Medium |
| FR-4.9 | Track initiation grades and metamagics | Medium |
| FR-4.10 | Support mentor spirits | Medium |

### FR-5: Technomancer System

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Support Technomancer quality | High |
| FR-5.2 | Select technomancer stream | High |
| FR-5.3 | Learn and manage complex forms | High |
| FR-5.4 | Calculate living persona attributes | High |
| FR-5.5 | Compile and manage sprites | Medium |
| FR-5.6 | Track submersion grades and echoes | Medium |

### FR-6: Equipment System

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Browse and purchase weapons | High |
| FR-6.2 | Add weapon accessories and modifications | High |
| FR-6.3 | Browse and purchase armor | High |
| FR-6.4 | Add armor modifications | High |
| FR-6.5 | Browse and purchase general gear | High |
| FR-6.6 | Support gear capacity (e.g., backpacks) | Medium |
| FR-6.7 | Browse and purchase cyberware | High |
| FR-6.8 | Browse and purchase bioware | High |
| FR-6.9 | Calculate essence from augmentations | High |
| FR-6.10 | Support cyberware grades (standard, alpha, beta, delta) | High |
| FR-6.11 | Browse and purchase vehicles | Medium |
| FR-6.12 | Add vehicle modifications | Medium |
| FR-6.13 | Manage vehicle-mounted gear and weapons | Medium |
| FR-6.14 | Track availability restrictions | High |
| FR-6.15 | Select lifestyle | High |

### FR-7: Career Mode

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Track karma earnings and spending | High |
| FR-7.2 | Track nuyen earnings and spending | High |
| FR-7.3 | Improve attributes with karma | High |
| FR-7.4 | Improve skills with karma | High |
| FR-7.5 | Learn new skills | High |
| FR-7.6 | Learn new spells/powers | High |
| FR-7.7 | Purchase new equipment | High |
| FR-7.8 | Track advancement history | High |
| FR-7.9 | Support calendar/time tracking | Medium |
| FR-7.10 | Calculate street cred, notoriety, public awareness | Medium |
| FR-7.11 | Track condition monitors (physical, stun) | Medium |

### FR-8: Character Sharing

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | Generate shareable link for character | Medium |
| FR-8.2 | View shared character (read-only) | Medium |
| FR-8.3 | Share character with specific users | Low |
| FR-8.4 | Set character visibility (private/public) | Medium |

### FR-9: Game Data Browser

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-9.1 | Browse all skills with descriptions | Medium |
| FR-9.2 | Browse all qualities with effects | Medium |
| FR-9.3 | Browse all spells with details | Medium |
| FR-9.4 | Browse all equipment with stats | Medium |
| FR-9.5 | Search across all game data | Medium |
| FR-9.6 | Filter by source book | Medium |

### FR-10: Settings and Customization

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10.1 | Configure house rules (karma costs, etc.) | Medium |
| FR-10.2 | Enable/disable source books | Medium |
| FR-10.3 | Switch UI language | Low |
| FR-10.4 | Toggle dark/light theme | Medium |
| FR-10.5 | Enable/disable cloud sync | High |

---

## Non-Functional Requirements

### NFR-1: Offline Support

| ID | Requirement |
|----|-------------|
| NFR-1.1 | App must function fully offline after initial load |
| NFR-1.2 | All game data cached locally |
| NFR-1.3 | Characters saved locally when offline |
| NFR-1.4 | Automatic sync when connection restored |
| NFR-1.5 | Conflict resolution for offline edits |

### NFR-2: Performance

| ID | Requirement |
|----|-------------|
| NFR-2.1 | Initial load under 3 seconds on 3G |
| NFR-2.2 | Time to interactive under 5 seconds |
| NFR-2.3 | Character operations complete in under 100ms |
| NFR-2.4 | Bundle size under 500KB (gzipped) |

### NFR-3: Compatibility

| ID | Requirement |
|----|-------------|
| NFR-3.1 | Import Chummer XML character files |
| NFR-3.2 | Export to Chummer XML format |
| NFR-3.3 | Support Chrome, Firefox, Safari, Edge |
| NFR-3.4 | Mobile responsive design |
| NFR-3.5 | Installable as PWA on mobile/desktop |

### NFR-4: Security

| ID | Requirement |
|----|-------------|
| NFR-4.1 | User data accessible only to owner |
| NFR-4.2 | Firestore security rules enforced |
| NFR-4.3 | No sensitive data in client logs |
| NFR-4.4 | HTTPS only |

### NFR-5: Maintainability

| ID | Requirement |
|----|-------------|
| NFR-5.1 | Functions max 60 lines |
| NFR-5.2 | Min 2 assertions per function |
| NFR-5.3 | No dynamic memory after init |
| NFR-5.4 | All loops have fixed upper bounds |
| NFR-5.5 | All function return values checked |
| NFR-5.6 | TypeScript strict mode enabled |
| NFR-5.7 | Test coverage minimum 80% |

---

## Data Model

### Character Entity

```typescript
interface Character {
  // Identity
  id: string;
  userId: string;
  name: string;
  alias: string;
  playerName: string;

  // Status
  created: boolean;  // false = build mode, true = career mode
  buildMethod: 'bp' | 'karma';
  buildPoints: number;

  // Metatype
  metatype: string;
  metavariant: string | null;
  metatypeCategory: string;

  // Attributes
  attributes: {
    bod: AttributeValue;
    agi: AttributeValue;
    rea: AttributeValue;
    str: AttributeValue;
    cha: AttributeValue;
    int: AttributeValue;
    log: AttributeValue;
    wil: AttributeValue;
    edg: AttributeValue;
    mag: AttributeValue | null;
    res: AttributeValue | null;
    ess: number;
  };

  // Collections
  skills: Skill[];
  skillGroups: SkillGroup[];
  qualities: Quality[];
  spells: Spell[];
  powers: Power[];
  complexForms: ComplexForm[];
  gear: Gear[];
  weapons: Weapon[];
  armor: Armor[];
  cyberware: Cyberware[];
  bioware: Bioware[];
  vehicles: Vehicle[];
  contacts: Contact[];
  spirits: Spirit[];
  sprites: Sprite[];

  // Improvements (calculated bonuses)
  improvements: Improvement[];

  // Resources
  karma: number;
  totalKarma: number;
  nuyen: number;

  // Reputation
  streetCred: number;
  notoriety: number;
  publicAwareness: number;

  // Condition
  physicalDamage: number;
  stunDamage: number;

  // Career tracking
  expenseLog: ExpenseEntry[];
  calendar: CalendarWeek[];
  initiationGrade: number;
  submersionGrade: number;

  // Magic
  magicTradition: string | null;
  mentorSpirit: string | null;
  technomancerStream: string | null;

  // Flags
  magEnabled: boolean;
  resEnabled: boolean;
  adeptEnabled: boolean;
  magicianEnabled: boolean;
  technomancerEnabled: boolean;

  // Metadata
  notes: string;
  background: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;

  // Sharing
  sharedWith: string[];
  isPublic: boolean;
}
```

### Improvement System

The improvement system tracks all bonuses and modifications to a character from various sources:

```typescript
interface Improvement {
  id: string;
  type: ImprovementType;      // 88+ types
  source: ImprovementSource;  // 27 sources
  sourceName: string;
  improvedName: string;
  value: number;
  min: number;
  max: number;
  augmented: number;
  augmentedMax: number;
  enabled: boolean;
  notes: string;
}

type ImprovementType =
  | 'Skill' | 'Attribute' | 'BallisticArmor' | 'ImpactArmor'
  | 'Essence' | 'PhysicalCM' | 'StunCM' | 'Initiative'
  | 'AdeptPowerPoints' | 'DrainResistance' | 'FadingResistance'
  // ... 80+ more types

type ImprovementSource =
  | 'Quality' | 'Power' | 'Metatype' | 'Cyberware' | 'Bioware'
  | 'Gear' | 'Spell' | 'Metamagic' | 'Echo' | 'CritterPower'
  // ... more sources
```

---

## Technical Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2, TypeScript |
| Styling | TailwindCSS |
| State | Svelte Stores |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Offline | Firestore persistence + Service Worker |
| Validation | Zod |
| XML | fast-xml-parser |
| Testing | Vitest, Playwright |

### Project Structure

```
chummer-web/
├── src/
│   ├── lib/
│   │   ├── components/       # UI components
│   │   ├── stores/           # Svelte stores
│   │   ├── engine/           # Rules engine
│   │   ├── firebase/         # Firebase integration
│   │   ├── xml/              # Chummer XML import/export
│   │   └── types/            # TypeScript definitions
│   ├── routes/               # SvelteKit routes
│   └── app.html
├── static/
│   └── data/                 # Game data (JSON)
├── scripts/
│   └── convert-xml.ts        # XML to JSON converter
└── tests/
```

---

## Acceptance Criteria

### MVP (Minimum Viable Product)

1. User can sign in with Google
2. User can create a new character using BP method
3. User can select metatype and allocate attributes
4. User can select skills and qualities
5. User can purchase basic gear
6. Character saves to cloud
7. Character works offline
8. User can export to Chummer XML

### Full Release

1. All FR requirements implemented
2. Career mode fully functional
3. Full magic and technomancer support
4. Character sharing implemented
5. 80%+ test coverage
6. Performance targets met

---

## Constraints

1. **No server-side code** - Firebase functions only for validation
2. **Chummer compatibility** - XML import/export must work
3. **Code quality** - Follow agents.md guidelines strictly
4. **Offline-first** - Core functionality without network

---

## Glossary

| Term | Definition |
|------|------------|
| BP | Build Points - character creation currency |
| Karma | Experience points for advancement |
| Essence | Soul/humanity stat reduced by augmentations |
| Metatype | Race (Human, Elf, Dwarf, Ork, Troll) |
| Quality | Permanent character traits (positive/negative) |
| Improvement | Any bonus or modification to character stats |
| Initiation | Magical advancement beyond starting grade |
| Submersion | Technomancer advancement beyond starting grade |

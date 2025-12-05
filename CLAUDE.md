# ChummerWeb Development Guidelines

## Project Overview

ChummerWeb is a modern web-based reimplementation of Chummer, the Shadowrun 4th Edition character generator. The goal is feature parity with the desktop application while providing a modern, accessible web interface.

## Test-Driven Development

**All features must be validated against the desktop Chummer application.**

### Testing Philosophy

1. **Behavior Parity**: Tests should verify that calculations, rules, and mechanics work identically to desktop Chummer
2. **Test First**: Write tests before implementing new features when possible
3. **Reference Data**: Use the original Chummer XML data files as the source of truth for game data
4. **Edge Cases**: Pay special attention to edge cases that desktop Chummer handles

### What to Test

- **BP Calculations**: Verify BP costs match desktop Chummer exactly
  - Metatype costs
  - Attribute costs (10 BP per point above racial minimum)
  - Skill costs (4 BP per rating, 2 BP for specialization)
  - Quality costs (positive and negative)
  - Spell costs (5 BP each)
  - Contact costs (Loyalty + Connection)
  - Resource/Nuyen conversion rates

- **Attribute Limits**: Verify min/max/augmented limits per metatype
- **Essence Calculations**: Cyberware essence costs with grade modifiers
- **Skill Maximums**: Rating 6 max during creation, group rating 4 max
- **Quality Restrictions**: 35 BP max positive, 35 BP max negative

### Test Structure

```
chummer-web/
├── src/
│   └── lib/
│       ├── stores/
│       │   └── __tests__/     # Store unit tests
│       └── types/
│           └── __tests__/     # Type/calculation tests
└── tests/
    ├── unit/                  # Unit tests
    ├── integration/           # Integration tests
    └── validation/            # Tests comparing to desktop Chummer
```

### Running Tests

```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage report
```

## SR4 Rules Reference

### Build Points (Standard)
- Starting BP: 400
- Metatype: 0 (Human) to 40+ (other metatypes)
- Attributes: 10 BP per point above racial minimum
- Active Skills: 4 BP per rating point
- Skill Groups: 10 BP per rating point
- Specialization: 2 BP
- Positive Qualities: Cost BP (max 35 BP total)
- Negative Qualities: Give BP back (max 35 BP total)
- Spells: 5 BP each
- Complex Forms: 5 BP each
- Contacts: Loyalty + Connection per contact
- Resources: 0-50 BP (see conversion table)

### BP to Nuyen Conversion
| BP | Nuyen |
|----|-------|
| 0 | 0 |
| 5 | 20,000 |
| 10 | 50,000 |
| 20 | 90,000 |
| 30 | 150,000 |
| 40 | 225,000 |
| 50 | 275,000 |

### Cyberware Grades
| Grade | Essence | Cost | Avail |
|-------|---------|------|-------|
| Standard | 1.0x | 1x | +0 |
| Alphaware | 0.8x | 2x | +0 |
| Betaware | 0.7x | 4x | +0 |
| Deltaware | 0.5x | 10x | +0 |
| Used | 1.2x | 0.5x | -1 |

## Code Style

- TypeScript strict mode enabled
- Svelte components use `<script lang="ts">`
- Prefer immutable data structures
- Use readonly arrays/objects in types
- Follow existing patterns in codebase

## Component Guidelines

- Use Tailwind CSS with custom `cw-*` utility classes
- Follow the "corp blue" color scheme
- Keep components focused and single-purpose
- Extract reusable logic into stores

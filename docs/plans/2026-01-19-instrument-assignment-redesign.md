# Instrument Assignment Redesign

## Overview

Redesign the instrument assignment UI to be more intuitive and consistent with the rest of the app. Add support for tracking which instruments each musician plays to enable smart filtering during assignment.

## Goals

1. Replace the current colorful card grid with a clean two-panel layout
2. Allow musicians to specify which instruments they play
3. Filter musician list during assignment to show eligible players first
4. Maintain consistency with the app's minimal design aesthetic

## Data Model

### New `UserInstrument` Join Table

```prisma
model UserInstrument {
  id               String      @id @default(uuid())
  userId           String
  instrumentId     String
  proficiencyLevel Proficiency?
  isPrimary        Boolean     @default(false)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  user             User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  instrument       Instrument  @relation(fields: [instrumentId], references: [id], onDelete: Cascade)

  @@unique([userId, instrumentId])
}

enum Proficiency {
  beginner
  intermediate
  advanced
}
```

**Relationships:**
- User has many UserInstruments (instruments they can play)
- Instrument has many UserInstruments (users who play it)

**Notes:**
- `proficiencyLevel` and `isPrimary` are optional fields for future use
- V1 will not expose these in the UI but schema supports them

## UI Design

### Two-Panel Assignment Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Assignments - Sunday Morning Service                        │
│  January 26, 2026 at 9:00 AM                                │
├────────────────────────┬────────────────────────────────────┤
│  INSTRUMENTS           │  MUSICIANS                         │
│                        │                                    │
│  ┌──────────────────┐  │  ┌────────────────────────────┐   │
│  │ 🎸 Electric Gtr  │◄─┼──│ Plays Electric Guitar (3)  │   │
│  │    John Smith    │  │  │  ○ John Smith              │   │
│  │    [Assigned ✓]  │  │  │  ○ Mike Jones              │   │
│  └──────────────────┘  │  │  ○ Sarah Lee               │   │
│                        │  └────────────────────────────┘   │
│  ┌──────────────────┐  │                                    │
│  │ 🥁 Drums         │  │  ┌────────────────────────────┐   │
│  │    Unassigned    │  │  │ ▶ Other Musicians (12)     │   │
│  │    [Select]      │  │  │   (collapsed by default)   │   │
│  └──────────────────┘  │  └────────────────────────────┘   │
│                        │                                    │
│  🎹 Keys [Assigned]    │                                    │
│  🎤 Vocals 1 [Select]  │                                    │
└────────────────────────┴────────────────────────────────────┘
```

### Interaction Flow

1. Click an instrument card → becomes "selected" (highlighted border)
2. Right panel updates to show musicians filtered for that instrument
3. "Plays [Instrument]" section shows eligible musicians
4. "Other Musicians" section collapsed by default for edge cases
5. Click a musician → assignment is made with visual confirmation
6. Instrument card updates to show assigned name with checkmark
7. Click assigned musician again to unassign

### Visual States for Instrument Cards

- **Unselected + Unassigned**: Default border, muted "Unassigned" text
- **Selected + Unassigned**: Primary color border, right panel active
- **Assigned**: Success accent, shows musician name and status badge

### Profile Page - My Instruments

```
┌─────────────────────────────────────────────────────────────┐
│  My Instruments                                              │
│  Select the instruments you play                             │
├─────────────────────────────────────────────────────────────┤
│  ☑ Electric Guitar        ☑ Acoustic Guitar                 │
│  ☐ Bass                   ☐ Drums                           │
│  ☐ Keys/Piano             ☑ Vocals                          │
│                                                              │
│  [Save Changes]                                              │
└─────────────────────────────────────────────────────────────┘
```

- Simple checkbox grid of all available instruments
- Musician checks the ones they play
- Save button to persist changes

### Admin User Management

Add instruments checkbox grid to the existing edit user dialog:

```
┌─────────────────────────────────────────────────────────────┐
│  Edit User: John Smith                                       │
├─────────────────────────────────────────────────────────────┤
│  Name:  [John Smith          ]                               │
│  Email: [john@example.com    ]                               │
│  Roles: ☑ Musician  ☐ Leader  ☐ Admin                       │
│                                                              │
│  Instruments Played:                                         │
│  ☑ Electric Guitar   ☑ Acoustic Guitar   ☐ Bass             │
│  ☐ Drums             ☐ Keys/Piano        ☑ Vocals           │
│                                                              │
│  [Cancel]                              [Save Changes]        │
└─────────────────────────────────────────────────────────────┘
```

## API Changes

### New Endpoints

- `GET /users/:id/instruments` - Get instruments a user can play
- `PUT /users/:id/instruments` - Update user's playable instruments
  - Body: `{ instrumentIds: string[] }`

### Modified Endpoints

- `GET /users` - Add optional `?instrumentId=xxx` filter
- `GET /users/:id` - Include `instruments` relation in response

## Implementation Plan

### Phase 1: Database & Backend
1. Add Prisma schema changes (UserInstrument model, Proficiency enum)
2. Run migration
3. Create userInstruments controller and routes
4. Update users controller to support instrument filtering

### Phase 2: Profile Page
1. Add "My Instruments" card to profile page
2. Fetch available instruments and user's current selections
3. Implement save functionality

### Phase 3: Admin User Management
1. Add instruments checkbox grid to edit user dialog
2. Save instruments along with other user data

### Phase 4: Assignment Page Redesign
1. Create new two-panel layout component
2. Implement instrument selection (left panel)
3. Implement musician list with filtering (right panel)
4. Add click-to-assign interaction
5. Remove old card grid implementation

## Out of Scope (V1)

- Proficiency level UI (schema supports it)
- Primary instrument designation UI
- Drag-and-drop assignment
- Instrument icons/images

## Future Considerations

- Show proficiency badges next to musician names
- Sort by proficiency level (advanced first)
- Highlight primary instrument players
- Availability integration (gray out unavailable musicians)

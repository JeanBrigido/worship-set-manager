# User Management Improvements Design

**Goal:** Improve the admin experience for managing users with quick role changes, activate/deactivate controls, and better organization.

**Context:** The current users page has basic CRUD functionality but requires opening dialogs for simple changes like role assignments. This design streamlines day-to-day user management.

---

## 1. Grouped Organization

The users page displays users in collapsible sections grouped by role:

### Section Structure
- **Admins (N)** - expandable, shows count
- **Leaders (N)** - expandable, shows count
- **Musicians (N)** - expandable, shows count
- **Inactive (N)** - collapsed by default, visually muted

### Behavior
- Users with multiple roles appear in their highest-privilege section (admin > leader > musician)
- All role badges are displayed regardless of which section the user appears in
- Sections show user count in header
- Click section header to expand/collapse
- Inactive section collapsed by default with grayed styling

### Search
- Search works across all sections
- Matching users cause their section to auto-expand
- Non-matching users are hidden, empty sections collapse

### Sorting
- Alphabetical by name within each section

---

## 2. Quick Role Changes

Role badges are interactive - clicking opens a dropdown to toggle roles.

### Interaction
1. Click any role badge on a user row
2. Dropdown appears with checkbox list:
   - [ ] Admin
   - [x] Leader (checked = user has role)
   - [x] Musician
3. Click a role to toggle it on/off
4. Dropdown stays open for multiple changes
5. Click outside to close

### Safeguards
- **Minimum one role:** Cannot remove the last role from a user
- **Self-protection:** Cannot remove admin role from yourself
- Error toast if either rule violated

### Feedback
- Changes save immediately (no save button)
- Toast confirmation: "Updated roles for [Name]"
- Badge briefly highlights on change
- If user's primary role changes, they animate to the new section

---

## 3. Activate/Deactivate Controls

Replace hard delete with soft deactivation for most cases.

### Active Users
- "Deactivate" button in actions area (outline/muted style)
- Click shows confirmation dialog:
  - Title: "Deactivate [Name]?"
  - Message: "They won't be able to log in. Their history will be preserved."
  - Actions: Cancel / Deactivate
- On confirm: user moves to Inactive section
- Toast: "Deactivated [Name]"

### Inactive Users
- "Activate" button in actions area (primary style)
- No confirmation needed - instant activation
- User moves back to their role section
- Toast: "Activated [Name]"

### Inactive User Styling
- Row at ~60% opacity
- "Inactive" badge next to name
- Role badges visible but muted
- Role badges still clickable (can prep roles before reactivating)

### System Behavior
- `isActive: false` in database
- Active sessions invalidated on next API request
- Assignments and history preserved
- Shown as "[Name] (Inactive)" in assignment dropdowns

### Delete Option
- Delete button still available (for removing test accounts, etc.)
- Requires confirmation: "Permanently delete [Name]? This cannot be undone."

---

## UI Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│ User Management                                    [+ Add]  │
│ Manage users and their permissions                          │
├─────────────────────────────────────────────────────────────┤
│ [Search users...]  [Filter: All ▼]                          │
├─────────────────────────────────────────────────────────────┤
│ ▼ Admins (2)                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ John Smith     [Admin] [Leader]          [Deactivate]   │ │
│ │ john@church.org                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Sarah Jones    [Admin]                   [Deactivate]   │ │
│ │ sarah@church.org                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ▼ Leaders (3)                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Mike Wilson    [Leader] [Musician]       [Deactivate]   │ │
│ │ mike@church.org                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ...                                                         │
│                                                             │
│ ▶ Inactive (2)  ← collapsed, muted styling                  │
└─────────────────────────────────────────────────────────────┘

Role badge dropdown (on click):
┌──────────────┐
│ ☑ Admin      │
│ ☑ Leader     │
│ ☐ Musician   │
└──────────────┘
```

---

## Technical Notes

### Frontend Changes
- `frontend/src/app/users/page.tsx` - refactor to grouped layout
- Add role badge dropdown component
- Add activate/deactivate buttons and confirmation dialogs
- Add section collapse state management

### Backend Changes
- Ensure `PATCH /users/:id` supports partial updates (roles, isActive)
- Add session invalidation on deactivate (check isActive in auth middleware)

### No Schema Changes Required
- `isActive` field already exists on User model
- Roles array already supports multiple roles

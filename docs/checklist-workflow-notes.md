# Checklist & Workflow — Research Notes

## Overview

This document captures research findings, open improvements, and decisions from
team operations meetings that affect the checklist and workflow system.

---

## Data Sources

| File | Purpose |
|------|---------|
| `public/data/checklist_new_07092026.xlsx` | Source of employee checklist assignments (Sheet2) |
| `public/data/Workflow_New_June_25_2026.xlsx` | Source of workflow task definitions |
| `src/data/defaultEmployeeChecklist.ts` | Typed checklist data loaded by the app |
| `src/data/defaultWorkflow.ts` | Typed workflow task list loaded by the app |

---

## Employee Checklist

The employee checklist (`defaultEmployeeChecklist`) maps ordering and scope
tasks to the team member responsible for each item.

### Current Assignments

| Task | Owner |
|------|-------|
| Initial Order | Zach Cato |
| Tile | Zach Cato |
| Flooring | Zach Cato |
| Paint | Zach Cato |
| Amazon | Zach Cato |
| Cabinets | Zach Cato |
| Appliances | Zach Cato |
| Counter Tops | Zach Cato |
| Roof | Matt Cody |
| Windows | Matt Cody |
| Pool | Matt Cody |
| Foundation | Matt Cody |
| Gutters | Matt Cody |
| Glass Shower Door | Matt Cody |
| Fireplace | Matt Cody |

### Changes in This Branch

- Added `notes` field to the `EmployeeChecklistItem` interface — allows
  per-task context (ordering hints, scope reminders, dependencies).
- Added **Roof** and **Windows** assignments (Matt Cody) which were present in
  the ordering workflow (`defaultWorkflow.ts`) but absent from the employee
  checklist.
- Populated notes on several tasks based on 07/20/2026 meeting decisions (see
  below).

---

## Key Decisions from 07/20/2026 Operations Meeting

Source: `public/data/sales_meeting_summary_07202026.md`

### Ordering Rules

- **Countertops** must be ordered immediately after cabinets are installed or
  confirmed ready — do not wait for contractor to prompt.
- **Appliances, lighting fixtures, windows, and other long-lead items** must be
  verified and ordered earlier in the project to prevent end-of-project delays.
- Appliance sizing (especially stove/oven) must be confirmed before ordering.

### Listing Process

- **Brett** is now the real estate liaison:
  - Inspects all properties before listing.
  - Reviews and approves listing photographs before upload.
  - Monitors buyer feedback and showing activity.
  - Should be added via ShowingTime to receive showing notifications directly.
- Exterior photos should be enhanced when shadows, clutter, or poor angles
  misrepresent the property.
- Unattractive interior photos (laundry room, garage, utility areas) should be
  omitted.

### Website and Checklist Improvements (Planned)

The following improvements were requested and are pending implementation:

- [ ] **Task-level notes** — Allow notes to be added to individual checklist and
  workflow tasks per property. *(Partially addressed: `notes` field added to
  `EmployeeChecklistItem`.)*
- [ ] **Team member assignments** — Link each task to the assigned team member
  on a per-property basis (beyond the default assignment).
- [ ] **Property meeting notes** — Attach timestamped meeting decisions and
  notes directly to each property record.
- [ ] **Frequently requested data fields** — Add fields for septic location,
  appliance details, material selections, listing status, contractor
  assignments, and buyer/agent feedback.
- [ ] **Downloadable property PDFs** — Generate PDFs per property so agents and
  team members can access information without contacting staff.

---

## Workflow Task Coverage

The `defaultWorkflow.ts` defines three workflow types:

| Workflow Type | Sub-types |
|---------------|-----------|
| Main Workflow | Main Workflow |
| Construction Workflow | Demolition & Rough-In, Prep & Repairs, Install & Finishes, Final Walkthrough |
| Check List Workflow | Ordering & Scope Checklist |

The **Check List Workflow** ordering tasks (orders 60–74) should map 1:1 with
the employee checklist. Current gaps identified:

- `Roof Replaced` (order 66) — now mapped to Matt Cody in employee checklist.
- `Windows Replaced` (order 67) — now mapped to Matt Cody in employee
  checklist.

---

## Open Questions

1. Should Roof and Windows assignments remain with Matt Cody long-term, or does
   the checklist_new_07092026.xlsx Sheet2 list different owners?
2. Are additional employees (e.g. Kevin, Justin) expected to own any ordering
   or scope tasks?
3. What is the intended format for per-property task notes — free text, or a
   structured field (date + author + note)?

# Pipeline Stage Override — Interim Architecture

## Purpose

This document describes the **interim stage-override layer** introduced to let
team members drag-and-drop property cards between pipeline stages on the website
Home tab, without modifying the Flipper Force data source.

Once Flipper Force is fully deprecated and the application owns stage data
end-to-end, this layer should be removed (see [Removal Guide](#removal-guide)).

---

## Architecture Overview

```
projects_v2.csv (Flipper Force export)
        │
        ▼
YTDSummaryPage loads rows
        │
        ▼
PipelineTracker groups rows by effective stage
   ◄────────────────────────────────────────────────────────────────────────────
   Effective stage = overriddenStage (if present) › Flipper Force CSV stage
   ◄────────────────────────────────────────────────────────────────────────────
        │                                │
        │ overrides                      │ persisted via
        ▼                                ▼
StageOverrideContext              AWS AppSync / DynamoDB
(real-time subscription)         PropertyStageOverride model
```

---

## Where Override Data is Stored

Overrides are stored in an **AWS AppSync (Amplify Data) model** called
`PropertyStageOverride`, defined in:

- `amplify/data/resource.ts` — TypeScript source (used by app code)
- `amplify/data/resource.js` — JavaScript mirror (used by Amplify deployment)

### Model Schema

| Field              | Type     | Notes                                               |
|--------------------|----------|-----------------------------------------------------|
| `id`               | string   | Auto-generated DynamoDB primary key                  |
| `propertyId`       | string   | Maps to `project_uuid` in `projects_v2.csv`         |
| `overriddenStage`  | string   | Must be one of `ACTIVE_STAGE_ORDER` values           |
| `flipperForceStage`| string?  | Original Flipper Force stage kept for audit/rollback |
| `updatedBy`        | string?  | Cognito sub or display name of the user who changed  |
| `createdAt`        | datetime | Auto-managed by Amplify                             |
| `updatedAt`        | datetime | Auto-managed by Amplify                             |

### Allowed Stage Values (`ACTIVE_STAGE_ORDER`)

```
negotiation | pending_purchase | under_construction | punch_list | active_listing | under_contract
```

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/contexts/StageOverrideContext.tsx` | React context: loads overrides via `observeQuery`, exposes `setOverride` / `clearOverride` |
| `src/utils/stageOverride.ts` | Pure utilities: `applyStageOverrides`, `effectiveStage`, `isValidPipelineStage` |
| `src/utils/stageOverride.test.ts` | Unit tests for merge precedence, idempotency, and rollback contract |
| `src/components/PipelineTracker.tsx` | Kanban board with HTML5 DnD; reads from `StageOverrideContext` |
| `amplify/data/resource.ts` | Amplify schema — `PropertyStageOverride` model definition |
| `amplify/data/resource.js` | JS mirror — kept in sync with resource.ts for Amplify deployment |

---

## Data-Flow & Precedence

1. **CSV ingestion** — `projects_v2.csv` is loaded unchanged.  
   The raw `stage` field from Flipper Force is never mutated in storage.

2. **Override lookup** — `StageOverrideContext` subscribes to all
   `PropertyStageOverride` records via `observeQuery` so changes are
   reflected in real time across all browser tabs without a page reload.

3. **Merge rule** (applied in `PipelineTracker.tsx`)  
   ```
   effective_stage = overrides[project_uuid] ?? toTrackerStage(row.stage)
   ```
   An override wins unconditionally; clearing the override record reverts
   the card to its Flipper Force stage.

4. **Optimistic UI** — On a successful drag-and-drop, the card moves
   immediately before the backend responds.  If the `setOverride` call
   returns an error the card is rolled back to its previous column and an
   error banner is shown.

5. **Persistence across reloads** — Overrides live in DynamoDB (via
   AppSync).  Re-loading the page or re-ingesting the CSV does **not**
   remove overrides.

---

## API Operations

All operations go through the Amplify Data client (`generateClient<Schema>()`):

| Operation | Description |
|-----------|-------------|
| `setOverride(propertyId, stage, opts?)` | Create or update an override record; validates stage against `ACTIVE_STAGE_ORDER` |
| `clearOverride(propertyId)` | Delete the override record; property reverts to Flipper Force stage |
| `observeQuery()` | Real-time subscription used by `StageOverrideContext` |

### Server-side Authorization

The `PropertyStageOverride` model authorises:
- `authenticated("identityPool")` — signed-in team members (read + write)
- `guest()` and `publicApiKey()` — read access for unauthenticated sessions

To restrict writes to authenticated users only, remove `allow.guest()` and
`allow.publicApiKey()` from the `PropertyStageOverride` authorization block in
`amplify/data/resource.ts` (and mirror the change in `resource.js`).

---

## Removal Guide

When Flipper Force is fully deprecated:

1. **Remove the model** — Delete the `PropertyStageOverride` block from
   `amplify/data/resource.ts` and `amplify/data/resource.js`.

2. **Remove the context** — Delete `src/contexts/StageOverrideContext.tsx` and
   remove `<StageOverrideProvider>` from `src/App.tsx`.

3. **Remove the utilities** — Delete `src/utils/stageOverride.ts` and
   `src/utils/stageOverride.test.ts`.

4. **Simplify PipelineTracker** — Remove the `useStageOverrides` call,
   drag-and-drop handlers, and optimistic-override logic.  Stage will then
   come entirely from the application's own data source.

5. **Migrate existing overrides** — Before removing the model, export all
   `PropertyStageOverride` records from DynamoDB and apply the stages to
   whatever becomes the canonical stage field in the replacement data source.

6. **Deploy** — Run `amplify push` (or the CI/CD pipeline) to delete the
   DynamoDB table and AppSync resolver.

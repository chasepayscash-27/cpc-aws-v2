# Data pipeline: CSV → site

The website loads all CSV data via `src/utils/csv.ts` (`loadCsv(path)` → `fetch(path)`).
With Vite, `fetch("/data/foo.csv")` resolves to `public/data/foo.csv` in dev and
`dist/data/foo.csv` in production (Amplify deploys `dist/` per `amplify.yml`).

## Canonical CSV files (the only ones the site reads)

All live in `public/data/`:

| Path served | Read by |
|---|---|
| `/data/projects_v2.csv` | `src/pages/YTDSummaryPage.tsx`, `src/pages/ProjectsPage.tsx`, `src/pages/MapsPage.tsx`, `src/pages/TeamPage.tsx`, `src/components/charts/ProjectsByStatusChart.tsx`, `src/components/PublicChatWidget.tsx` |
| `/data/cpc_job_titles.csv` | `src/pages/TeamPage.tsx`, `src/components/propertyWorkflowTabs.ts` |
| `/data/pull_manifest_v2.csv` | `src/components/charts/PullManifestTable.tsx` |
| `/data/project_photo_log_v2.csv` | `src/components/ProjectDetailsModal.tsx`, `src/components/charts/PhotoLogTimelineChart.tsx` |
| `/data/ytd_csv_looker.csv` | `src/pages/YTDSummaryPage.tsx`, `src/pages/CurrentPipelinePage.tsx`, `src/components/PublicChatWidget.tsx` |
| `/data/sweet_home_bama_pl_long_fixed.csv` | `src/pages/FinancialsPage.tsx`, `src/components/PropertyFinancials.tsx`, `src/components/PublicChatWidget.tsx` |
| `/data/inventory_days.csv` | `src/components/DaysInInventoryChart.tsx`, `src/components/PublicChatWidget.tsx` |

## Refreshing the data

The data-pull script lives at `notebooks/Flipper_Force_API_05212026.ipynb`. It
calls the Flipper Force API and writes CSVs (`projects_v2.csv`,
`project_photo_log_v2.csv`, `pull_manifest_v2.csv`, etc.) to its working
directory.

When refreshing data:

1. Run the notebook from the `notebooks/` directory.
2. Move the regenerated CSVs into `public/data/`, overwriting the existing files.
3. Commit only the updated files in `public/data/`. Do **not** commit the
   notebook output to the repo root or to a nested `cpc-aws-v2/` folder — both
   are now gitignored.

## Files that are NOT used by the site

- `docs/CPCP_Workflow.csv` — reference document; not loaded by any page.
- Anything outside `public/data/` with a `.csv` extension is documentation, not runtime data.

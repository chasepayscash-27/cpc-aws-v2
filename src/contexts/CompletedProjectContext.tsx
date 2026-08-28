import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Schema } from '../../amplify/data/resource';
import type { ProjectRow } from '../types/project';
import { getAmplifyDataClient } from '../utils/amplifyDataClient';
import {
  loadCompletedProjects,
  COMPLETED_PROJECTS_STORAGE_KEY,
} from '../utils/completedProjects';

type CompletedProjectRecord = Schema['CompletedProject']['type'];

interface CompletedProjectContextValue {
  /** Set of propertyIds that have been marked as completed. */
  completedIds: Set<string>;
  /** All completed project records (includes completedAt metadata). */
  completedRecords: CompletedProjectRecord[];
  isLoading: boolean;
  error: string;
  /**
   * Mark a project as completed. Performs an upsert in DynamoDB.
   * Returns an error message on failure, or null on success.
   */
  markCompleted: (project: ProjectRow, completedBy?: string) => Promise<string | null>;
  /**
   * Remove a project from the completed list.
   * Returns an error message on failure, or null on success.
   */
  unmarkCompleted: (propertyId: string) => Promise<string | null>;
}

const CompletedProjectContext = createContext<CompletedProjectContextValue>({
  completedIds: new Set(),
  completedRecords: [],
  isLoading: true,
  error: '',
  markCompleted: async () => null,
  unmarkCompleted: async () => null,
});

const MISSING_MODEL_ERROR =
  'Completed projects are unavailable because the CompletedProject model is missing from amplify/amplify_outputs.json. Redeploy Amplify to regenerate the frontend outputs.';

export function CompletedProjectProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getAmplifyDataClient(), []);
  const model = client.models.CompletedProject;
  const [records, setRecords] = useState<CompletedProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(() => !!model);
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState(() => (model ? '' : MISSING_MODEL_ERROR));

  const completedIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) {
      if (r.propertyId) s.add(r.propertyId);
    }
    return s;
  }, [records]);

  // Subscribe to real-time updates so all devices stay in sync.
  useEffect(() => {
    if (!model) return;

    const subscription = model.observeQuery().subscribe({
      next: ({ items }) => {
        setRecords([...items]);
        setError('');
        setIsLoading(false);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load completed projects';
        setError(msg);
        setIsLoading(false);
      },
    });
    return () => subscription.unsubscribe();
  }, [model]);

  // One-time migration: move any localStorage completed projects to DynamoDB,
  // then clear localStorage so we don't attempt this again.
  useEffect(() => {
    if (!model || migrated || isLoading) return;

    const localRows = loadCompletedProjects();
    if (localRows.length === 0) {
      setMigrated(true);
      return;
    }

    async function migrate() {
      for (const row of localRows) {
        if (!row.project_uuid) continue;
        // Skip rows already in DynamoDB.
        if (completedIds.has(row.project_uuid)) continue;
        try {
          await model!.create({
            propertyId: row.project_uuid,
            completedAt: row.completed_at ?? new Date().toISOString(),
          });
        } catch {
          // Best-effort: ignore individual failures.
        }
      }
      // Clear localStorage after migration attempt.
      try {
        localStorage.removeItem(COMPLETED_PROJECTS_STORAGE_KEY);
      } catch {
        // Ignore.
      }
      setMigrated(true);
    }

    void migrate();
  }, [model, migrated, isLoading, completedIds]);

  const markCompleted = useCallback(
    async (project: ProjectRow, completedBy?: string): Promise<string | null> => {
      if (!project.project_uuid) return 'project_uuid is required';
      if (!model) return MISSING_MODEL_ERROR;

      const existing = records.find((r) => r.propertyId === project.project_uuid);
      try {
        if (existing) {
          // Already marked — treat as success.
          return null;
        }
        const { errors } = await model.create({
          propertyId: project.project_uuid,
          completedAt: new Date().toISOString(),
          ...(completedBy ? { completedBy } : {}),
        });
        if (errors?.length) return errors[0].message;
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to mark project as completed';
      }
      return null;
    },
    [records, model],
  );

  const unmarkCompleted = useCallback(
    async (propertyId: string): Promise<string | null> => {
      if (!model) return MISSING_MODEL_ERROR;
      const existing = records.find((r) => r.propertyId === propertyId);
      if (!existing) return null;

      try {
        const { errors } = await model.delete({ id: existing.id });
        if (errors?.length) return errors[0].message;
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to unmark project as completed';
      }
    },
    [records, model],
  );

  return (
    <CompletedProjectContext.Provider
      value={{ completedIds, completedRecords: records, isLoading, error, markCompleted, unmarkCompleted }}
    >
      {children}
    </CompletedProjectContext.Provider>
  );
}

export function useCompletedProjects(): CompletedProjectContextValue {
  return useContext(CompletedProjectContext);
}

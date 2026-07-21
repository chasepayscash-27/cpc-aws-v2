import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { isValidPipelineStage } from '../utils/stageOverride';

type PropertyStageOverride = Schema['PropertyStageOverride']['type'];

interface StageOverrideContextValue {
  /** Map of propertyId → overriddenStage for all persisted overrides. */
  overrides: Record<string, string>;
  isLoading: boolean;
  error: string;
  /**
   * Persist a stage override for a property.
   * Validates the target stage and performs an upsert (create-or-update).
   * Returns an error message on failure, or null on success.
   */
  setOverride: (
    propertyId: string,
    overriddenStage: string,
    opts?: { flipperForceStage?: string; updatedBy?: string },
  ) => Promise<string | null>;
  /**
   * Remove a persisted stage override so the property reverts to its
   * Flipper Force stage.
   * Returns an error message on failure, or null on success.
   */
  clearOverride: (propertyId: string) => Promise<string | null>;
}

const StageOverrideContext = createContext<StageOverrideContextValue>({
  overrides: {},
  isLoading: true,
  error: '',
  setOverride: async () => null,
  clearOverride: async () => null,
});

const client = generateClient<Schema>();

export function StageOverrideProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PropertyStageOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Build a fast lookup map from the records array.
  const overrides: Record<string, string> = {};
  for (const r of records) {
    if (r.propertyId && r.overriddenStage) {
      overrides[r.propertyId] = r.overriddenStage;
    }
  }

  useEffect(() => {
    const subscription = client.models.PropertyStageOverride.observeQuery().subscribe({
      next: ({ items }) => {
        setRecords([...items]);
        setIsLoading(false);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load stage overrides';
        setError(msg);
        setIsLoading(false);
      },
    });
    return () => subscription.unsubscribe();
  }, []);

  const setOverride = useCallback(
    async (
      propertyId: string,
      overriddenStage: string,
      opts: { flipperForceStage?: string; updatedBy?: string } = {},
    ): Promise<string | null> => {
      if (!propertyId) return 'propertyId is required';
      if (!isValidPipelineStage(overriddenStage)) {
        return `"${overriddenStage}" is not a valid pipeline stage`;
      }

      // Find an existing record so we can update instead of create.
      const existing = records.find((r) => r.propertyId === propertyId);

      if (existing) {
        const { errors } = await client.models.PropertyStageOverride.update({
          id: existing.id,
          overriddenStage,
          ...(opts.flipperForceStage !== undefined
            ? { flipperForceStage: opts.flipperForceStage }
            : {}),
          ...(opts.updatedBy !== undefined ? { updatedBy: opts.updatedBy } : {}),
        });
        if (errors?.length) return errors[0].message;
      } else {
        const { errors } = await client.models.PropertyStageOverride.create({
          propertyId,
          overriddenStage,
          flipperForceStage: opts.flipperForceStage,
          updatedBy: opts.updatedBy,
        });
        if (errors?.length) return errors[0].message;
      }

      return null;
    },
    [records],
  );

  const clearOverride = useCallback(
    async (propertyId: string): Promise<string | null> => {
      const existing = records.find((r) => r.propertyId === propertyId);
      if (!existing) return null; // Nothing to clear — treat as success.

      const { errors } = await client.models.PropertyStageOverride.delete({
        id: existing.id,
      });
      if (errors?.length) return errors[0].message;
      return null;
    },
    [records],
  );

  return (
    <StageOverrideContext.Provider
      value={{ overrides, isLoading, error, setOverride, clearOverride }}
    >
      {children}
    </StageOverrideContext.Provider>
  );
}

export function useStageOverrides(): StageOverrideContextValue {
  return useContext(StageOverrideContext);
}

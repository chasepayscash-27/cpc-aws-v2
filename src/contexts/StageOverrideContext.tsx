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
import { getAmplifyDataClient } from '../utils/amplifyDataClient';
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

const MISSING_STAGE_OVERRIDE_MODEL_ERROR =
  'Stage overrides are unavailable because the PropertyStageOverride model is missing from amplify/amplify_outputs.json. Redeploy Amplify to regenerate the frontend outputs.';

export function StageOverrideProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getAmplifyDataClient(), []);
  const [records, setRecords] = useState<PropertyStageOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const stageOverrideModel = client.models.PropertyStageOverride;

  // Build a fast lookup map from the records array.
  const overrides = useMemo(() => {
    const next: Record<string, string> = {};
    for (const r of records) {
      if (r.propertyId && r.overriddenStage) {
        next[r.propertyId] = r.overriddenStage;
      }
    }
    return next;
  }, [records]);

  useEffect(() => {
    if (!stageOverrideModel) {
      setError(MISSING_STAGE_OVERRIDE_MODEL_ERROR);
      setIsLoading(false);
      return;
    }

    try {
      const subscription = stageOverrideModel.observeQuery().subscribe({
        next: ({ items }) => {
          setRecords([...items]);
          setError('');
          setIsLoading(false);
        },
        error: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to load stage overrides';
          setError(msg);
          setIsLoading(false);
        },
      });
      return () => subscription.unsubscribe();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load stage overrides';
      setError(msg);
      setIsLoading(false);
    }
  }, [stageOverrideModel]);

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
      if (!stageOverrideModel) return MISSING_STAGE_OVERRIDE_MODEL_ERROR;

      // Find an existing record so we can update instead of create.
      const existing = records.find((r) => r.propertyId === propertyId);

      try {
        if (existing) {
          const { errors } = await stageOverrideModel.update({
            id: existing.id,
            overriddenStage,
            ...(opts.flipperForceStage !== undefined
              ? { flipperForceStage: opts.flipperForceStage }
              : {}),
            ...(opts.updatedBy !== undefined ? { updatedBy: opts.updatedBy } : {}),
          });
          if (errors?.length) return errors[0].message;
        } else {
          const { errors } = await stageOverrideModel.create({
            propertyId,
            overriddenStage,
            flipperForceStage: opts.flipperForceStage,
            updatedBy: opts.updatedBy,
          });
          if (errors?.length) return errors[0].message;
        }
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to save stage override';
      }

      return null;
    },
    [records, stageOverrideModel],
  );

  const clearOverride = useCallback(
    async (propertyId: string): Promise<string | null> => {
      if (!stageOverrideModel) return MISSING_STAGE_OVERRIDE_MODEL_ERROR;
      const existing = records.find((r) => r.propertyId === propertyId);
      if (!existing) return null; // Nothing to clear — treat as success.

      try {
        const { errors } = await stageOverrideModel.delete({
          id: existing.id,
        });
        if (errors?.length) return errors[0].message;
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to clear stage override';
      }
    },
    [records, stageOverrideModel],
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

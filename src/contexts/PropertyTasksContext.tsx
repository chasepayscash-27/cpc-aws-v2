import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

type PropertyTask = Schema['PropertyTask']['type'];

interface PropertyTasksContextValue {
  allTasks: PropertyTask[];
  isLoading: boolean;
  error: string;
  updateTaskCompletion: (
    task: PropertyTask,
    isComplete: boolean,
    completedAt: string | null,
    completedBy: string | null
  ) => Promise<{ errors?: Array<{ message: string }> }>;
}

const PropertyTasksContext = createContext<PropertyTasksContextValue>({
  allTasks: [],
  isLoading: true,
  error: '',
  updateTaskCompletion: async () => ({}),
});

const client = generateClient<Schema>();

/**
 * Provides a single shared observeQuery subscription for ALL PropertyTasks.
 * Wrap the app (or at least the routes that render workflow components) with
 * this provider so that PropertyWorkflow, ConstructionWorkflowTemplate, and
 * TeamPage all read from the same in-memory snapshot and immediately see each
 * other's task-completion updates.
 */
export function PropertyTasksProvider({ children }: { children: ReactNode }) {
  const [allTasks, setAllTasks] = useState<PropertyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const subscription = client.models.PropertyTask.observeQuery().subscribe({
      next: ({ items }) => {
        setAllTasks([...items]);
        setError('');
        setIsLoading(false);
      },
      error: (subscriptionError: unknown) => {
        setError(
          subscriptionError instanceof Error
            ? subscriptionError.message
            : 'Failed to load workflow tasks.'
        );
        setIsLoading(false);
      },
    });
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Optimistically toggles a task's completion state in the shared snapshot,
   * issues the DynamoDB write, and reverts on failure.  All views that consume
   * this context will re-render immediately with the new state.
   */
  const updateTaskCompletion = useCallback(
    async (
      task: PropertyTask,
      isComplete: boolean,
      completedAt: string | null,
      completedBy: string | null
    ): Promise<{ errors?: Array<{ message: string }> }> => {
      setAllTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, isComplete, completedAt, completedBy } : t))
      );

      const { errors } = await client.models.PropertyTask.update({
        id: task.id,
        isComplete,
        completedAt,
        completedBy,
      });

      if (errors?.length) {
        setAllTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  isComplete: !!task.isComplete,
                  completedAt: task.completedAt ?? null,
                  completedBy: task.completedBy ?? null,
                }
              : t
          )
        );
        return { errors };
      }

      return {};
    },
    []
  );

  return (
    <PropertyTasksContext.Provider value={{ allTasks, isLoading, error, updateTaskCompletion }}>
      {children}
    </PropertyTasksContext.Provider>
  );
}

export function usePropertyTasks(): PropertyTasksContextValue {
  return useContext(PropertyTasksContext);
}

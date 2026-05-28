import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";
import { defaultWorkflow } from "../data/defaultWorkflow";
import "./PropertyWorkflow.css";

type PropertyTask = Schema["PropertyTask"]["type"];

const client = generateClient<Schema>();

interface Props {
  propertyId: string;
}

function sortTasks(tasks: PropertyTask[]): PropertyTask[] {
  return [...tasks].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      (a.stage ?? "").localeCompare(b.stage ?? "")
  );
}

export default function PropertyWorkflow({ propertyId }: Props) {
  const [tasks, setTasks] = useState<PropertyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedByUser, setCompletedByUser] = useState<string | null>(null);
  const seedAttemptedRef = useRef(false);
  const seedingRef = useRef(false);

  const seedPropertyTasks = useCallback(async () => {
    if (!propertyId || seedingRef.current) return;
    seedingRef.current = true;
    try {
      const existing = await client.models.PropertyTask.list({
        filter: { propertyId: { eq: propertyId } },
      });
      if ((existing.data?.length ?? 0) > 0) return;

      for (const templateTask of defaultWorkflow) {
        const byOrder = await client.models.PropertyTask.list({
          filter: {
            propertyId: { eq: propertyId },
            order: { eq: templateTask.order },
          },
        });
        if ((byOrder.data?.length ?? 0) > 0) continue;

        const { errors } = await client.models.PropertyTask.create({
          propertyId,
          stage: templateTask.stage,
          owner: templateTask.owner,
          responsibilities: templateTask.responsibilities,
          notes: templateTask.notes,
          order: templateTask.order,
          isComplete: false,
        });
        if (errors?.length) {
          throw new Error(errors.map((item) => item.message).join("; "));
        }
      }
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Failed to seed workflow tasks.");
      seedAttemptedRef.current = false;
    } finally {
      seedingRef.current = false;
    }
  }, [propertyId]);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        const identifier = user.signInDetails?.loginId ?? user.username ?? user.userId;
        setCompletedByUser(identifier ?? null);
      })
      .catch(() => setCompletedByUser(null));
  }, []);

  useEffect(() => {
    if (!propertyId) return;

    seedAttemptedRef.current = false;
    setLoading(true);
    setError("");

    const subscription = client.models.PropertyTask.observeQuery({
      filter: { propertyId: { eq: propertyId } },
    }).subscribe({
      next: ({ items }) => {
        const sorted = sortTasks(items);
        setTasks(sorted);
        setLoading(false);

        if (sorted.length === 0 && !seedAttemptedRef.current) {
          seedAttemptedRef.current = true;
          void seedPropertyTasks();
        }
      },
      error: (observeError) => {
        setError(observeError instanceof Error ? observeError.message : "Failed to load workflow tasks.");
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [propertyId, seedPropertyTasks]);

  const totalCount = tasks.length;
  const completedCount = useMemo(
    () => tasks.filter((task) => task.isComplete).length,
    [tasks]
  );
  const percentComplete = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleToggle = useCallback(
    async (task: PropertyTask, checked: boolean) => {
      setError("");
      const { errors } = await client.models.PropertyTask.update({
        id: task.id,
        isComplete: checked,
        completedAt: checked ? new Date().toISOString() : null,
        completedBy: checked ? completedByUser : null,
      });
      if (errors?.length) {
        setError(errors.map((item) => item.message).join("; "));
      }
    },
    [completedByUser]
  );

  if (!propertyId) {
    return <p className="pwMuted">Workflow unavailable for this property.</p>;
  }

  return (
    <section className="propertyWorkflow">
      <div className="propertyWorkflowHeader">
        <h3>Property Workflow</h3>
        <p>
          {completedCount} of {totalCount} complete
        </p>
      </div>

      <div className="pwProgressBar" aria-label={`${percentComplete}% complete`}>
        <span style={{ width: `${percentComplete}%` }} />
      </div>

      {loading && <p className="pwMuted">Loading workflow tasks…</p>}
      {!loading && tasks.length === 0 && <p className="pwMuted">Preparing default workflow…</p>}
      {error && <p className="pwError">⚠️ {error}</p>}

      {!loading && tasks.length > 0 && (
        <div className="pwChecklist">
          {tasks.map((task) => (
            <label className={`pwRow${task.isComplete ? " completed" : ""}`} key={task.id}>
              <input
                type="checkbox"
                checked={!!task.isComplete}
                onChange={(event) => {
                  void handleToggle(task, event.currentTarget.checked);
                }}
              />
              <div className="pwOrder">#{task.order ?? "—"}</div>
              <div className="pwContent">
                <div className="pwTopLine">
                  <strong>{task.stage}</strong>
                  {task.owner && <span className="pwBadge">{task.owner}</span>}
                </div>
                {task.responsibilities && <p>{task.responsibilities}</p>}
                {task.notes && <p className="pwNotes">{task.notes}</p>}
              </div>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

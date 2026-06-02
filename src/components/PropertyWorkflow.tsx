import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";
import { defaultWorkflow } from "../data/defaultWorkflow";
import {
  getTasksForTab,
  getWorkflowTabs,
  normalizeAssignee,
  updateTask,
} from "./propertyWorkflowTabs";
import { dedupeTasksByCanonicalOrder, getWorkflowProgressCounts, normalizeWorkflowOwner } from "./propertyWorkflowNormalization";
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
  const [activeTabId, setActiveTabId] = useState("main");
  const seedAttemptedRef = useRef(false);
  const seedingRef = useRef(false);
  const reconcileAttemptedRef = useRef(false);

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
          assigneeId: normalizeWorkflowOwner(templateTask.owner),
        });
        if (errors?.length) {
          throw new Error(errors.map((item) => item.message).join("; "));
        }
      }

      // Guard against concurrent seeds creating duplicate rows: re-list and dedup.
      const afterSeed = await client.models.PropertyTask.list({
        filter: { propertyId: { eq: propertyId } },
      });
      const { remove: seedDups } = dedupeTasksByCanonicalOrder(afterSeed.data ?? []);
      for (const dup of seedDups) {
        await client.models.PropertyTask.delete({ id: dup.id });
      }
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Failed to seed workflow tasks.");
      seedAttemptedRef.current = false;
    } finally {
      seedingRef.current = false;
    }
  }, [propertyId]);

  const reconcilePropertyTasks = useCallback(async (currentTasks: PropertyTask[]) => {
    if (!propertyId) return;
    const reconcileErrors: string[] = [];

    const { keepByOrder, remove, missing } = dedupeTasksByCanonicalOrder(currentTasks);

    // Delete duplicates and unmappable tasks — collect errors instead of aborting.
    for (const task of remove) {
      const { errors } = await client.models.PropertyTask.delete({ id: task.id });
      if (errors?.length) {
        reconcileErrors.push(...errors.map((e) => e.message));
      }
    }

    // Create any canonical tasks that are missing entirely.
    const templateByOrder = new Map(defaultWorkflow.map((t) => [t.order, t]));
    for (const order of missing) {
      const templateTask = templateByOrder.get(order)!;
      const { errors } = await client.models.PropertyTask.create({
        propertyId,
        stage: templateTask.stage,
        owner: normalizeWorkflowOwner(templateTask.owner),
        responsibilities: templateTask.responsibilities,
        notes: templateTask.notes,
        order: templateTask.order,
        isComplete: false,
        assigneeId: normalizeWorkflowOwner(templateTask.owner),
      });
      if (errors?.length) {
        reconcileErrors.push(...errors.map((e) => e.message));
      }
    }

    // Patch any surviving primary tasks whose order, stage, or owner has drifted.
    for (const [order, primary] of keepByOrder) {
      const templateTask = templateByOrder.get(order)!;
      const normalizedOwner = normalizeWorkflowOwner(primary.owner);
      const updatePayload: { id: string; order?: number; stage?: string; owner?: string | null; assigneeId?: string | null } = { id: primary.id };
      let shouldUpdate = false;

      if (primary.order !== templateTask.order) {
        updatePayload.order = templateTask.order;
        shouldUpdate = true;
      }
      if (primary.stage !== templateTask.stage) {
        updatePayload.stage = templateTask.stage;
        shouldUpdate = true;
      }
      if (normalizedOwner !== (primary.owner ?? null)) {
        updatePayload.owner = normalizedOwner;
        shouldUpdate = true;
      }
      if (primary.assigneeId == null && normalizedOwner !== null) {
        updatePayload.assigneeId = normalizedOwner;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const { errors } = await client.models.PropertyTask.update(updatePayload);
        if (errors?.length) {
          reconcileErrors.push(...errors.map((e) => e.message));
        }
      }
    }

    if (reconcileErrors.length > 0) {
      setError(`Workflow reconcile issues (${reconcileErrors.length}): ${reconcileErrors.join("; ")}`);
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

    setActiveTabId("main");
    seedAttemptedRef.current = false;
    reconcileAttemptedRef.current = false;
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
        } else if (sorted.length > 0 && !reconcileAttemptedRef.current) {
          reconcileAttemptedRef.current = true;
          void reconcilePropertyTasks(sorted);
        }
      },
      error: (observeError) => {
        setError(observeError instanceof Error ? observeError.message : "Failed to load workflow tasks.");
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [propertyId, seedPropertyTasks, reconcilePropertyTasks]);

  const { totalCount, completedCount } = useMemo(() => getWorkflowProgressCounts(tasks), [tasks]);
  const percentComplete = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Render-time safety net: even if the backend momentarily returns duplicate rows
  // (e.g., during an in-flight reconcile), only show one row per canonical order.
  const dedupedTasks = useMemo(() => {
    const { keepByOrder } = dedupeTasksByCanonicalOrder(tasks);
    const result: PropertyTask[] = [];
    for (const templateTask of defaultWorkflow) {
      const primary = keepByOrder.get(templateTask.order);
      if (primary) result.push(primary);
    }
    return result;
  }, [tasks]);

  const handleToggle = useCallback(
    async (task: PropertyTask, checked: boolean) => {
      setError("");
      const previousCompletedAt = task.completedAt;
      const previousCompletedBy = task.completedBy;
      setTasks((currentTasks) =>
        updateTask(currentTasks, task.id, {
          isComplete: checked,
          completedAt: checked ? new Date().toISOString() : null,
          completedBy: checked ? completedByUser : null,
        })
      );

      const { errors } = await client.models.PropertyTask.update({
        id: task.id,
        isComplete: checked,
        completedAt: checked ? new Date().toISOString() : null,
        completedBy: checked ? completedByUser : null,
      });
      if (errors?.length) {
        setTasks((currentTasks) =>
          updateTask(currentTasks, task.id, {
            isComplete: !!task.isComplete,
            completedAt: previousCompletedAt ?? null,
            completedBy: previousCompletedBy ?? null,
          })
        );
        setError(errors.map((item) => item.message).join("; "));
      }
    },
    [completedByUser]
  );

  const handleAssigneeChange = useCallback(async (task: PropertyTask, assigneeId: string | null) => {
    setError("");
    const normalizedAssignee = normalizeAssignee(assigneeId);
    const previousAssignee = task.assigneeId ?? null;
    setTasks((currentTasks) => updateTask(currentTasks, task.id, { assigneeId: normalizedAssignee }));

    const { errors } = await client.models.PropertyTask.update({
      id: task.id,
      assigneeId: normalizedAssignee,
    });
    if (errors?.length) {
      setTasks((currentTasks) => updateTask(currentTasks, task.id, { assigneeId: previousAssignee }));
      setError(errors.map((item) => item.message).join("; "));
    }
  }, []);

  const tabs = useMemo(() => getWorkflowTabs(dedupedTasks), [dedupedTasks]);
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? { id: "main", label: "Main Workflow", assigneeId: null },
    [tabs, activeTabId]
  );
  const visibleTasks = useMemo(() => getTasksForTab(dedupedTasks, activeTab), [dedupedTasks, activeTab]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId("main");
    }
  }, [tabs, activeTabId]);

  const assigneeOptions = useMemo(() => {
    const options = new Set<string>();
    for (const task of dedupedTasks) {
      const assigneeId = normalizeAssignee(task.assigneeId);
      if (assigneeId) options.add(assigneeId);
      const owner = normalizeWorkflowOwner(task.owner);
      if (owner) options.add(owner);
    }
    return [...options].sort((a, b) => a.localeCompare(b));
  }, [dedupedTasks]);

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
        return;
      }
      event.preventDefault();

      if (event.key === "Home") {
        setActiveTabId(tabs[0]?.id ?? "main");
        return;
      }
      if (event.key === "End") {
        setActiveTabId(tabs[tabs.length - 1]?.id ?? "main");
        return;
      }

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      setActiveTabId(tabs[nextIndex]?.id ?? "main");
    },
    [tabs]
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

      {!loading && dedupedTasks.length > 0 && (
        <div className="pwTabs" role="tablist" aria-label="Workflow tabs">
          {tabs.map((tab, index) => {
            const selected = tab.id === activeTab.id;
            return (
              <button
                type="button"
                key={tab.id}
                id={`workflow-tab-${tab.id}`}
                role="tab"
                className={`pwTab${selected ? " active" : ""}`}
                aria-selected={selected}
                aria-controls={`workflow-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTabId(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {loading && <p className="pwMuted">Loading workflow tasks…</p>}
      {!loading && tasks.length === 0 && <p className="pwMuted">Preparing default workflow…</p>}
      {error && <p className="pwError">⚠️ {error}</p>}

      {!loading && dedupedTasks.length > 0 && (
        <div className="pwChecklist" role="tabpanel" id={`workflow-panel-${activeTab.id}`} aria-labelledby={`workflow-tab-${activeTab.id}`}>
          {visibleTasks.map((task) => (
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
                  {normalizeWorkflowOwner(task.owner) && <span className="pwBadge">{normalizeWorkflowOwner(task.owner)}</span>}
                  <span className="pwAssigneeWrap">
                    <span className="pwAssigneeLabel">Assignee</span>
                    <select
                      className="pwAssigneeSelect"
                      value={normalizeAssignee(task.assigneeId) ?? ""}
                      onChange={(event) => {
                        void handleAssigneeChange(task, event.currentTarget.value || null);
                      }}
                      aria-label={`Assignee for ${task.stage}`}
                    >
                      <option value="">Unassigned</option>
                      {assigneeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </span>
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

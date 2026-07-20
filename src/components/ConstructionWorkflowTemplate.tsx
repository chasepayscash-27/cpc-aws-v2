import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";
import { getConstructionWorkflowTaskGroups } from "./propertyTaskCollections";
import { usePropertyTasks } from "../contexts/PropertyTasksContext";
import type { ProjectRow } from "../types/project";
import { toTitleCase } from "../utils/titleCase";
import { usePropertyWorksheetFields } from "../utils/propertyWorksheetFields";

interface Props {
  propertyId?: string | null;
  propertyName?: string | null;
  projectStage?: ProjectRow["stage"] | null;
}

type PropertyTask = Schema["PropertyTask"]["type"];

const cardStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "14px 16px",
  background: "var(--panel2)",
};

const negativeWorksheetValues = new Set(["no", "none", "n/a", "na", "false", "0"]);

function hasScopeValue(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return false;
  return !negativeWorksheetValues.has(normalized);
}

function shouldShowTask(stage: string | null | undefined, worksheetFields: Record<string, string>, projectStage?: string | null): boolean {
  const normalizedStage = (stage ?? "").toLowerCase();
  if (!normalizedStage) return true;

  if (normalizedStage.includes("fireplace")) {
    return hasScopeValue(worksheetFields.fireplace);
  }
  if (normalizedStage.includes("roof")) {
    return hasScopeValue(worksheetFields.roof);
  }
  if (normalizedStage === "windows replaced") {
    return hasScopeValue(worksheetFields.windows_update);
  }
  if (normalizedStage.includes("permit")) {
    return (projectStage ?? "").toLowerCase().includes("permit");
  }
  return true;
}

function getProgress(tasks: PropertyTask[]): { done: number; total: number; percent: number } {
  const total = tasks.length;
  const done = tasks.filter((task) => !!task.isComplete).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

function ConstructionWorkflowTemplate({ propertyId, propertyName, projectStage }: Props) {
  const { tasksByProperty, isLoading: contextLoading, error: contextError, updateTaskCompletion } = usePropertyTasks();
  const [toggleError, setToggleError] = useState("");
  const [notes, setNotes] = useState("");
  const [completedByUser, setCompletedByUser] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);
  const worksheetFields = usePropertyWorksheetFields(propertyId);

  const error = toggleError || contextError;

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        const identifier = user.signInDetails?.loginId ?? user.username ?? user.userId;
        setCompletedByUser(identifier ?? null);
      })
      .catch(() => setCompletedByUser(null));
  }, []);

  const loading = !!propertyId && contextLoading;
  const propertyTasks = useMemo(
    () => (propertyId ? (tasksByProperty[propertyId] ?? []) : []),
    [propertyId, tasksByProperty],
  );

  const constructionTaskGroups = useMemo(() => {
    return getConstructionWorkflowTaskGroups(propertyTasks);
  }, [propertyTasks]);

  const visibleTasks = useMemo(
    () => constructionTaskGroups.constructionTasks.filter((task) => shouldShowTask(task.stage, worksheetFields, projectStage)),
    [constructionTaskGroups, worksheetFields, projectStage]
  );
  const overallProgress = useMemo(() => getProgress(visibleTasks), [visibleTasks]);
  const visibleSections = useMemo(
    () =>
      constructionTaskGroups.constructionSections
        .map((section) => {
          const tasks = section.tasks.filter((task) =>
            shouldShowTask(task.stage, worksheetFields, projectStage),
          );
          return {
            ...section,
            tasks,
            progress: getProgress(tasks),
          };
        })
        .filter((section) => section.tasks.length > 0),
    [constructionTaskGroups, projectStage, worksheetFields],
  );

  const handleToggle = useCallback(
    async (task: PropertyTask, checked: boolean) => {
      setToggleError("");
      const completedAt = checked ? new Date().toISOString() : null;
      const completedBy = checked ? completedByUser : null;

      setUpdatingTaskIds((current) => [...current, task.id]);

      const { errors } = await updateTaskCompletion(task, checked, completedAt, completedBy);

      setUpdatingTaskIds((current) => current.filter((id) => id !== task.id));

      if (errors?.length) {
        setToggleError(errors.map((item) => item.message).join("; "));
      }
    },
    [completedByUser, updateTaskCompletion]
  );

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        {propertyName ? `${propertyName} construction tasks.` : "Construction tasks."} These checklist items stay synced with the main property workflow.
      </div>

      {loading && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Loading construction workflow…</div>}
      {!loading && error && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>⚠️ {error}</div>}
      {!loading && !error && visibleTasks.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {[{ label: "Overall", ...overallProgress }].map((item) => (
            <div key={item.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                <span>{item.label} progress</span>
                <span>{item.done}/{item.total} ({item.percent}%)</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--panel3)", overflow: "hidden" }}>
                <div style={{ width: `${item.percent}%`, height: "100%", background: "var(--accent)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && visibleTasks.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>No construction workflow tasks available yet.</div>
      )}

      {!loading && !error && visibleTasks.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {visibleSections.map((section) => {
            const sectionVisibleTasks = section.tasks;
            const sectionProgress = section.progress;
            return (
              <section key={section.id} style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 12, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{section.label}</strong>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{sectionProgress.done}/{sectionProgress.total}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "var(--panel3)", overflow: "hidden" }}>
                    <div style={{ width: `${sectionProgress.percent}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
                {sectionVisibleTasks.map((task, taskIndex) => (
                  <label
                    key={task.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      background: task.isComplete ? "rgba(63,185,80,0.08)" : "var(--panel3)",
                      padding: "10px 12px",
                      textAlign: "left",
                      cursor: updatingTaskIds.includes(task.id) ? "progress" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!task.isComplete}
                      disabled={updatingTaskIds.includes(task.id)}
                      style={{ marginTop: 2 }}
                      aria-label={`Mark ${toTitleCase(task.stage ?? "task")} ${task.isComplete ? "incomplete" : "complete"} in construction workflow`}
                      onChange={(event) => {
                        void handleToggle(task, event.currentTarget.checked);
                      }}
                    />
                    <span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                          textDecoration: task.isComplete ? "line-through" : "none",
                        }}
                      >
                        #{taskIndex + 1} {toTitleCase(task.stage ?? "")}
                      </span>
                      {task.completedAt && (
                        <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                          Completed {new Date(task.completedAt).toLocaleString()}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </section>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add construction notes, milestones, or handoff items..."
          rows={3}
          style={{
            width: "100%",
            borderRadius: 10,
            border: "1px solid var(--border)",
            padding: "8px 10px",
            fontSize: 12,
            resize: "vertical",
            fontFamily: "inherit",
            color: "var(--text)",
            background: "var(--panel3)",
          }}
        />
      </div>
    </div>
  );
}

export default memo(ConstructionWorkflowTemplate);

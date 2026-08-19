import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";
import { getChecklistWorkflowTasks } from "./propertyTaskCollections";
import { createTaskNotePayload, appendTaskNote, removeTaskNote, parseTaskNotes } from "./propertyWorkflowTabs";
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

function shouldShowTask(
  stage: string | null | undefined,
  worksheetFields: Record<string, string>,
  projectStage?: string | null
): boolean {
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

function ChecklistWorkflowTemplate({ propertyId, propertyName, projectStage }: Props) {
  const { tasksByProperty, isLoading: contextLoading, error: contextError, updateTaskCompletion, updateTaskNote } = usePropertyTasks();
  const [toggleError, setToggleError] = useState("");
  const [completedByUser, setCompletedByUser] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);
  const [noteDraftByTaskId, setNoteDraftByTaskId] = useState<Record<string, string>>({});
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

  const checklistTasks = useMemo(() => {
    return getChecklistWorkflowTasks(propertyTasks);
  }, [propertyTasks]);

  const visibleTasks = useMemo(
    () => checklistTasks.filter((task) => shouldShowTask(task.stage, worksheetFields, projectStage)),
    [checklistTasks, worksheetFields, projectStage]
  );

  const progress = useMemo(() => getProgress(visibleTasks), [visibleTasks]);

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

  const handleTaskNoteDraftChange = useCallback((taskId: string, value: string) => {
    setNoteDraftByTaskId((current) => ({ ...current, [taskId]: value }));
  }, []);

  const handleTaskNoteSave = useCallback(
    async (task: PropertyTask) => {
      const draft = noteDraftByTaskId[task.id] ?? "";
      if (!draft.trim()) return;

      setToggleError("");
      const newTaskNote = appendTaskNote(task.taskNote, draft, task.taskNoteCreatedAt);
      const previousDraft = draft;
      setNoteDraftByTaskId((current) => ({ ...current, [task.id]: "" }));

      const { errors } = await updateTaskNote(task, newTaskNote, null);

      if (errors?.length) {
        setNoteDraftByTaskId((current) => ({ ...current, [task.id]: previousDraft }));
        setToggleError(errors.map((item) => item.message).join("; "));
      }
    },
    [noteDraftByTaskId, updateTaskNote]
  );

  const handleTaskNoteRemove = useCallback(
    async (task: PropertyTask, index: number) => {
      setToggleError("");
      const newTaskNote = removeTaskNote(task.taskNote, index, task.taskNoteCreatedAt);

      const { errors } = await updateTaskNote(task, newTaskNote, null);

      if (errors?.length) {
        setToggleError(errors.map((item) => item.message).join("; "));
      }
    },
    [updateTaskNote]
  );

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
        ✅ Checklist
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        {propertyName ? `${propertyName} ordering and scope checklist.` : "Ordering and scope checklist."} Track materials ordered and special project items.
      </div>

      {loading && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Loading checklist…</div>}
      {!loading && error && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>⚠️ {error}</div>}

      {!loading && !error && visibleTasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
            <span>Checklist progress</span>
            <span>{progress.done}/{progress.total} ({progress.percent}%)</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--panel3)", overflow: "hidden" }}>
            <div style={{ width: `${progress.percent}%`, height: "100%", background: "var(--accent)" }} />
          </div>
        </div>
      )}

      {!loading && !error && visibleTasks.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>No checklist tasks available yet.</div>
      )}

      {!loading && !error && visibleTasks.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {visibleTasks.map((task) => (
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
                style={{ marginTop: 2, accentColor: "var(--accent)" }}
                aria-label={`Mark ${toTitleCase(task.stage ?? "task")} ${task.isComplete ? "incomplete" : "complete"} in checklist`}
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
                  {toTitleCase(task.stage ?? "")}
                </span>
                {(task.responsibilities || task.notes) && (
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>
                    {task.responsibilities?.trim() || task.notes?.trim()}
                  </span>
                )}
                {parseTaskNotes(task.taskNote, task.taskNoteCreatedAt).map((entry, index) => (
                  <span key={index} style={{ display: "block", fontSize: 12, color: "var(--text)", marginTop: 4 }}>
                    {entry.text}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      Added {new Date(entry.createdAt).toLocaleString()}
                      <button
                        type="button"
                        aria-label={`Remove note ${index + 1} for ${toTitleCase(task.stage ?? "")} in checklist`}
                        onClick={() => {
                          void handleTaskNoteRemove(task, index);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--muted)",
                          cursor: "pointer",
                          fontSize: 13,
                          lineHeight: 1,
                          padding: "0 2px",
                        }}
                      >
                        ×
                      </button>
                    </span>
                  </span>
                ))}
                <span style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={noteDraftByTaskId[task.id] ?? ""}
                    onChange={(event) => {
                      handleTaskNoteDraftChange(task.id, event.currentTarget.value);
                    }}
                    placeholder="Add note"
                    aria-label={`Add note for ${toTitleCase(task.stage ?? "")} in checklist`}
                    style={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      padding: "5px 8px",
                      fontSize: 12,
                      flex: "1 1 180px",
                      color: "var(--text)",
                      background: "var(--panel2)",
                    }}
                  />
                  <button
                    type="button"
                    disabled={!createTaskNotePayload(noteDraftByTaskId[task.id] ?? "")}
                    onClick={() => {
                      void handleTaskNoteSave(task);
                    }}
                    style={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--panel2)",
                      color: "var(--text)",
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Add note
                  </button>
                </span>
                {task.completedAt && (
                  <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    Completed {new Date(task.completedAt).toLocaleString()}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ChecklistWorkflowTemplate);

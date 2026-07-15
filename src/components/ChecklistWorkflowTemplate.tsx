import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";
import outputs from "../../amplify/amplify_outputs.json";
import { getChecklistWorkflowTasks } from "./propertyTaskCollections";
import { usePropertyTasks } from "../contexts/PropertyTasksContext";
import type { ProjectRow } from "../types/project";
import { toTitleCase } from "../utils/titleCase";

interface Props {
  propertyId?: string | null;
  propertyName?: string | null;
  projectStage?: ProjectRow["stage"] | null;
}

type PropertyTask = Schema["PropertyTask"]["type"];

const cardStyle: CSSProperties = {
  border: "1px solid #d4e8d8",
  borderRadius: 12,
  padding: "14px 16px",
  background: "#f0f7f1",
};

const HTTP_API_URL =
  (outputs as { custom?: { cpcHttpApi?: { url?: string } } })?.custom?.cpcHttpApi?.url ?? "";
const WORKSHEET_ENDPOINT = HTTP_API_URL
  ? `${HTTP_API_URL.replace(/\/?$/, "/")}worksheet`
  : "";

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
  const { allTasks, isLoading: contextLoading, error: contextError, updateTaskCompletion } = usePropertyTasks();
  const [toggleError, setToggleError] = useState("");
  const [completedByUser, setCompletedByUser] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);
  const [worksheetFields, setWorksheetFields] = useState<Record<string, string>>({});

  const error = toggleError || contextError;

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        const identifier = user.signInDetails?.loginId ?? user.username ?? user.userId;
        setCompletedByUser(identifier ?? null);
      })
      .catch(() => setCompletedByUser(null));
  }, []);

  useEffect(() => {
    if (!propertyId || !WORKSHEET_ENDPOINT) {
      return;
    }

    fetch(`${WORKSHEET_ENDPOINT}?projectId=${encodeURIComponent(propertyId)}`)
      .then((response) => response.json())
      .then((data: { fields?: Record<string, string> }) => {
        setWorksheetFields(data.fields ?? {});
      })
      .catch(() => {
        setWorksheetFields({});
      });
  }, [propertyId]);

  const loading = !!propertyId && contextLoading;

  const checklistTasks = useMemo(() => {
    if (!propertyId) return [];
    const propertyTasks = allTasks.filter((t) => t.propertyId === propertyId);
    return getChecklistWorkflowTasks(propertyTasks);
  }, [allTasks, propertyId]);

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

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a7a3c", marginBottom: 4 }}>
        ✅ Checklist
      </div>
      <div style={{ fontSize: 12, color: "#5a7060", marginBottom: 12 }}>
        {propertyName ? `${propertyName} ordering and scope checklist.` : "Ordering and scope checklist."} Track materials ordered and special project items.
      </div>

      {loading && <div style={{ fontSize: 12, color: "#5a7060", marginBottom: 12 }}>Loading checklist…</div>}
      {!loading && error && <div style={{ fontSize: 12, color: "#8f2d2d", marginBottom: 12 }}>⚠️ {error}</div>}

      {!loading && !error && visibleTasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#5a7060", marginBottom: 4 }}>
            <span>Checklist progress</span>
            <span>{progress.done}/{progress.total} ({progress.percent}%)</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#dbeadf", overflow: "hidden" }}>
            <div style={{ width: `${progress.percent}%`, height: "100%", background: "#1a7a3c" }} />
          </div>
        </div>
      )}

      {!loading && !error && visibleTasks.length === 0 && (
        <div style={{ fontSize: 12, color: "#5a7060", marginBottom: 12 }}>No checklist tasks available yet.</div>
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
                border: "1px solid #d4e8d8",
                borderRadius: 10,
                background: task.isComplete ? "rgba(26,122,60,0.12)" : "#ffffff",
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
                    color: "#1a2e1a",
                    textDecoration: task.isComplete ? "line-through" : "none",
                  }}
                >
                  {toTitleCase(task.stage ?? "")}
                </span>
                {(task.responsibilities || task.notes) && (
                  <span style={{ display: "block", fontSize: 12, color: "#5a7060" }}>
                    {task.responsibilities?.trim() || task.notes?.trim()}
                  </span>
                )}
                {task.completedAt && (
                  <span style={{ display: "block", fontSize: 11, color: "#5a7060", marginTop: 2 }}>
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

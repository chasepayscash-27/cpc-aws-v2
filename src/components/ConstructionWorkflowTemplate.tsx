import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";
import { getConstructionWorkflowTasks } from "./propertyTaskCollections";
import { usePropertyTasks } from "../contexts/PropertyTasksContext";

interface Props {
  propertyId?: string | null;
  propertyName?: string | null;
}

type PropertyTask = Schema["PropertyTask"]["type"];

const cardStyle: CSSProperties = {
  border: "1px solid #d4e8d8",
  borderRadius: 12,
  padding: "14px 16px",
  background: "#f0f7f1",
};

export default function ConstructionWorkflowTemplate({ propertyId, propertyName }: Props) {
  const { allTasks, isLoading: contextLoading, error: contextError, updateTaskCompletion } = usePropertyTasks();
  const [toggleError, setToggleError] = useState("");
  const [notes, setNotes] = useState("");
  const [completedByUser, setCompletedByUser] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);

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

  const constructionTasks = useMemo(() => {
    if (!propertyId) return [];
    const propertyTasks = allTasks.filter((t) => t.propertyId === propertyId);
    return getConstructionWorkflowTasks(propertyTasks);
  }, [allTasks, propertyId]);

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
        🏗️ Construction Workflow
      </div>
      <div style={{ fontSize: 12, color: "#5a7060", marginBottom: 12 }}>
        {propertyName ? `${propertyName} construction tasks.` : "Construction tasks."} These checklist items stay synced with the main property workflow.
      </div>

      {loading && <div style={{ fontSize: 12, color: "#5a7060", marginBottom: 12 }}>Loading construction workflow…</div>}
      {!loading && error && <div style={{ fontSize: 12, color: "#8f2d2d", marginBottom: 12 }}>⚠️ {error}</div>}
      {!loading && !error && constructionTasks.length === 0 && (
        <div style={{ fontSize: 12, color: "#5a7060", marginBottom: 12 }}>No construction workflow tasks available yet.</div>
      )}

      {!loading && !error && constructionTasks.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {constructionTasks.map((task) => (
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
                aria-label={`Mark ${task.stage ?? "task"} ${task.isComplete ? "incomplete" : "complete"} in construction workflow`}
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
                  #{task.order ?? "—"} {task.stage}
                </span>
                {(task.responsibilities || task.notes) && (
                  <span style={{ display: "block", fontSize: 12, color: "#5a7060" }}>
                    {task.responsibilities?.trim() || task.notes?.trim()}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1a7a3c", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
            border: "1px solid #c7ddcc",
            padding: "8px 10px",
            fontSize: 12,
            resize: "vertical",
            fontFamily: "inherit",
            color: "#1a2e1a",
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  );
}

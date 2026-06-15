import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";
import { getConstructionWorkflowTasks } from "./propertyTaskCollections";
import { updateTask } from "./propertyWorkflowTabs";

interface Props {
  propertyId?: string | null;
  propertyName?: string | null;
}

type PropertyTask = Schema["PropertyTask"]["type"];

const client = generateClient<Schema>();

const cardStyle: CSSProperties = {
  border: "1px solid #d4e8d8",
  borderRadius: 12,
  padding: "14px 16px",
  background: "#f0f7f1",
};

export default function ConstructionWorkflowTemplate({ propertyId, propertyName }: Props) {
  const [tasks, setTasks] = useState<PropertyTask[] | null>(propertyId ? null : []);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [completedByUser, setCompletedByUser] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);

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

    const subscription = client.models.PropertyTask.observeQuery({
      filter: { propertyId: { eq: propertyId } },
    }).subscribe({
      next: ({ items }) => {
        setTasks(items);
        setError("");
      },
      error: (loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load construction workflow.");
      },
    });

    return () => subscription.unsubscribe();
  }, [propertyId]);

  const loading = !!propertyId && tasks === null && !error;
  const constructionTasks = useMemo(() => getConstructionWorkflowTasks(tasks ?? []), [tasks]);

  const handleToggle = useCallback(
    async (task: PropertyTask, checked: boolean) => {
      setError("");
      const previousCompletedAt = task.completedAt;
      const previousCompletedBy = task.completedBy;
      const completedAt = checked ? new Date().toISOString() : null;
      const completedBy = checked ? completedByUser : null;

      setUpdatingTaskIds((current) => [...current, task.id]);
      setTasks((currentTasks) =>
        updateTask(currentTasks ?? [], task.id, {
          isComplete: checked,
          completedAt,
          completedBy,
        })
      );

      const { errors } = await client.models.PropertyTask.update({
        id: task.id,
        isComplete: checked,
        completedAt,
        completedBy,
      });

      setUpdatingTaskIds((current) => current.filter((id) => id !== task.id));

      if (errors?.length) {
        setTasks((currentTasks) =>
          updateTask(currentTasks ?? [], task.id, {
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

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();

export default function App() {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "todos">("dashboard");

  useEffect(() => {
    try {
      const sub = client.models.Todo.observeQuery().subscribe(
        ({ items }: any) => {
          setTodos(items);
          setLoading(false);
        },
        (err: any) => {
          console.error("Error loading todos:", err);
          setError(err?.message || "Failed to load todos");
          setLoading(false);
        }
      );

      return () => sub.unsubscribe();
    } catch (err: any) {
      console.error("Error setting up subscription:", err);
      setError(err?.message || "Failed to set up subscription");
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div style={{ padding: "40px" }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: "40px", color: "red" }}>Error: {error}</div>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
      <nav style={{ backgroundColor: "#1f2937", color: "white", padding: "15px 40px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", gap: "20px" }}>
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              background: activeTab === "dashboard" ? "#3b82f6" : "transparent",
              border: "none",
              color: "white",
              padding: "10px 20px",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab("todos")}
            style={{
              background: activeTab === "todos" ? "#3b82f6" : "transparent",
              border: "none",
              color: "white",
              padding: "10px 20px",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            📝 Notes
          </button>
        </div>
      </nav>

      {activeTab === "dashboard" ? (
        <AnalyticsDashboard />
      ) : (
        <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
          <button onClick={async () => {
            const content = window.prompt("Todo content");
            if (!content?.trim()) return;
            try {
              await client.models.Todo.create({ content: content.trim() });
            } catch (err: any) {
              alert("Failed to create todo: " + (err?.message || "Unknown error"));
            }
          }} style={{ marginBottom: "20px", padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + Add Note
          </button>
          <ul style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
            {todos.map((todo) => (
              <li key={todo.id}>{todo.content}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
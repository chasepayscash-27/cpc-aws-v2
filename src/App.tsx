import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();

export default function App() {
  const [todos, setTodos] = useState<any[]>([]);
  const [active, setActive] = useState<
    "Financial Statements" | "Flipper Force" | "MLS - Paragon" | "Acquisitions" | "Procurement" | "Trade Flow"
  >("Financial Statements");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function createTodo() {
    const content = window.prompt("Todo content");
    if (!content?.trim()) return;
    try {
      await client.models.Todo.create({ content: content.trim() });
    } catch (err: any) {
      console.error("Error creating todo:", err);
      alert("Failed to create todo: " + (err?.message || "Unknown error"));
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-badge" />
          <div>
            <div className="brand-title">Chase Pays Cash Analytics</div>
            <div className="brand-subtitle">Insights • Reporting • Operations</div>
          </div>
        </div>

        <div className="header-actions">
          <button className="accent" onClick={createTodo}>+ New Note</button>
        </div>
      </header>

      <div className="container">
        <aside className="sidebar">
          <div className="nav-title">Navigation</div>
          <nav className="nav">
            {[
              "Financial Statements",
              "Flipper Force",
              "MLS - Paragon",
              "Acquisitions",
              "Procurement",
              "Trade Flow",
            ].map((label) => (
              <a
                key={label}
                href="#"
                className={active === label ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setActive(label as any);
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="main">
          <section className="card">
            <h2>{active}</h2>
            <p>Placeholder content for this section. Next step: cards + charts + KPI tiles.</p>
          </section>

          <section className="card">
            <h2>Quick Notes (Todos)</h2>
            {loading && <p>Loading todos...</p>}
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
            {!loading && !error && (
              <>
                <p>Lightweight scratchpad for tasks while you build the real modules.</p>
                <ul>
                  {todos.map((todo) => (
                    <li key={todo.id}>{todo.content}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
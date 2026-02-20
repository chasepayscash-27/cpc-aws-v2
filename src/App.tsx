import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

export default function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [active, setActive] = useState<
    "Financial Statements" | "Flipper Force" | "MLS - Paragon" | "Acquisitions" | "Procurement" | "Trade Flow"
  >("Financial Statements");

  useEffect(() => {
    const sub = client.models.Todo.observeQuery().subscribe({
      next: ({ items }) => setTodos([...items]),
    });

    return () => sub.unsubscribe();
  }, []);

  async function createTodo() {
    const content = window.prompt("Todo content");
    if (!content?.trim()) return;
    await client.models.Todo.create({ content: content.trim() });
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
            <p>Lightweight scratchpad for tasks while you build the real modules.</p>

            <ul>
              {todos.map((todo) => (
                <li key={todo.id}>{todo.content}</li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}

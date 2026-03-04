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
    <div
      style={{
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      <main style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1>Chase Pays Cash Analytics</h1>
        <h2>Financial Statements</h2>
        <h3>Flipper Force Data</h3>
        <h4>MLS - Paragon</h4>
        <h5>Acquisitions</h5>
        <h6>Procurement - Materials</h6>
        <p>Trade Flow</p>

        <button onClick={createTodo}>+ new</button>

        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>{todo.content}</li>
          ))}
        </ul>

        <div style={{ marginTop: 24 }}>
          🥳 App successfully hosted. Try creating a new todo.
          <br />
          <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
            Review next step of this tutorial.
          </a>
        </div>
      </main>
    </div>
  );
}

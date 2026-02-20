import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

export default function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

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
        <h2>Flipper Force Data</h2>
        <h2>MLS - Paragon</h2>
        <h2>Acquisitions</h2>
        <h2>Procurement - Materials</h2>
        <h2>Trade Flow</h2>

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

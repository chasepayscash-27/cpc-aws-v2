import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

useEffect(() => {
  const sub = client.models.Todo.observeQuery().subscribe({
    next: (data) => setTodos([...data.items]),
  });
  return () => sub.unsubscribe();
}, []);

async function createTodo() {
  const content = window.prompt("Todo content");
  if (!content?.trim()) return;
  await client.models.Todo.create({ content: content.trim() });
}

return (
  <main>
    <h1>Chase Pays Cash Analytics</h1>
    <h2>Financial Statements</h2>
    <h3>Flipper Force Data</h3>
    <h4>MLS - Paragon</h4>
    <h5>Acquisitions</h5>
    <h6>Procurement - Materials</h6>
    <p>Trade Flow</p>
    {/* rest... */}
  </main>
);

      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.content}</li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
    </main>
  );
}

export default App;

import React from 'react';

function App() {
    const { loading, error, todos } = useTodos(); // Assuming this is how you fetch todos

    return (
        <div>
            <Header />
            <Sidebar />
            <main>
                {loading && <p>Loading...</p>}
                {error && <p>Error: {error}</p>}
                {!loading && !error && (
                    <ul>
                        {todos.map(todo => (
                            <li key={todo.id}>{todo.text}</li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}

export default App;
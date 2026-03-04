import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

function App() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Simulating data fetching
        setTimeout(() => {
            setLoading(false);
        }, 2000);
    }, []);

    return (
        <Router>
            <div className="App">
                {loading ? ( // show loading
                    <div>Loading...</div>
                ) : error ? ( // show error
                    <div>Error: {error}</div>
                ) : ( // normal content
                    <Switch>
                        {/* Navigation Map and Sidebar */}
                        <Route path="/">
                            <h1>Welcome to the App</h1>
                        </Route>
                    </Switch>
                )}
            </div>
        </Router>
    );
}

export default App;
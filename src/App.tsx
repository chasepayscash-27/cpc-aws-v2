import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // simulate an API call
        setTimeout(() => {
            setLoading(false);
            // Uncomment below to simulate an error
            // setError('An error occurred');
        }, 2000);
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return <div>Hello World!</div>;
};

export default App;

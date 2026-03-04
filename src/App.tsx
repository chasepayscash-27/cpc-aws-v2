import React, { useState } from 'react';
import './App.css'; // Make sure to create a corresponding CSS file for styling

const App: React.FC = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="app">
            <header className="header">
                <h1 className="header-title">My Application</h1>
                <button onClick={toggleSidebar} className="toggle-button">
                    {isSidebarOpen ? 'Collapse' : 'Expand'} Menu
                </button>
            </header>
            <div className="container">
                {isSidebarOpen && (
                    <nav className="sidebar">
                        <h2>Main</h2>
                        <ul>
                            <li><a href="#dashboard">Dashboard</a></li>
                            <li><a href="#settings">Settings</a></li>
                        </ul>
                        <h2>Reports</h2>
                        <ul>
                            <li><a href="#sales">Sales Report</a></li>
                            <li><a href="#user">User Report</a></li>
                        </ul>
                    </nav>
                )}
                <main className="main-content">
                    <h2>Welcome to the app!</h2>
                    <p>This is the main content area.</p>
                </main>
            </div>
        </div>
    );
};

export default App;

import React from 'react';
import Navigation from './Navigation';
import Content from './Content';

const App = () => {
    const nav = [
        'Home',
        'About',
        'Contact',
        // Removed 'Flipper Force Data' and 'Properties' navigation items
    ];

    const renderContent = (caseType) => {
        switch (caseType) {
            case 'home':
                return <Content type='home' />;
            case 'about':
                return <Content type='about' />;
            case 'contact':
                return <Content type='contact' />;
            // Removed case 'flipper' and case 'properties' handlers
            default:
                return <Content type='404' />;
        }
    };

    return (
        <div>
            <Navigation items={nav} />
            {renderContent('home')}
        </div>
    );
};

export default App;
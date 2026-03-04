import React from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { getAnalyticsData } from './graphql/queries';

const AnalyticsDashboard = () => {
    const fetchAnalyticsData = async () => {
        try {
            const response = await API.graphql(graphqlOperation(getAnalyticsData, { endpoint: outputs.data.url }));
            // handle the response
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        }
    };

    React.useEffect(() => {
        fetchAnalyticsData();
    }, []);

    return (
        <div>
            <h1>Analytics Dashboard</h1>
            {/* Render analytics data here */}
        </div>
    );
};

export default AnalyticsDashboard;
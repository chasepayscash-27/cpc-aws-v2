import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';

interface PropertyFinancialsProps {
  propertyName: string;
}

const PropertyFinancials: React.FC<PropertyFinancialsProps> = ({ propertyName }) => {
  const [financialData, setFinancialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const response = await fetch('/path/to/your/financial-data.csv'); // Change to the actual path
        const text = await response.text();
        const data = parseCSV(text); // You will need to implement CSV parsing logic
        const filteredData = data.filter((item: any) => item.propertyName === propertyName);
        setFinancialData(filteredData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load financial data.');
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [propertyName]);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Assume financialData is structured appropriately; adjust rendering logic as necessary
  const income = financialData.reduce((acc: number, item: any) => acc + item.income, 0);
  const expenses = financialData.reduce((acc: number, item: any) => acc + item.expenses, 0);
  const netProfit = income - expenses;

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5">{propertyName}</Typography>
          <Typography variant="body1">Income: {income}</Typography>
          <Typography variant="body1">Expenses: {expenses}</Typography>
          <Typography variant="body1">Net Profit: {netProfit}</Typography>
          <Typography variant="subtitle1">Expense Breakdown:</Typography>
          {/* Render breakdown logic here */}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PropertyFinancials;

import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const FinancialsPage = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    fetch('/data/financials.csv')
      .then(response => response.text())
      .then(text => {
        const parsedData = parseCSV(text);
        setData(parsedData);
        setFilteredData(parsedData);
      });
  }, []);

  const parseCSV = (text) => {
    const rows = text.split('\n');
    return rows.map(row => {
      const columns = row.split(',');
      return {
        account: columns[0],
        netIncome: parseFloat(columns[1]),
        // Add other columns as necessary
      };
    });
  };

  const calculateNetProfit = () => {
    return filteredData.reduce((acc, item) => acc + (item.netIncome || 0), 0);
  };

  const handleFilterChange = (filter) => {
    const newData = data.filter(item => item.account.includes(filter));
    setFilteredData(newData);
  };

  return (
    <div>
      <h1>Financials</h1>
      <input type="text" onChange={(e) => handleFilterChange(e.target.value)} placeholder="Filter by account" />
      <h2>Net Profit: {calculateNetProfit()}</h2>
      <Table dataSource={filteredData} columns={[{ title: 'Account', dataIndex: 'account' }, { title: 'Net Income', dataIndex: 'netIncome' }]} />
    </div>
  );
};

export default FinancialsPage;
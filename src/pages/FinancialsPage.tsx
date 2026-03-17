import React, { useEffect, useState, useMemo } from 'react';
import { normalizeAddress } from '../utils/normalizeAddress';

interface FinancialRecord {
  account: string;
  property_name: string;
  amount: number;
}

interface Props {
  initialProperty?: string;
}

const FinancialsPage: React.FC<Props> = ({ initialProperty }) => {
  const [data, setData] = useState<FinancialRecord[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load CSV data on component mount
  useEffect(() => {
    fetch('/data/sweet_home_bama_pl_long_fixed.csv')  // ← FIXED PATH
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.trim().split('\n');
        const records: FinancialRecord[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const [account, property_name, amount] = lines[i].split(',');
          if (account && property_name && amount) {
            records.push({
              account: account.trim(),
              property_name: property_name.trim(),
              amount: parseFloat(amount),
            });
          }
        }
        
        setData(records);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading CSV:', err);
        setIsLoading(false);
      });
  }, []);

  // When initialProperty changes (or data loads), find the matching P&L property name
  useEffect(() => {
    if (!initialProperty || data.length === 0) return;
    const normalizedInitial = normalizeAddress(initialProperty);
    const uniqueNames = [...new Set(data.map(r => r.property_name))];
    const match = uniqueNames.find(n => normalizeAddress(n) === normalizedInitial);
    setSelectedProperty(match ?? 'all');
  }, [initialProperty, data]);

  const properties = useMemo(() => {
    const unique = [...new Set(data.map(d => d.property_name))];
    return unique.sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(record => {
      const matchesProperty = selectedProperty === 'all' || record.property_name === selectedProperty;
      const matchesSearch = record.account.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesProperty && matchesSearch;
    });
  }, [data, selectedProperty, searchTerm]);

  const totalIncome = useMemo(() => {
    return filteredData
      .filter(r => r.account === 'Sale of property' || r.account.includes('Total for Income'))
      .reduce((sum, r) => sum + r.amount, 0);
  }, [filteredData]);

  const totalExpenses = useMemo(() => {
    return filteredData
      .filter(r => r.account === 'Total for Expenses')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [filteredData]);

  const netProfit = useMemo(() => {
    // Use Net Income row if available (most accurate)
    const netIncomeRecords = filteredData.filter(r => r.account === 'Net Income');
    if (netIncomeRecords.length > 0) {
      return netIncomeRecords.reduce((sum, r) => sum + r.amount, 0);
    }
    // Fallback to calculation
    return totalIncome - totalExpenses;
  }, [filteredData, totalIncome, totalExpenses]);

  if (isLoading) {
    return <div className="pageHeader"><p>Loading financials...</p></div>;
  }

  return (
    <div>
      <div className="pageHeader">
        <h1 className="h1">Financials</h1>
        <p className="muted">Property-by-property P&L analysis</p>
      </div>

      <section className="grid">
        <div className="card">
          <div className="cardLabel">Total Income</div>
          <div className="cardValue">${totalIncome.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
        </div>
        <div className="card">
          <div className="cardLabel">Total Expenses</div>
          <div className="cardValue">${totalExpenses.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
        </div>
        <div className="card">
          <div className="cardLabel">Net Profit</div>
          <div className="cardValue" style={{ color: netProfit < 0 ? '#dc2626' : '#1a7a3c' }}>
            ${netProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
        </div>
      </section>

      <section className="card">
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: '#f0f7f1',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Properties</option>
              {properties.map(prop => (
                <option key={prop} value={prop}>{prop}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              Search Account
            </label>
            <input
              type="text"
              placeholder="e.g., Labor, Materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: '#f0f7f1',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: '16px' }}>
        <div className="cardLabel" style={{ marginBottom: '12px' }}>Transactions ({filteredData.length})</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--accent)', fontWeight: '600' }}>Account</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--accent)', fontWeight: '600' }}>Property</th>
                <th style={{ textAlign: 'right', padding: '8px', color: 'var(--accent)', fontWeight: '600' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eaf4ec' }}>
                  <td style={{ padding: '8px' }}>{record.account}</td>
                  <td style={{ padding: '8px', color: 'var(--muted)', fontSize: '12px' }}>{record.property_name}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>
                    ${record.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FinancialsPage;

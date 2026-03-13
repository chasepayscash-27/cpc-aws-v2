
import React, { useState, useMemo } from 'react';

interface FinancialRecord {
  account: string;
  property_name: string;
  amount: number;
}

const FinancialsPage: React.FC = () => {
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sample data - replace with your CSV import
  const data: FinancialRecord[] = [
    { account: 'Sale of property', property_name: '10 Anderson Mtn Dr', amount: 77483.58 },
    { account: 'Labor', property_name: '10 Anderson Mtn Dr', amount: 48863 },
    { account: 'Materials', property_name: '10 Anderson Mtn Dr', amount: 42234.35 },
    { account: 'Total for Expenses', property_name: '10 Anderson Mtn Dr', amount: 232531.32 },
    // Add all your data here
  ];

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

  const totalIncome = filteredData
    .filter(r => r.account === 'Sale of property' || r.account.includes('Total for Income'))
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpenses = filteredData
    .filter(r => r.account === 'Total for Expenses')
    .reduce((sum, r) => sum + r.amount, 0);

  const netProfit = totalIncome - totalExpenses;

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
          <div className="cardValue">${netProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
        </div>
      </section>

      <section className="card">
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
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
                background: 'rgba(30, 91, 168, 0.05)',
                color: 'var(--text)',
              }}
            >
              <option value="all">All Properties</option>
              {properties.map(prop => (
                <option key={prop} value={prop}>{prop}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
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
                background: 'rgba(30, 91, 168, 0.05)',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: '16px' }}>
        <div className="cardLabel" style={{ marginBottom: '12px' }}>Transactions</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--gold)', fontWeight: '600' }}>Account</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--gold)', fontWeight: '600' }}>Property</th>
                <th style={{ textAlign: 'right', padding: '8px', color: 'var(--gold)', fontWeight: '600' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
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

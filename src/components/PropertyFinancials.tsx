import React, { useEffect, useState, useMemo } from 'react';

interface FinancialRecord {
  account: string;
  property_name: string;
  amount: number;
}

interface PropertyFinancialsProps {
  propertyName: string;
}

const PropertyFinancials: React.FC<PropertyFinancialsProps> = ({ propertyName }) => {
  const [data, setData] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/sweet_home_bama_pl_long_fixed.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.trim().split('\n');
        const records: FinancialRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          const [account, property_name, amount] = lines[i].split(',');
          if (account && property_name && amount) {
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount)) continue;
            records.push({
              account: account.trim(),
              property_name: property_name.trim(),
              amount: parsedAmount,
            });
          }
        }
        setData(records);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading financial data:', err);
        setError('Failed to load financial data');
        setLoading(false);
      });
  }, []);

  const propertyData = useMemo(
    () => data.filter(record => record.property_name === propertyName),
    [data, propertyName]
  );

  const totalIncome = useMemo(
    () =>
      propertyData
        .filter(r => r.account === 'Sale of property' || r.account.includes('Total for Income'))
        .reduce((sum, r) => sum + r.amount, 0),
    [propertyData]
  );

  const totalExpenses = useMemo(
    () =>
      propertyData
        .filter(r => r.account === 'Total for Expenses')
        .reduce((sum, r) => sum + r.amount, 0),
    [propertyData]
  );

  const netProfit = useMemo(() => {
    const netIncomeRecords = propertyData.filter(r => r.account === 'Net Income');
    if (netIncomeRecords.length > 0) {
      return netIncomeRecords.reduce((sum, r) => sum + r.amount, 0);
    }
    return totalIncome - totalExpenses;
  }, [propertyData, totalIncome, totalExpenses]);

  const lineItems = useMemo(
    () =>
      propertyData.filter(
        r =>
          r.account !== 'Sale of property' &&
          !r.account.includes('Total') &&
          !r.account.includes('Gross Profit') &&
          !r.account.includes('Net Operating') &&
          !r.account.includes('Net Income')
      ),
    [propertyData]
  );

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
        Loading financials…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#ff6b6b', fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (propertyData.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
        No financial data available for this property.
      </div>
    );
  }

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {([
          { label: 'Total Income', value: totalIncome },
          { label: 'Total Expenses', value: totalExpenses },
          { label: 'Net Profit', value: netProfit },
        ] as { label: string; value: number }[]).map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', marginBottom: 6 }}>{label}</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color:
                  label === 'Net Profit'
                    ? value < 0
                      ? '#ff6b6b'
                      : '#51cf66'
                    : '#ffd700',
              }}
            >
              {fmt(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Line-item breakdown */}
      {lineItems.length > 0 && (
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {lineItems.map((record, idx) => (
            <div
              key={`${record.account}-${record.property_name}-${idx}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '9px 14px',
                borderBottom:
                  idx < lineItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.82)' }}>{record.account}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>{fmt(record.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyFinancials;

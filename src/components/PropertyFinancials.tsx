import React, { useEffect, useState, useMemo } from 'react';
import { normalizeAddress } from '../utils/normalizeAddress';

interface FinancialRecord {
  account: string;
  property_name: string;
  amount: number;
}

interface PropertyFinancialsProps {
  propertyName: string;
  onViewFullPnL?: () => void;
}

const PropertyFinancials: React.FC<PropertyFinancialsProps> = ({ propertyName, onViewFullPnL }) => {
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
  () => data.filter(record =>
    normalizeAddress(record.property_name) === normalizeAddress(propertyName)
  ),
  [data, propertyName]
);
  const totalIncome = useMemo(
    () =>
      propertyData
        .filter(r => r.account === 'Sale of property' || r.account.includes('Total for Income'))
        .reduce((sum, r) => sum + r.amount, 0),
    [propertyData]
  );

  const lineItems = useMemo(
    () =>
      propertyData.filter(
        r =>
          r.account !== 'Sale of property' &&
          r.account !== 'Rehab Reimbursement' &&
          r.account !== 'Sales (deleted)' &&
          !r.account.includes('Total') &&
          !r.account.includes('Gross Profit') &&
          !r.account.includes('Net Operating') &&
          !r.account.includes('Net Income') &&
          !r.account.includes('Net Other Income') &&
          !r.account.includes('Mortgage') &&
          !r.account.includes('Transfer')
      ),
    [propertyData]
  );

  const totalExpenses = useMemo(
    () => lineItems.reduce((sum, r) => sum + r.amount, 0),
    [lineItems]
  );

  const netProfit = useMemo(() => {
    const netIncomeRecords = propertyData.filter(r => r.account === 'Net Income');
    if (netIncomeRecords.length > 0) {
      return netIncomeRecords.reduce((sum, r) => sum + r.amount, 0);
    }
    return totalIncome - totalExpenses;
  }, [propertyData, totalIncome, totalExpenses]);

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#5a7060', fontSize: 13 }}>
        Loading financials…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#dc2626', fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (propertyData.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#5a7060', fontSize: 13 }}>
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
              background: '#f0f7f1',
              border: '1px solid #d4e8d8',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, color: '#5a7060', marginBottom: 6 }}>{label}</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color:
                  label === 'Net Profit'
                    ? value < 0
                      ? '#dc2626'
                      : '#1a7a3c'
                    : '#1a7a3c',
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
            border: '1px solid #d4e8d8',
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
                  idx < lineItems.length - 1 ? '1px solid #eaf4ec' : 'none',
                fontSize: 13,
              }}
            >
              <span style={{ color: '#1a2e1a' }}>{record.account}</span>
              <span style={{ color: '#5a7060' }}>{fmt(record.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Link to full P&L */}
      {onViewFullPnL && (
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button
            onClick={onViewFullPnL}
            style={{
              background: 'none',
              border: '1px solid rgba(26,122,60,0.40)',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: '#1a7a3c',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(26,122,60,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            View Full P&amp;L →
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyFinancials;

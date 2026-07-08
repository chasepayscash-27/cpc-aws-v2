import { useState } from 'react';
import '../App.css';

// ─── Sample / placeholder data ────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  property: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  status: 'overdue' | 'due-today' | 'upcoming' | 'blocked';
  dueDate: string;
}

interface Property {
  id: string;
  address: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
}

const SAMPLE_TASKS: Task[] = [
  { id: 't1', title: 'Submit permit application', property: '142 Oak St', assignee: 'Chase', priority: 'high', status: 'overdue', dueDate: '2026-07-05' },
  { id: 't2', title: 'Schedule final inspection', property: '88 Maple Ave', assignee: 'Alex', priority: 'high', status: 'overdue', dueDate: '2026-07-06' },
  { id: 't3', title: 'Contractor walkthrough', property: '201 Pine Rd', assignee: 'Chase', priority: 'medium', status: 'due-today', dueDate: '2026-07-08' },
  { id: 't4', title: 'Review punch-list items', property: '77 Birch Ln', assignee: 'Morgan', priority: 'medium', status: 'due-today', dueDate: '2026-07-08' },
  { id: 't5', title: 'Order flooring materials', property: '142 Oak St', assignee: 'Alex', priority: 'low', status: 'upcoming', dueDate: '2026-07-12' },
  { id: 't6', title: 'Stage for listing photos', property: '88 Maple Ave', assignee: 'Chase', priority: 'medium', status: 'upcoming', dueDate: '2026-07-14' },
  { id: 't7', title: 'Awaiting HOA approval', property: '55 Cedar Ct', assignee: 'Morgan', priority: 'high', status: 'blocked', dueDate: '2026-07-10' },
  { id: 't8', title: 'Pending lender sign-off', property: '201 Pine Rd', assignee: 'Chase', priority: 'high', status: 'blocked', dueDate: '2026-07-09' },
  { id: 't9', title: 'Roof repair estimate', property: '33 Elm Dr', assignee: 'Alex', priority: 'medium', status: 'upcoming', dueDate: '2026-07-16' },
  { id: 't10', title: 'Update listing price', property: '77 Birch Ln', assignee: 'Morgan', priority: 'low', status: 'upcoming', dueDate: '2026-07-18' },
];

const SAMPLE_PROPERTIES: Property[] = [
  { id: 'p1', address: '142 Oak St', issue: 'Permit overdue — submit ASAP', severity: 'critical' },
  { id: 'p2', address: '55 Cedar Ct', issue: 'HOA approval pending 3+ days', severity: 'critical' },
  { id: 'p3', address: '88 Maple Ave', issue: 'Final inspection not yet scheduled', severity: 'warning' },
  { id: 'p4', address: '201 Pine Rd', issue: 'Lender sign-off required', severity: 'warning' },
  { id: 'p5', address: '33 Elm Dr', issue: 'Roof repair estimate missing', severity: 'info' },
];

const ACTIVE_PROPERTIES = [
  { address: '142 Oak St', stage: 'Renovation', progress: 65 },
  { address: '88 Maple Ave', stage: 'Listing Prep', progress: 85 },
  { address: '201 Pine Rd', stage: 'Under Contract', progress: 90 },
  { address: '55 Cedar Ct', stage: 'Acquisition', progress: 20 },
  { address: '77 Birch Ln', stage: 'Renovation', progress: 50 },
  { address: '33 Elm Dr', stage: 'Evaluation', progress: 10 },
];

const INITIAL_NOTES =
  'Team sync every Monday 9 AM.\n\nReminder: all permits must be filed 48 hrs before inspection.\n\nChase — follow up with HOA on Cedar Ct by EOD.';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priorityBadge(priority: Task['priority']) {
  const map = { high: '#dc2626', medium: '#d97706', low: '#16a34a' } as const;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        background: map[priority],
        textTransform: 'capitalize',
      }}
    >
      {priority}
    </span>
  );
}

function severityColor(severity: Property['severity']) {
  return severity === 'critical' ? '#dc2626' : severity === 'warning' ? '#d97706' : '#2563eb';
}

function severityIcon(severity: Property['severity']) {
  return severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : 'ℹ️';
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  count: number;
  icon: string;
  accentColor: string;
}

function KpiCard({ label, count, icon, accentColor }: KpiCardProps) {
  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      aria-label={`${label}: ${count}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span className="cardLabel">{label}</span>
      </div>
      <div className="cardValue" style={{ color: accentColor }}>
        {count}
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
}

function TaskRow({ task }: TaskRowProps) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ flex: '1 1 180px', fontWeight: 600, fontSize: 14 }}>{task.title}</span>
      <span style={{ color: 'var(--muted)', fontSize: 13, minWidth: 80 }}>{task.property}</span>
      <span style={{ color: 'var(--muted)', fontSize: 13, minWidth: 60 }}>{task.assignee}</span>
      <span style={{ minWidth: 70, fontSize: 13 }}>📅 {formatDate(task.dueDate)}</span>
      {priorityBadge(task.priority)}
    </li>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TeamWipPage() {
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  const overdue = SAMPLE_TASKS.filter((t) => t.status === 'overdue');
  const dueToday = SAMPLE_TASKS.filter((t) => t.status === 'due-today');
  const upcoming = SAMPLE_TASKS.filter((t) => t.status === 'upcoming');
  const blocked = SAMPLE_TASKS.filter((t) => t.status === 'blocked');

  function handleRefresh() {
    setRefreshedAt(new Date());
  }

  return (
    <>
      {/* ── Page header ── */}
      <div className="pageHeader" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="h1">Team — WIP</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Good {greeting()}, team 👋 — here's where things stand today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            📅 {todayLabel()}
          </span>
          <button
            className="btnPrimary"
            onClick={handleRefresh}
            aria-label="Refresh dashboard data"
            title="Refresh dashboard"
          >
            🔄 Update
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, marginTop: -6 }}>
        Last updated: {refreshedAt.toLocaleTimeString()}
      </p>

      {/* ── KPI Cards ── */}
      <section
        aria-label="KPI summary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KpiCard label="Overdue" count={overdue.length} icon="🔴" accentColor="#dc2626" />
        <KpiCard label="Due Today" count={dueToday.length} icon="🟡" accentColor="#d97706" />
        <KpiCard label="Upcoming" count={upcoming.length} icon="🟢" accentColor="var(--accent)" />
        <KpiCard label="Blocked" count={blocked.length} icon="🚧" accentColor="#7c3aed" />
      </section>

      {/* ── Main content grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
        }}
      >
        {/* Tasks Due Today */}
        <section className="card" aria-labelledby="wip-due-today-heading">
          <h2 id="wip-due-today-heading" style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--accent)' }}>
            🟡 Tasks Due Today ({dueToday.length})
          </h2>
          {dueToday.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No tasks due today — great work!</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {dueToday.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </section>

        {/* Properties Needing Attention */}
        <section className="card" aria-labelledby="wip-attention-heading">
          <h2 id="wip-attention-heading" style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--accent)' }}>
            🏘️ Properties Needing Attention
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {SAMPLE_PROPERTIES.map((p) => (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '7px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{severityIcon(p.severity)}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.address}</div>
                  <div style={{ fontSize: 13, color: severityColor(p.severity) }}>{p.issue}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Blocked Items */}
        <section className="card" aria-labelledby="wip-blocked-heading">
          <h2 id="wip-blocked-heading" style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--accent)' }}>
            🚧 Blocked Items ({blocked.length})
          </h2>
          {blocked.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No blocked items — nice!</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {blocked.map((t) => (
                <li
                  key={t.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                    {t.property} · {t.assignee} · due {formatDate(t.dueDate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Active Properties */}
        <section className="card" aria-labelledby="wip-active-heading">
          <h2 id="wip-active-heading" style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--accent)' }}>
            🏗️ Active Properties ({ACTIVE_PROPERTIES.length})
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {ACTIVE_PROPERTIES.map((p) => (
              <li key={p.address} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.address}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.stage}</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={p.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${p.address} progress: ${p.progress}%`}
                  style={{
                    height: 6,
                    borderRadius: 99,
                    background: 'var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${p.progress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-light) 100%)',
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', marginTop: 2 }}>
                  {p.progress}%
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Upcoming Tasks */}
        <section className="card" aria-labelledby="wip-upcoming-heading">
          <h2 id="wip-upcoming-heading" style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--accent)' }}>
            📅 Upcoming Tasks ({upcoming.length})
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {upcoming.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </section>

        {/* Quick Notes */}
        <section className="card" aria-labelledby="wip-notes-heading">
          <h2 id="wip-notes-heading" style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--accent)' }}>
            📝 Quick Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-label="Quick team notes"
            placeholder="Jot down team notes here…"
            rows={9}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1.5px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,122,60,0.12)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </section>
      </div>

      {/* ── Overdue panel (full-width) ── */}
      {overdue.length > 0 && (
        <section className="card" style={{ marginTop: 14 }} aria-labelledby="wip-overdue-heading">
          <h2 id="wip-overdue-heading" style={{ margin: '0 0 10px', fontSize: 16, color: '#dc2626' }}>
            🔴 Overdue Tasks — Action Required ({overdue.length})
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {overdue.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

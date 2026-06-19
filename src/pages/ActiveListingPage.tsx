import { useEffect, useMemo, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { loadCsv } from '../utils/csv';
import type { ProjectRow } from '../types/project';
import type { Schema } from '../../amplify/data/resource';

type ActiveListingNote = Schema['ActiveListingNote']['type'];

const client = generateClient<Schema>();

const ACCENT_COLOR = '#ec4899'; // matches active_listing in pipelineStatus

function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActiveListingPage() {
  // ─── Properties ───────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [propsLoading, setPropsLoading] = useState(true);
  const [propsError, setPropsError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCsv<ProjectRow>('/data/projects_v2.csv')
      .then((data) => {
        const active = data.filter(
          (r) =>
            !r.archived_at &&
            (r.stage ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim() === 'active listing',
        );
        setRows(active);
        setPropsLoading(false);
      })
      .catch((err) => {
        setPropsError(err instanceof Error ? err.message : 'Failed to load properties');
        setPropsLoading(false);
      });
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.name ?? '').toLowerCase().includes(term) ||
        (r.full_address ?? '').toLowerCase().includes(term) ||
        (r.city ?? '').toLowerCase().includes(term),
    );
  }, [rows, search]);

  // ─── Notes ────────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<ActiveListingNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [filterProperty, setFilterProperty] = useState('all');
  const notesBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const subscription = client.models.ActiveListingNote.observeQuery({
      filter:
        filterProperty !== 'all'
          ? { propertyAddress: { eq: filterProperty } }
          : undefined,
    }).subscribe({
      next: ({ items }) => {
        const sorted = [...items].sort(
          (a, b) =>
            new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
        );
        setNotes(sorted);
        setNotesLoading(false);
      },
      error: (err) => {
        console.error('[ActiveListing] notes observeQuery error:', err);
        setNotesError('Failed to load notes. Please refresh.');
        setNotesLoading(false);
      },
    });
    return () => subscription.unsubscribe();
  }, [filterProperty]);

  useEffect(() => {
    notesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    const text = noteInput.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError('');
    const property = filterProperty !== 'all' ? filterProperty : undefined;
    try {
      const { errors } = await client.models.ActiveListingNote.create({
        content: text,
        ...(property ? { propertyAddress: property } : {}),
      });
      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join('; '));
      }
      setNoteInput('');
    } catch (err) {
      console.error('[ActiveListing] create note error:', err);
      setSendError('Failed to save note. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitNote(e as unknown as React.FormEvent);
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    padding: '7px 12px',
    borderRadius: 10,
    border: '1px solid rgba(236,72,153,0.20)',
    fontSize: 13,
    color: '#1a2e1a',
    background: '#fdf2f8',
    outline: 'none',
    minWidth: 0,
  };

  const propertyOptions = useMemo(
    () => rows.map((r) => r.name ?? r.full_address ?? '').filter(Boolean),
    [rows],
  );

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Active Listing</h1>
        <p className="muted">
          Properties currently listed for sale — {propsLoading ? '…' : rows.length} active{' '}
          {rows.length === 1 ? 'property' : 'properties'}.
        </p>
      </div>

      {/* ── Properties List ───────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Search properties…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: '1 1 200px', background: '#f0f7f1', border: '1px solid rgba(26,122,60,0.15)' }}
          />
          {!propsLoading && !propsError && rows.length > 0 && (
            <span style={{ fontSize: 12, color: '#5a7060', marginLeft: 'auto' }}>
              {filteredRows.length !== rows.length
                ? `${filteredRows.length} of ${rows.length} properties`
                : `${rows.length} properties`}
            </span>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {propsLoading && (
            <div style={{ padding: 32, textAlign: 'center', color: '#5a7060' }}>
              Loading active listings…
            </div>
          )}
          {propsError && (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(239,68,68,0.85)' }}>
              Error: {propsError}
            </div>
          )}
          {!propsLoading && !propsError && rows.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#5a7060' }}>
              No active listing properties found.
            </div>
          )}
          {!propsLoading && !propsError && rows.length > 0 && filteredRows.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#5a7060' }}>
              No properties match the search.
            </div>
          )}
          {!propsLoading && !propsError && filteredRows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Property', 'City / State', 'Type', 'Beds', 'Baths', 'Sq Ft', 'Year Built'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: ['Beds', 'Baths', 'Sq Ft', 'Year Built'].includes(h)
                              ? 'right'
                              : 'left',
                            padding: '10px 12px',
                            color: ACCENT_COLOR,
                            fontWeight: 600,
                            fontSize: 12,
                            letterSpacing: '0.03em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={row.project_uuid ?? idx}
                      style={{ borderBottom: '1px solid #fce7f3' }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 500, fontSize: 14 }}>
                        {row.name ?? row.full_address ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 13 }}>
                        {row.city ?? '—'}
                        {row.state ? `, ${row.state}` : ''}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>{row.type ?? '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>
                        {row.beds ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>
                        {row.baths ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>
                        {row.square_feet ? Number(row.square_feet).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>
                        {row.year_built ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Notes Section ─────────────────────────────────────────────────────── */}
      <section>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: ACCENT_COLOR,
            marginBottom: 10,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Notes
        </h2>

        {/* Optional property filter for notes */}
        {propertyOptions.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              style={{ ...inputStyle, minWidth: 240 }}
            >
              <option value="all">All Properties</option>
              {propertyOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Notes list */}
          <div
            style={{
              maxHeight: 320,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {notesLoading && (
              <p className="muted" style={{ fontSize: 13 }}>
                Loading notes…
              </p>
            )}
            {notesError && (
              <p style={{ color: '#dc2626', fontSize: 13 }}>{notesError}</p>
            )}
            {!notesLoading && !notesError && notes.length === 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                No notes yet. Add one below.
              </p>
            )}
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: '#fdf2f8',
                  border: '1px solid rgba(236,72,153,0.15)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <p style={{ margin: '0 0 6px', fontSize: 14, color: '#1a2e1a', whiteSpace: 'pre-wrap' }}>
                  {note.content}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#9d174d', fontWeight: 500 }}>
                    🕐 {formatDateTime(note.createdAt)}
                  </span>
                  {note.propertyAddress && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#be185d',
                        background: 'rgba(236,72,153,0.10)',
                        borderRadius: 6,
                        padding: '1px 6px',
                      }}
                    >
                      📍 {note.propertyAddress}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={notesBottomRef} />
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(236,72,153,0.12)' }} />

          {/* Note input */}
          <form onSubmit={submitNote} style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
            <textarea
              rows={2}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              placeholder="Add a note… (Enter to save, Shift+Enter for new line)"
              disabled={sending}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(236,72,153,0.20)',
                fontSize: 13,
                color: '#1a2e1a',
                background: '#fdf2f8',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={sending || !noteInput.trim()}
              style={{
                alignSelf: 'flex-end',
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                background: ACCENT_COLOR,
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: sending || !noteInput.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !noteInput.trim() ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {sending ? '…' : 'Save Note'}
            </button>
          </form>
          {sendError && (
            <p style={{ margin: '0 16px 10px', color: '#dc2626', fontSize: 12 }}>{sendError}</p>
          )}
        </div>
      </section>
    </>
  );
}

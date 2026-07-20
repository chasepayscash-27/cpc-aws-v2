import './ActiveListingPage.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { loadCsv } from '../utils/csv';
import type { ProjectRow } from '../types/project';
import type { Schema } from '../../amplify/data/resource';
import PropertyMainImage from '../components/PropertyMainImage';
import {
  getActiveListingPropertyKey,
  getActiveListingPropertyLabel,
} from './activeListingProperty';

type ActiveListingNote = Schema['ActiveListingNote']['type'];

const client = generateClient<Schema>();

type SortField = 'name' | 'city' | 'type' | 'beds';
type SortDir = 'asc' | 'desc';

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

function toSortKey(row: ProjectRow, field: SortField): string {
  switch (field) {
    case 'city': return (row.city ?? '').toLowerCase();
    case 'type': return (row.type ?? '').toLowerCase();
    case 'beds': return String(Number(row.beds) || 0).padStart(3, '0');
    default: return getActiveListingPropertyLabel(row).toLowerCase();
  }
}

export default function ActiveListingPage() {
  // ─── Properties ───────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [propsLoading, setPropsLoading] = useState(true);
  const [propsError, setPropsError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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
    const filtered = term
      ? rows.filter(
          (r) =>
            (r.name ?? '').toLowerCase().includes(term) ||
            (r.full_address ?? '').toLowerCase().includes(term) ||
            (r.city ?? '').toLowerCase().includes(term),
        )
      : rows;
    return [...filtered].sort((a, b) => {
      const ka = toSortKey(a, sortField);
      const kb = toSortKey(b, sortField);
      const cmp = ka.localeCompare(kb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, sortField, sortDir]);

  // ─── Notes ────────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<ActiveListingNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [selectedPropertyKey, setSelectedPropertyKey] = useState('');
  const notesBottomRef = useRef<HTMLDivElement>(null);
  const notesPanelRef = useRef<HTMLElement>(null);

  const selectedProperty = useMemo(
    () =>
      rows.find((row, index) => getActiveListingPropertyKey(row, index) === selectedPropertyKey) ??
      null,
    [rows, selectedPropertyKey],
  );
  const selectedPropertyLabel = selectedProperty
    ? getActiveListingPropertyLabel(selectedProperty)
    : '';

  useEffect(() => {
    if (selectedPropertyKey && !selectedProperty) {
      setSelectedPropertyKey('');
    }
  }, [selectedProperty, selectedPropertyKey]);

  useEffect(() => {
    if (!selectedPropertyLabel) {
      setNotes([]);
      setNotesLoading(false);
      setNotesError('');
      return;
    }

    setNotesLoading(true);
    setNotesError('');
    const subscription = client.models.ActiveListingNote.observeQuery({
      filter: { propertyAddress: { eq: selectedPropertyLabel } },
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
  }, [selectedPropertyLabel]);

  useEffect(() => {
    notesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  useEffect(() => {
    setNoteInput('');
    setSendError('');
    if (selectedPropertyKey) {
      // Scroll notes panel into view on mobile after card selection
      setTimeout(() => {
        notesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }, [selectedPropertyKey]);

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    const text = noteInput.trim();
    if (!text || sending || !selectedPropertyLabel) return;
    setSending(true);
    setSendError('');
    try {
      const { errors } = await client.models.ActiveListingNote.create({
        content: text,
        propertyAddress: selectedPropertyLabel,
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

  function handleCardSelect(key: string) {
    setSelectedPropertyKey((prev) => (prev === key ? '' : key));
  }

  function toggleSortDir() {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="pageHeader">
        <h1 className="h1">Active Listings</h1>
        <p className="muted">
          Properties currently listed for sale
          {!propsLoading && ` — ${rows.length} active ${rows.length === 1 ? 'property' : 'properties'}`}
          {propsLoading && ' — loading…'}
        </p>
      </div>

      {/* ── Toolbar: Search + Sort ───────────────────────────────────────────── */}
      <div className="alToolbar" role="search">
        <div className="alSearchWrap">
          <span className="alSearchIcon" aria-hidden="true">🔍</span>
          <input
            type="search"
            className="alSearchInput"
            placeholder="Search by address, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search active listings"
          />
        </div>

        <div className="alSortWrap">
          <span className="alSortLabel">Sort:</span>
          <select
            className="alSortSelect"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            aria-label="Sort field"
          >
            <option value="name">Address</option>
            <option value="city">City</option>
            <option value="type">Type</option>
            <option value="beds">Beds</option>
          </select>
          <button
            type="button"
            className="alSortDirBtn"
            onClick={toggleSortDir}
            aria-label={sortDir === 'asc' ? 'Sort ascending — click for descending' : 'Sort descending — click for ascending'}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {!propsLoading && !propsError && rows.length > 0 && (
          <span className="alCount" aria-live="polite">
            {filteredRows.length !== rows.length
              ? `${filteredRows.length} of ${rows.length}`
              : `${rows.length} ${rows.length === 1 ? 'property' : 'properties'}`}
          </span>
        )}
      </div>

      {/* ── Card Grid ───────────────────────────────────────────────────────── */}
      <section aria-label="Active listing properties" style={{ marginBottom: 24 }}>
        {propsLoading && (
          <div className="alStateBox">
            <div className="alStateIcon">🏠</div>
            <p className="alStateTitle">Loading listings…</p>
            <p className="alStateDesc">Fetching your active properties.</p>
          </div>
        )}

        {propsError && (
          <div className="alStateBox">
            <div className="alStateIcon">⚠️</div>
            <p className="alStateTitle">Could not load listings</p>
            <p className="alStateDesc">{propsError}</p>
          </div>
        )}

        {!propsLoading && !propsError && rows.length === 0 && (
          <div className="alStateBox">
            <div className="alStateIcon">🏡</div>
            <p className="alStateTitle">No active listings</p>
            <p className="alStateDesc">There are currently no properties at the Active Listing stage.</p>
          </div>
        )}

        {!propsLoading && !propsError && rows.length > 0 && filteredRows.length === 0 && (
          <div className="alStateBox">
            <div className="alStateIcon">🔍</div>
            <p className="alStateTitle">No results found</p>
            <p className="alStateDesc">Try a different search term.</p>
          </div>
        )}

        {!propsLoading && !propsError && filteredRows.length > 0 && (
          <div className="alGrid">
            {filteredRows.map((row, idx) => {
              const propertyKey = getActiveListingPropertyKey(row, idx);
              const propertyLabel = getActiveListingPropertyLabel(row);
              const isSelected = propertyKey === selectedPropertyKey;
              const location = [row.city, row.state].filter(Boolean).join(', ');
              const sqFt = row.square_feet && !isNaN(Number(row.square_feet))
                ? Number(row.square_feet).toLocaleString()
                : '—';

              return (
                <article
                  key={propertyKey}
                  className={`alCard${isSelected ? ' selected' : ''}`}
                  onClick={() => handleCardSelect(propertyKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardSelect(propertyKey);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${propertyLabel}${location ? `, ${location}` : ''} — click to ${isSelected ? 'deselect and close notes' : 'select and view notes'}`}
                >
                  {/* Image / Placeholder */}
                  <div className="alCardImg">
                    <PropertyMainImage
                      key={row.featured_image_url ?? `active-listing-placeholder-${propertyKey}`}
                      imageUrl={row.featured_image_url}
                      alt={propertyLabel}
                      className="alCardImgEl"
                      placeholder={<div className="alCardImgPlaceholder" aria-hidden="true">🏠</div>}
                    />

                    {/* Active Listing badge */}
                    <span className="alStatusBadge">
                      <span className="alStatusDot" aria-hidden="true" />
                      Active Listing
                    </span>

                    {/* Selected indicator */}
                    {isSelected && (
                      <span className="alSelectedBadge" aria-hidden="true">✓ Selected</span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="alCardBody">
                    <h3 className="alCardName" title={propertyLabel}>{propertyLabel}</h3>

                    {location && (
                      <div className="alCardLocation">
                        <span className="alCardLocationIcon" aria-hidden="true">📍</span>
                        {location}
                      </div>
                    )}

                    {/* Type / strategy chips */}
                    {(row.type || row.investment_strategy) && (
                      <div className="alCardBadges">
                        {row.type && (
                          <span className="alTypeBadge">{row.type}</span>
                        )}
                        {row.investment_strategy && (
                          <span className="alStrategyBadge">
                            {row.investment_strategy.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="alCardStats">
                      <div className="alCardStat">
                        <span className="alCardStatLabel">Beds</span>
                        <span className="alCardStatValue">{row.beds ?? '—'}</span>
                      </div>
                      <div className="alCardStat">
                        <span className="alCardStatLabel">Baths</span>
                        <span className="alCardStatValue">{row.baths ?? '—'}</span>
                      </div>
                      <div className="alCardStat">
                        <span className="alCardStatLabel">Sq Ft</span>
                        <span className="alCardStatValue">{sqFt}</span>
                      </div>
                      <div className="alCardStat">
                        <span className="alCardStatLabel">Built</span>
                        <span className="alCardStatValue">{row.year_built ?? '—'}</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <button
                      type="button"
                      className="alViewNotesBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardSelect(propertyKey);
                      }}
                      aria-expanded={isSelected}
                      tabIndex={-1}
                    >
                      {isSelected ? '✕ Close Notes' : '📝 View Notes'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Notes Panel ─────────────────────────────────────────────────────── */}
      <section ref={notesPanelRef} aria-label="Property notes">
        <div className="alNotesLabel">
          <span className="alNotesLabelText">📝 Notes</span>
        </div>
        <p className="alNotesLabelHint muted">
          {selectedPropertyLabel
            ? `Showing notes for ${selectedPropertyLabel}.`
            : 'Select a listing card above to view or add notes.'}
        </p>

        <div className="alNotesPanel">
          {!selectedPropertyLabel ? (
            <div className="alNotesPrompt">
              <div className="alNotesPromptIcon" aria-hidden="true">🏠</div>
              <p className="alNotesPromptText">
                Click a property card above to open its notes.
              </p>
            </div>
          ) : (
            <>
              {/* Panel header */}
              <div className="alNotesPanelHeader">
                <div className="alNotesPanelIcon" aria-hidden="true">📋</div>
                <div>
                  <p className="alNotesPanelTitle">{selectedPropertyLabel}</p>
                  {selectedProperty && (selectedProperty.city || selectedProperty.state) && (
                    <p className="alNotesPanelSub">
                      {[selectedProperty.city, selectedProperty.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes list */}
              <div className="alNotesList" role="log" aria-label="Notes list" aria-live="polite">
                {notesLoading && (
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>Loading notes…</p>
                )}
                {notesError && (
                  <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{notesError}</p>
                )}
                {!notesLoading && !notesError && notes.length === 0 && (
                  <div className="alNoteEmpty">
                    <div className="alNoteEmptyIcon" aria-hidden="true">✏️</div>
                    <p className="alNoteEmptyText">No notes yet — add the first one below.</p>
                  </div>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="alNoteItem">
                    <p className="alNoteContent">{note.content}</p>
                    <div className="alNoteMeta">
                      <span className="alNoteTime">🕐 {formatDateTime(note.createdAt)}</span>
                    </div>
                  </div>
                ))}
                <div ref={notesBottomRef} />
              </div>

              <div className="alNotesDivider" role="separator" />

              {/* Input form */}
              <form onSubmit={submitNote} className="alNotesForm">
                <textarea
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  placeholder={`Add a note… (Enter to save, Shift+Enter for new line)`}
                  disabled={sending}
                  className="alNotesTextarea"
                  aria-label={`Note for ${selectedPropertyLabel}`}
                />
                <button
                  type="submit"
                  disabled={sending || !noteInput.trim() || !selectedPropertyLabel}
                  className="alNotesSendBtn"
                >
                  {sending ? '…' : 'Save'}
                </button>
              </form>

              {sendError && (
                <p className="alNotesSendError" role="alert">{sendError}</p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

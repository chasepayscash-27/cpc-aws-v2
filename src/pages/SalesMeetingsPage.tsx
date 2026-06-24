import { useEffect, useState } from 'react';
import salesMeetingIndex, { type SalesMeetingEntry } from '../data/salesMeetingIndex';
import '../App.css';

/**
 * Minimal markdown-to-HTML renderer covering the subset of markdown used in
 * meeting notes (headings, bold, horizontal rules, tables, lists, and links).
 * A full markdown library is deliberately avoided to keep the bundle small.
 */
function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inTable = false;
  let tableHeaderDone = false;

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inlineFormat = (s: string): string => {
    // Bold **text** or __text__
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic *text* or _text_
    s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Inline code `code`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // Detect table rows (contain at least one |)
    const isTableRow = /^\|.+\|/.test(line);
    const isSeparatorRow = /^\|[\s|:-]+\|$/.test(line);

    if (isTableRow && !isSeparatorRow) {
      if (!inTable) {
        out.push('<div class="smTable"><table>');
        inTable = true;
        tableHeaderDone = false;
      }
      const cells = line
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => escapeHtml(c.trim()));
      const tag = tableHeaderDone ? 'td' : 'th';
      out.push(`<tr>${cells.map((c) => `<${tag}>${inlineFormat(c)}</${tag}>`).join('')}</tr>`);
      if (!tableHeaderDone) tableHeaderDone = true;
      continue;
    }

    // Separator row — skip (marks end of header, already handled above)
    if (isSeparatorRow) {
      continue;
    }

    // Close table when we leave table rows
    if (inTable) {
      out.push('</table></div>');
      inTable = false;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    if (h3) { out.push(`<h3 class="smH3">${inlineFormat(escapeHtml(h3[1]))}</h3>`); continue; }
    const h2 = line.match(/^## (.+)/);
    if (h2) { out.push(`<h2 class="smH2">${inlineFormat(escapeHtml(h2[1]))}</h2>`); continue; }
    const h1 = line.match(/^# (.+)/);
    if (h1) { out.push(`<h1 class="smH1">${inlineFormat(escapeHtml(h1[1]))}</h1>`); continue; }

    // Horizontal rule
    if (/^---+$/.test(line)) { out.push('<hr class="smHr" />'); continue; }

    // Unordered list item
    if (/^[-*] /.test(line)) {
      out.push(`<li class="smLi">${inlineFormat(escapeHtml(line.replace(/^[-*] /, '')))}</li>`);
      continue;
    }

    // Blank line
    if (line === '') { out.push('<br />'); continue; }

    // Default paragraph
    out.push(`<p class="smP">${inlineFormat(escapeHtml(line))}</p>`);
  }

  if (inTable) out.push('</table></div>');
  return out.join('\n');
}

/**
 * Fetches and renders a single meeting note file.
 * Extracted into its own component so `loading` can be initialised to `true`
 * on mount and only transitioned to `false` inside async callbacks — avoiding
 * a synchronous setState call at the top of a useEffect body.
 * The parent passes a `key` equal to the filename so React remounts this
 * component (and resets its state) whenever the user picks a different meeting.
 */
function MeetingContent({ entry }: { entry: SalesMeetingEntry }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/data/${entry.filename}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load notes (HTTP ${res.status})`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load meeting notes.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entry.filename]);

  if (loading) return <p className="muted">Loading notes…</p>;
  if (error)   return <p className="muted">{error}</p>;
  return (
    <article
      className="smArticle"
      /* dangerouslySetInnerHTML is safe here: content is rendered from
         trusted static files served from our own public/data directory. */
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

export default function SalesMeetingsPage() {
  // Default to the newest entry (index 0 — array is newest-first)
  const [selected, setSelected] = useState<SalesMeetingEntry>(salesMeetingIndex[0]);

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">📋 Sales Meetings</h1>
        <p className="muted">Monday morning sales meeting notes — newest first.</p>
      </div>

      <div className="smLayout">
        {/* Sidebar: list of meetings */}
        <aside className="smSidebar">
          <div className="smSidebarTitle">All Meetings</div>
          <ul className="smMeetingList">
            {salesMeetingIndex.map((entry) => (
              <li key={entry.filename}>
                <button
                  type="button"
                  className={`smMeetingBtn${selected.filename === entry.filename ? ' active' : ''}`}
                  onClick={() => setSelected(entry)}
                >
                  <span className="smMeetingDate">{entry.date}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main: note content — key remounts MeetingContent on selection change */}
        <section className="smContent card">
          <MeetingContent key={selected.filename} entry={selected} />
        </section>
      </div>

      <style>{`
        .smLayout {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 14px;
          align-items: start;
        }

        @media (max-width: 980px) {
          .smLayout { grid-template-columns: 1fr; }
        }

        .smSidebar {
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 10px;
          position: sticky;
          top: 86px;
        }

        .smSidebarTitle {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          padding: 0 6px 8px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 8px;
        }

        .smMeetingList {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .smMeetingBtn {
          all: unset;
          display: block;
          width: 100%;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .smMeetingBtn:hover {
          background: rgba(26, 122, 60, 0.08);
          border-color: rgba(26, 122, 60, 0.20);
        }

        .smMeetingBtn.active {
          background: rgba(26, 122, 60, 0.12);
          border-color: var(--accent);
        }

        .smMeetingDate {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }

        .smMeetingBtn.active .smMeetingDate {
          color: var(--accent);
        }

        .smContent {
          min-height: 400px;
        }

        /* Article typography */
        .smArticle { line-height: 1.7; color: var(--text); }

        .smH1 { font-size: 22px; font-weight: 800; color: var(--accent); margin: 0 0 6px; }
        .smH2 {
          font-size: 17px; font-weight: 700; color: var(--accent);
          margin: 20px 0 8px; padding-bottom: 4px;
          border-bottom: 1px solid var(--border);
        }
        .smH3 { font-size: 15px; font-weight: 700; color: var(--text); margin: 14px 0 6px; }

        .smP { margin: 4px 0; font-size: 14px; }
        .smHr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
        .smLi { font-size: 14px; margin: 3px 0 3px 18px; list-style-type: disc; }

        .smTable { overflow-x: auto; margin: 10px 0; }
        .smTable table {
          border-collapse: collapse;
          width: 100%;
          font-size: 13px;
        }
        .smTable th, .smTable td {
          border: 1px solid var(--border);
          padding: 7px 12px;
          text-align: left;
        }
        .smTable th {
          background: rgba(26, 122, 60, 0.08);
          font-weight: 700;
          color: var(--accent);
        }
        .smTable tr:nth-child(even) td { background: rgba(26, 122, 60, 0.03); }

        .smArticle code {
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 13px;
          font-family: ui-monospace, monospace;
        }

        .smArticle a {
          color: var(--accent);
          text-decoration: underline;
        }

        .smArticle strong { font-weight: 700; }
        .smArticle em { font-style: italic; }
      `}</style>
    </>
  );
}

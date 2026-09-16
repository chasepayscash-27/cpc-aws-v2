import { type ChangeEvent, useEffect, useId, useState } from 'react';
import { getUrl, list, uploadData } from 'aws-amplify/storage';
import outputs from '../../amplify/amplify_outputs.json';
import salesMeetingIndex, { type SalesMeetingEntry } from '../data/salesMeetingIndex';
import '../App.css';

const VOICE_MEMO_PREFIX = 'sales-meetings/voice-memos/';
const AUDIO_ACCEPT = 'audio/*,.m4a,.mp3,.wav,.aac,.ogg,.webm';
const hasStorageConfig = typeof outputs === 'object' && outputs !== null && 'storage' in outputs;

interface VoiceMemoItem {
  path: string;
  displayName: string;
  size?: number;
  uploadedAt?: string;
  url: string;
}

function sanitizeFilename(filename: string): string {
  const sanitized = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return sanitized || 'voice-memo';
}

function formatVoiceMemoName(path: string): string {
  const filename = path.split('/').pop() ?? path;
  return filename.replace(/^\d+-[0-9a-f-]+-/, '');
}

function formatFileSize(size?: number): string {
  if (!size || size < 1024) return `${size ?? 0} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(uploadedAt?: string): string {
  if (!uploadedAt) return 'Upload date unavailable';
  return new Date(uploadedAt).toLocaleString();
}

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

function VoiceMemoPanel() {
  const inputId = useId();
  const [voiceMemos, setVoiceMemos] = useState<VoiceMemoItem[]>([]);
  const [isLoading, setIsLoading] = useState(hasStorageConfig);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadVoiceMemos() {
    if (!hasStorageConfig) return;
    setIsLoading(true);
    setError('');
    try {
      const listed = await list({ path: VOICE_MEMO_PREFIX });
      const files = (listed as {
        files?: Array<{ path: string; size?: number; lastModified?: Date }>;
      }).files ?? [];
      const sortedFiles = [...files].sort(
        (a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0),
      );
      const resolved = await Promise.all(
        sortedFiles.map(async (file) => {
          const { url } = await getUrl({ path: file.path });
          return {
            path: file.path,
            displayName: formatVoiceMemoName(file.path),
            size: file.size,
            uploadedAt: file.lastModified?.toISOString(),
            url: url.toString(),
          };
        }),
      );
      setVoiceMemos(resolved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load voice memos.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadVoiceMemos();
  }, []);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setError('');
    setNotice('');
    setIsUploading(true);
    try {
      await Promise.all(
        Array.from(files).map((file) =>
          uploadData({
            path: `${VOICE_MEMO_PREFIX}${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(file.name)}`,
            data: file,
            options: {
              contentType: file.type || 'application/octet-stream',
            },
          }).result,
        ),
      );
      setNotice(`${files.length} voice memo${files.length === 1 ? '' : 's'} uploaded.`);
      await loadVoiceMemos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to upload voice memo.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }

  return (
    <section className="smVoiceCard card">
      <div className="smVoiceHeader">
        <div>
          <h2 className="smVoiceTitle">Voice Memos</h2>
          <p className="muted smVoiceSubtitle">Upload recordings here instead of manually adding files to the repo.</p>
        </div>
        <label
          className={`smUploadBtn${!hasStorageConfig || isUploading ? ' disabled' : ''}`}
          htmlFor={inputId}
          aria-disabled={!hasStorageConfig || isUploading}
        >
          {isUploading ? 'Uploading…' : 'Upload Voice Memo'}
        </label>
        <input
          id={inputId}
          type="file"
          accept={AUDIO_ACCEPT}
          multiple
          className="smFileInput"
          onChange={(event) => void handleUpload(event)}
          disabled={!hasStorageConfig || isUploading}
        />
      </div>

      {!hasStorageConfig && (
        <p className="muted smVoiceState">
          Voice memo uploads will activate after the next Amplify backend deploy refreshes storage outputs.
        </p>
      )}
      {error && <p className="smVoiceError">{error}</p>}
      {notice && <p className="smVoiceNotice">{notice}</p>}
      {isLoading && <p className="muted smVoiceState">Loading voice memos…</p>}
      {!isLoading && hasStorageConfig && voiceMemos.length === 0 && (
        <p className="muted smVoiceState">No voice memos uploaded yet.</p>
      )}

      {!isLoading && voiceMemos.length > 0 && (
        <div className="smVoiceList">
          {voiceMemos.map((memo) => (
            <article key={memo.path} className="smVoiceItem">
              <div className="smVoiceMeta">
                <div className="smVoiceName">{memo.displayName}</div>
                <div className="smVoiceDetails">
                  <span>{formatUploadedAt(memo.uploadedAt)}</span>
                  <span>{formatFileSize(memo.size)}</span>
                </div>
              </div>
              <audio controls preload="none" className="smVoiceAudio">
                <source src={memo.url} />
                Your browser does not support audio playback.
              </audio>
            </article>
          ))}
        </div>
      )}
    </section>
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

      <VoiceMemoPanel />

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

        .smVoiceCard {
          margin-bottom: 14px;
        }

        .smVoiceHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .smVoiceTitle {
          margin: 0 0 4px;
          font-size: 18px;
          color: var(--accent);
        }

        .smVoiceSubtitle {
          margin: 0;
        }

        .smUploadBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid var(--accent);
          background: rgba(26, 122, 60, 0.12);
          color: var(--accent);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .smUploadBtn:hover {
          transform: translateY(-1px);
        }

        .smUploadBtn.disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .smFileInput {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .smVoiceState,
        .smVoiceError,
        .smVoiceNotice {
          margin: 12px 0 0;
          font-size: 13px;
        }

        .smVoiceError {
          color: rgba(239, 68, 68, 0.95);
        }

        .smVoiceNotice {
          color: var(--accent);
        }

        .smVoiceList {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .smVoiceItem {
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--panel2);
        }

        .smVoiceMeta {
          display: grid;
          gap: 4px;
        }

        .smVoiceName {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          word-break: break-word;
        }

        .smVoiceDetails {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 12px;
          color: var(--muted);
        }

        .smVoiceAudio {
          width: 100%;
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

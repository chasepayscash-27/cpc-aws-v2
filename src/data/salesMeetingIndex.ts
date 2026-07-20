/**
 * Central registry of Monday sales meeting note files.
 *
 * To add a new meeting note:
 *   1. Drop the file in public/data/ (e.g. sales_meeting_summary_06302026.md)
 *   2. Add a new entry at the TOP of this array (newest first).
 *
 * The `filename` field is the bare file name inside public/data/.
 * The page fetches it at runtime via /data/<filename>.
 */
export interface SalesMeetingEntry {
  /** File name (including extension) inside public/data/. */
  filename: string;
  /** Human-readable date label shown in the sidebar. */
  date: string;
  /** Short title shown in the sidebar and as the page heading. */
  title: string;
}

const salesMeetingIndex: SalesMeetingEntry[] = [
  {
    filename: 'sales_meeting_summary_07202026.md',
    date: 'July 20, 2026',
    title: 'Sales & Property Operations Meeting — July 20, 2026',
  },
  {
    filename: 'sales_meeting_summary_06222026.md',
    date: 'June 22, 2026',
    title: 'Monday Sales Meeting — June 22, 2026',
  },
];

export default salesMeetingIndex;

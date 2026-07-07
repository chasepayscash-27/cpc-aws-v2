import { getProgressColorTier, getProgressColors } from "../utils/workflowProgress";

interface Props {
  /** 0–100 progress percentage. */
  percent: number;
  /** Property name shown in the aria-label for screen readers. */
  propertyName?: string;
  /** When true, renders a neutral loading state instead of a colored badge. */
  loading?: boolean;
}

/**
 * ProgressStatusBadge — a compact, color-coded percent-complete indicator.
 *
 * Color tiers (see `PROGRESS_THRESHOLDS` in workflowProgress.ts):
 *   - Red    0–33%  : low progress
 *   - Yellow 34–66% : in-progress
 *   - Green  67–100%: near/fully complete
 *
 * Accessibility:
 *   - The numeric percentage is always visible (non-color cue).
 *   - `aria-label` describes both property name and progress for screen readers.
 *   - Colors are chosen to satisfy WCAG AA contrast on their respective
 *     badge backgrounds.
 */
export default function ProgressStatusBadge({ percent, propertyName, loading = false }: Props) {
  if (loading) {
    return (
      <span
        aria-label="Loading workflow progress"
        style={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 6px",
          borderRadius: 999,
          background: "#f3f4f6",
          color: "#6b7280",
          border: "1px solid #e5e7eb",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        —%
      </span>
    );
  }

  const tier = getProgressColorTier(percent);
  const { background, color, border } = getProgressColors(tier);
  const label = propertyName
    ? `${propertyName}: ${percent}% of main workflow complete`
    : `${percent}% of main workflow complete`;

  return (
    <span
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 999,
        background,
        color,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {percent}%
    </span>
  );
}

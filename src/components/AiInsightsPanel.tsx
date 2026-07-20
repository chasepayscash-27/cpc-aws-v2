import { useMemo, useState } from "react";
import outputs from "../../amplify/amplify_outputs.json";

const HTTP_API_URL =
  (outputs as { custom?: { cpcHttpApi?: { url?: string } } })?.custom?.cpcHttpApi?.url ?? "";
const CHAT_ENDPOINT = HTTP_API_URL ? `${HTTP_API_URL.replace(/\/?$/, "/")}chat` : "";
const MAX_AI_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as { error?: unknown; detail?: unknown };
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    if (typeof record.detail === "string" && record.detail.trim()) return record.detail;
  }
  return fallback;
}

export interface PropertyData {
  sold_year: number;
  property_id: number;
  property_address: string;
  closed_date_dt: string;
  status: string;
  sold_amount_num: number;
  purchase_price_num: number;
  rehab_amount_num: number;
  gross_profit_num: number;
  days_on_market_num: number;
  lead_source: string;
  agent: string;
}

interface Props {
  properties?: PropertyData[] | null;
}

export function AiInsightsPanel({ properties }: Props) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const safeProperties = useMemo(
    () => (Array.isArray(properties) ? properties : []),
    [properties]
  );

  const metrics = useMemo(() => {
    try {
      const n = safeProperties.length;
      if (n === 0) return null;

      const totalRevenue = safeProperties.reduce(
        (acc, p) => acc + (p.sold_amount_num || 0),
        0
      );
      const totalProfit = safeProperties.reduce(
        (acc, p) => acc + (p.gross_profit_num || 0),
        0
      );
      const totalRehab = safeProperties.reduce(
        (acc, p) => acc + (p.rehab_amount_num || 0),
        0
      );
      const avgDaysOnMarket = Math.round(
        safeProperties.reduce((acc, p) => acc + (p.days_on_market_num || 0), 0) / n
      );
      const avgProfit = Math.round(totalProfit / n);

      const leadCounts: Record<string, number> = {};
      for (const p of safeProperties) {
        const key = p.lead_source || "Unknown";
        leadCounts[key] = (leadCounts[key] || 0) + 1;
      }
      const topLeadSources = Object.entries(leadCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source, count]) => ({ source, count }));

      const agentProfits: Record<string, number> = {};
      for (const p of safeProperties) {
        if (p.agent) {
          agentProfits[p.agent] = (agentProfits[p.agent] || 0) + (p.gross_profit_num || 0);
        }
      }
      const topAgents = Object.entries(agentProfits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([agent, profit]) => ({ agent, profit }));

      return {
        count: n,
        totalRevenue,
        totalProfit,
        totalRehab,
        avgDaysOnMarket,
        avgProfit,
        topLeadSources,
        topAgents,
      };
    } catch (err) {
      console.error("[AiInsightsPanel] Failed to calculate metrics:", err);
      return null;
    }
  }, [safeProperties]);

  async function generate() {
    if (!metrics) return;
    setLoading(true);
    setOutput("");
    setError("");
    try {
      if (!CHAT_ENDPOINT) {
        setError("AI Insights endpoint is unavailable. Please try again later.");
        return;
      }

      const prompt = `
You are an analytics assistant for a real estate investment business called Chase Pays Cash.
Given the following portfolio metrics, provide:
1) A 3-5 sentence executive summary of business performance
2) 5 actionable bullet insights
3) 3 risks or anomalies to investigate

Metrics:
${JSON.stringify(metrics, null, 2)}
`.trim();

      for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt += 1) {
        const isLastAttempt = attempt === MAX_AI_RETRIES - 1;

        const res = await fetch(CHAT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt }),
        });
        let json: unknown = null;
        try {
          json = await res.json();
        } catch {
          json = null;
        }
        const jsonObject =
          json && typeof json === "object"
            ? (json as { reply?: unknown; error?: unknown; detail?: unknown })
            : null;

        if (!res.ok) {
          const isRetryable = res.status === 429 || res.status >= 500;

          if (isRetryable && !isLastAttempt) {
            const retryDelayMs = (res.status === 429 ? 1500 : 2000) * 2 ** attempt;
            console.warn(
              `[AiInsightsPanel] Retrying AI request in ${retryDelayMs}ms after ${res.status}.`
            );
            await delay(retryDelayMs);
            continue;
          }

          setError(getErrorMessage(jsonObject, `AI request failed (${res.status}). Please try again.`));
          return;
        }

        if (!jsonObject) {
          setError("AI response was invalid. Please try again.");
          return;
        }

        const reply =
          typeof jsonObject.reply === "string"
            ? (jsonObject.reply || "No insights returned.")
            : "No insights returned.";
        setOutput(reply);
        return;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        marginTop: "24px",
        borderTop: "3px solid var(--accent)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div>
          <div className="cardLabel">🤖 AI Insights</div>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
            Generate a narrative summary and actionable insights from your
            current portfolio data.
          </p>
        </div>
        <button
          className="btnPrimary"
          onClick={generate}
          disabled={loading || !metrics || !CHAT_ENDPOINT}
          style={{ whiteSpace: "nowrap" }}
        >
          {loading ? "Thinking…" : "✨ Generate Insights"}
        </button>
      </div>

      {!CHAT_ENDPOINT && (
        <div style={{ marginTop: "8px" }}>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            AI Insights are temporarily unavailable.
          </p>
        </div>
      )}

      {error && (
        <div style={{ marginTop: "8px" }}>
          <p style={{ color: "var(--danger)", fontSize: "13px", margin: "0 0 6px" }}>
            {error}
          </p>
        </div>
      )}

      {output && !loading && (
        <div
          style={{
            marginTop: "12px",
            padding: "16px",
            background: "var(--panel2)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "var(--text)",
            whiteSpace: "pre-wrap",
          }}
        >
          {output}
        </div>
      )}

      {loading && (
        <div
          style={{
            marginTop: "12px",
            padding: "16px",
            background: "var(--panel2)",
            borderRadius: "12px",
            border: "1px dashed var(--border)",
            fontSize: "14px",
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          Claude is analysing your portfolio data…
        </div>
      )}
    </div>
  );
}

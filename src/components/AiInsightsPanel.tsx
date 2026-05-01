import { useMemo, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import outputs from "../../amplify/amplify_outputs.json";
import { parseAmplifyErrors, formatCaughtError } from "../utils/amplifyErrors";

// Deployment region — surfaced in error messages so the user knows which
// AWS Console region to check for Bedrock model access.
const DEPLOYMENT_REGION: string | undefined =
  (outputs as { data?: { aws_region?: string } })?.data?.aws_region;

const client = generateClient<Schema>({ authMode: "apiKey" });

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
  properties: PropertyData[];
}

export function AiInsightsPanel({ properties }: Props) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isModelAccessError, setIsModelAccessError] = useState(false);

  const metrics = useMemo(() => {
    const n = properties.length;
    if (n === 0) return null;

    const totalRevenue = properties.reduce(
      (acc, p) => acc + (p.sold_amount_num || 0),
      0
    );
    const totalProfit = properties.reduce(
      (acc, p) => acc + (p.gross_profit_num || 0),
      0
    );
    const totalRehab = properties.reduce(
      (acc, p) => acc + (p.rehab_amount_num || 0),
      0
    );
    const avgDaysOnMarket = Math.round(
      properties.reduce((acc, p) => acc + (p.days_on_market_num || 0), 0) / n
    );
    const avgProfit = Math.round(totalProfit / n);

    const leadCounts: Record<string, number> = {};
    for (const p of properties) {
      const key = p.lead_source || "Unknown";
      leadCounts[key] = (leadCounts[key] || 0) + 1;
    }
    const topLeadSources = Object.entries(leadCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    const agentProfits: Record<string, number> = {};
    for (const p of properties) {
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
  }, [properties]);

  async function generate() {
    if (!metrics) return;
    setLoading(true);
    setOutput("");
    setError("");
    setIsModelAccessError(false);
    try {
      if (typeof client.generations?.generateRecipe !== "function") {
        console.error(
          "[AiInsightsPanel] client.generations.generateRecipe is not available. " +
            "Ensure Amplify outputs are up-to-date and include the generateRecipe generation route."
        );
        throw new Error(
          "AI Insights are not available right now. Please try again later or contact support."
        );
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

      const { data, errors } = await client.generations.generateRecipe({
        description: prompt,
      });

      if (errors?.length) {
        const parsed = parseAmplifyErrors("AiInsightsPanel", errors, DEPLOYMENT_REGION);
        setIsModelAccessError(parsed.isModelAccessError);
        setError(parsed.userMessage);
        return;
      }

      setOutput(data?.instructions ?? "No insights returned.");
    } catch (e: unknown) {
      const parsed = formatCaughtError("AiInsightsPanel", e, DEPLOYMENT_REGION);
      setIsModelAccessError(parsed.isModelAccessError);
      setError(parsed.userMessage);
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
          disabled={loading || !metrics}
          style={{ whiteSpace: "nowrap" }}
        >
          {loading ? "Thinking…" : "✨ Generate Insights"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: "8px" }}>
          <p style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 6px" }}>
            {error}
          </p>
          {isModelAccessError && (
            <a
              href={`https://console.aws.amazon.com/bedrock/home${DEPLOYMENT_REGION ? `?region=${DEPLOYMENT_REGION}` : ""}#/modelaccess`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ fontSize: "12px", display: "inline-block" }}
            >
              🔗 Open Bedrock Model Access
            </a>
          )}
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

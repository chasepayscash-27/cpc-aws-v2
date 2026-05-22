import { useEffect, useRef, useState } from "react";
import outputs from "../../amplify/amplify_outputs.json";
import { loadCsv } from "../utils/csv";
import type { ProjectRow } from "../types/project";

const HTTP_API_URL =
  (outputs as { custom?: { cpcHttpApi?: { url?: string } } })?.custom?.cpcHttpApi?.url ?? "";
const CHAT_ENDPOINT = HTTP_API_URL ? `${HTTP_API_URL.replace(/\/?$/, "/")}chat` : "";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface YtdCsvRow {
  "Number of Houses Sold": string;
  "YTD Sold": string;
  "YTD Profit": string;
  "Average Profit": string;
  "Houses Sold Goal": string;
  "YTD Sold Goal": string;
  "YTD Profit Goal": string;
  "Average Profit Goal": string;
  "Houses Sold % Obtained": string;
  "YTD Sold % Obtained": string;
  "YTD Profit % Obtained": string;
}

interface FinancialRecord {
  account?: string;
  property_name?: string;
  amount?: number | string;
}

interface InventoryRow {
  house?: string;
  purchase_Date?: string;
  days_in_inventory?: number | string;
}

interface PropertyFinancialSummary {
  propertyName: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  topExpenseCategories: Array<{ category: string; amount: number }>;
}

interface PortfolioContext {
  generatedAt: string;
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalTrackedProperties: number;
    totalIncome: number;
    totalExpenses: number;
    totalNetProfit: number;
    averageNetProfit: number;
    averageDaysInInventory: number;
  };
  ytd: {
    housesSold: string;
    ytdSold: string;
    ytdProfit: string;
    averageProfit: string;
    housesSoldGoal: string;
    ytdSoldGoal: string;
    ytdProfitGoal: string;
    averageProfitGoal: string;
    housesSoldPct: string;
    ytdSoldPct: string;
    ytdProfitPct: string;
  } | null;
  projects: Array<{
    name: string;
    fullAddress: string;
    city: string;
    state: string;
    stage: string;
    strategy: string;
    squareFeet: string;
    beds: string;
    baths: string;
    yearBuilt: string;
  }>;
  projectStageCounts: Array<{ stage: string; count: number }>;
  projectStrategyCounts: Array<{ strategy: string; count: number }>;
  financials: PropertyFinancialSummary[];
  topProfitableProperties: PropertyFinancialSummary[];
  topSellingProperties: PropertyFinancialSummary[];
  inventory: Array<{
    house: string;
    purchaseDate: string;
    daysInInventory: number;
  }>;
}

const MAX_AI_RETRIES = 3;

function toNumber(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%\s,]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function aggregateFinancials(records: FinancialRecord[]): PropertyFinancialSummary[] {
  const byProperty = new Map<
    string,
    {
      totalIncome: number;
      totalExpenses: number;
      expenseCategories: Map<string, number>;
      netIncomeRows: number[];
    }
  >();

  for (const record of records) {
    const propertyName = String(record.property_name ?? "").trim();
    const account = String(record.account ?? "").trim();
    const amount = toNumber(record.amount);

    if (!propertyName || !account) continue;

    const current =
      byProperty.get(propertyName) ??
      {
        totalIncome: 0,
        totalExpenses: 0,
        expenseCategories: new Map<string, number>(),
        netIncomeRows: [],
      };

    if (account === "Sale of property" || account.includes("Total for Income")) {
      current.totalIncome += amount;
    }

    const isExpense =
      account !== "Sale of property" &&
      account !== "Rehab Reimbursement" &&
      account !== "Sales (deleted)" &&
      !account.includes("Total") &&
      !account.includes("Gross Profit") &&
      !account.includes("Net Operating") &&
      !account.includes("Net Income") &&
      !account.includes("Net Other Income") &&
      !account.includes("Mortgage") &&
      !account.includes("Transfer");

    if (isExpense) {
      current.totalExpenses += amount;
      current.expenseCategories.set(
        account,
        (current.expenseCategories.get(account) ?? 0) + amount
      );
    }

    if (account === "Net Income") {
      current.netIncomeRows.push(amount);
    }

    byProperty.set(propertyName, current);
  }

  return Array.from(byProperty.entries())
    .map(([propertyName, value]) => {
      const topExpenseCategories = Array.from(value.expenseCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount }));

      return {
        propertyName,
        totalIncome: value.totalIncome,
        totalExpenses: value.totalExpenses,
        netProfit:
          value.netIncomeRows.length > 0
            ? value.netIncomeRows.reduce((sum, item) => sum + item, 0)
            : value.totalIncome - value.totalExpenses,
        topExpenseCategories,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
}

function buildPortfolioContext(
  ytdRows: YtdCsvRow[],
  projectRows: ProjectRow[],
  financialRows: FinancialRecord[],
  inventoryRows: InventoryRow[]
): PortfolioContext {
  const ytdRow = ytdRows[0];
  const financials = aggregateFinancials(financialRows);
  const inventory = inventoryRows
    .map((row) => ({
      house: String(row.house ?? "").trim(),
      purchaseDate: String(row.purchase_Date ?? "").trim(),
      daysInInventory: toNumber(row.days_in_inventory),
    }))
    .filter((row) => row.house && Number.isFinite(row.daysInInventory))
    .sort((a, b) => b.daysInInventory - a.daysInInventory);

  const projectStageCounts = Object.entries(
    projectRows.reduce<Record<string, number>>((acc, project) => {
      const stage = String(project.stage ?? "unknown").trim() || "unknown";
      acc[stage] = (acc[stage] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => ({ stage, count }));

  const projectStrategyCounts = Object.entries(
    projectRows.reduce<Record<string, number>>((acc, project) => {
      const strategy =
        String(project.investment_strategy ?? "unknown").trim() || "unknown";
      acc[strategy] = (acc[strategy] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .map(([strategy, count]) => ({ strategy, count }));

  const totalIncome = financials.reduce((sum, property) => sum + property.totalIncome, 0);
  const totalExpenses = financials.reduce((sum, property) => sum + property.totalExpenses, 0);
  const totalNetProfit = financials.reduce((sum, property) => sum + property.netProfit, 0);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalProjects: projectRows.length,
      activeProjects: projectRows.filter(
        (project) =>
          !["sold", "completed"].includes(String(project.stage ?? "").trim().toLowerCase())
      ).length,
      totalTrackedProperties: financials.length,
      totalIncome,
      totalExpenses,
      totalNetProfit,
      averageNetProfit: financials.length > 0 ? totalNetProfit / financials.length : 0,
      averageDaysInInventory:
        inventory.length > 0
          ? inventory.reduce((sum, row) => sum + row.daysInInventory, 0) / inventory.length
          : 0,
    },
    ytd: ytdRow
      ? {
          housesSold: ytdRow["Number of Houses Sold"],
          ytdSold: ytdRow["YTD Sold"],
          ytdProfit: ytdRow["YTD Profit"],
          averageProfit: ytdRow["Average Profit"],
          housesSoldGoal: ytdRow["Houses Sold Goal"],
          ytdSoldGoal: ytdRow["YTD Sold Goal"],
          ytdProfitGoal: ytdRow["YTD Profit Goal"],
          averageProfitGoal: ytdRow["Average Profit Goal"],
          housesSoldPct: ytdRow["Houses Sold % Obtained"],
          ytdSoldPct: ytdRow["YTD Sold % Obtained"],
          ytdProfitPct: ytdRow["YTD Profit % Obtained"],
        }
      : null,
    projects: projectRows.map((project) => ({
      name: String(project.name ?? "").trim(),
      fullAddress: String(project.full_address ?? "").trim(),
      city: String(project.city ?? "").trim(),
      state: String(project.state ?? "").trim(),
      stage: String(project.stage ?? "").trim(),
      strategy: String(project.investment_strategy ?? "").trim(),
      squareFeet: String(project.square_feet ?? "").trim(),
      beds: String(project.beds ?? "").trim(),
      baths: String(project.baths ?? "").trim(),
      yearBuilt: String(project.year_built ?? "").trim(),
    })),
    projectStageCounts,
    projectStrategyCounts,
    financials,
    topProfitableProperties: financials.slice(0, 10),
    topSellingProperties: [...financials]
      .sort((a, b) => b.totalIncome - a.totalIncome)
      .slice(0, 10),
    inventory,
  };
}

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

export function PublicChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isAuthError, setIsAuthError] = useState(false);
  const [isThrottleError, setIsThrottleError] = useState(false);
  const [portfolioContext, setPortfolioContext] = useState<PortfolioContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolioContext() {
      setContextLoading(true);
      setContextError("");

      try {
        const [ytdRows, projectRows, financialRows, inventoryRows] = await Promise.all([
          loadCsv<YtdCsvRow>("/data/ytd_csv_looker.csv"),
          loadCsv<ProjectRow>("/data/projects_v2.csv"),
          loadCsv<FinancialRecord>("/data/sweet_home_bama_pl_long_fixed.csv"),
          loadCsv<InventoryRow>("/data/inventory_days.csv"),
        ]);

        if (!cancelled) {
          setPortfolioContext(
            buildPortfolioContext(ytdRows, projectRows, financialRows, inventoryRows)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setContextError(
            err instanceof Error ? err.message : "Failed to load portfolio context."
          );
          setPortfolioContext(null);
        }
      } finally {
        if (!cancelled) {
          setContextLoading(false);
        }
      }
    }

    loadPortfolioContext();

    return () => {
      cancelled = true;
    };
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const updatedHistory: ChatMessage[] = [
      ...messages,
      { role: "user", text },
    ];

    setInput("");
    setError("");
    setIsAuthError(false);
    setIsThrottleError(false);
    setMessages(updatedHistory);
    setLoading(true);

    try {
      if (!CHAT_ENDPOINT) {
        throw new Error("AI assistant endpoint is unavailable. Please try again later.");
      }

      if (contextLoading) {
        throw new Error("Portfolio data is still loading. Please wait a moment and try again.");
      }

      if (contextError || !portfolioContext) {
        throw new Error(
          contextError || "Portfolio data is unavailable. Refresh the page and try again."
        );
      }

      for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt += 1) {
        const isLastAttempt = attempt === MAX_AI_RETRIES - 1;
        const res = await fetch(CHAT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages,
            context: portfolioContext,
          }),
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
              `[PublicChatWidget] Retrying AI request in ${retryDelayMs}ms after ${res.status}.`
            );
            await delay(retryDelayMs);
            continue;
          }

          setIsAuthError(res.status === 401 || res.status === 403);
          setIsThrottleError(res.status === 429);
          setError(
            getErrorMessage(
              jsonObject,
              `AI assistant request failed (${res.status}). Please try again.`
            )
          );
          return;
        }

        if (!jsonObject) {
          setError("AI assistant returned an unexpected response. Please try again.");
          return;
        }

        const reply =
          typeof jsonObject.reply === "string"
            ? (jsonObject.reply || "Sorry, I couldn't generate a response.")
            : "Sorry, I couldn't generate a response.";
        setMessages([...updatedHistory, { role: "assistant", text: reply }]);
        return;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setInput("");
    setError("");
    setIsAuthError(false);
    setIsThrottleError(false);
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="chatWrap">
      {/* Header */}
      <div className="chatHeader">
        <div className="chatHeaderLeft">
          <div className="chatAvatar">🤖</div>
          <div>
            <p className="chatHeaderTitle">AI Assistant</p>
            <p className="chatHeaderSub">
              Ask anything about real estate investing, deal analysis, or your portfolio.
            </p>
            <span className="chatOnlineBadge">
              <span className="chatOnlineDot" />
              {contextLoading
                ? "Loading portfolio data…"
                : contextError
                  ? "Portfolio data unavailable"
                  : "Portfolio context loaded"}
            </span>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="btn" onClick={resetChat} style={{ fontSize: "12px", flexShrink: 0 }}>
            🔄 New chat
          </button>
        )}
      </div>

      {/* Message thread */}
      <div className="chatMessages">
        {messages.length === 0 && (
          <div className="chatEmptyState">
            <div className="chatEmptyIcon">💬</div>
            <p className="chatEmptyTitle">Ask me anything</p>
            <p className="chatEmptyHint">Try: "What makes a good fix-and-flip deal?"</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`chatRow ${msg.role}`}>
            <div className={`chatBubble ${msg.role}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chatRow assistant">
            <div className="chatBubble assistant">
              <div className="chatTypingDots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="chatError">
          <p className="chatErrorText">{error}</p>
          <div className="chatErrorActions">
            {isAuthError && (
              <button className="btn" onClick={() => window.location.reload()} style={{ fontSize: "12px" }}>
                🔄 Refresh page
              </button>
            )}
            {isThrottleError && (
              <button className="btn" onClick={sendMessage} style={{ fontSize: "12px" }}>
                🔁 Retry
              </button>
            )}
          </div>
        </div>
      )}

      {!error && contextError && (
        <div className="chatError">
          <p className="chatErrorText">{contextError}</p>
        </div>
      )}

      {/* Input area */}
      <div className="chatInputWrap">
        <textarea
          className="chatTextarea"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            contextLoading
              ? "Loading portfolio data…"
              : "Type a message… (Enter to send, Shift+Enter for new line)"
          }
          disabled={loading || contextLoading || !!contextError || !portfolioContext}
        />
        <button
          className="chatSendBtn"
          onClick={sendMessage}
          disabled={
            loading || contextLoading || !!contextError || !portfolioContext || !input.trim()
          }
          aria-label="Send message"
        >
          {loading ? "…" : "Send →"}
        </button>
      </div>
    </div>
  );
}

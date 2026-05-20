import { useEffect, useRef, useState } from "react";
import outputs from "../../amplify/amplify_outputs.json";

const HTTP_API_URL =
  (outputs as { custom?: { cpcHttpApi?: { url?: string } } })?.custom?.cpcHttpApi?.url ?? "";
const CHAT_ENDPOINT = HTTP_API_URL ? `${HTTP_API_URL.replace(/\/?$/, "/")}chat` : "";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

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

export function PublicChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isAuthError, setIsAuthError] = useState(false);
  const [isThrottleError, setIsThrottleError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

      for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt += 1) {
        const isLastAttempt = attempt === MAX_AI_RETRIES - 1;
        const res = await fetch(CHAT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages,
          }),
        });
        const json = await res.json().catch(() => ({}));

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
            getErrorMessage(json, `AI assistant request failed (${res.status}). Please try again.`)
          );
          return;
        }

        const reply =
          json && typeof json === "object" && typeof (json as { reply?: unknown }).reply === "string"
            ? ((json as { reply: string }).reply || "Sorry, I couldn't generate a response.")
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
              Online — no login required
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

      {/* Input area */}
      <div className="chatInputWrap">
        <textarea
          className="chatTextarea"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          disabled={loading}
        />
        <button
          className="chatSendBtn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          {loading ? "…" : "Send →"}
        </button>
      </div>
    </div>
  );
}

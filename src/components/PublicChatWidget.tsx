import { useEffect, useRef, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>({ authMode: "apiKey" });

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SYSTEM_CONTEXT =
  "You are a helpful assistant for Chase Pays Cash, a real estate investment company. " +
  "Answer questions about real estate investing, deal analysis, and property management. " +
  "Be concise, friendly, and practical.";

export function PublicChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function generateReply(history: ChatMessage[]) {
    if (typeof client.generations?.generateRecipe !== "function") {
      console.error(
        "[PublicChatWidget] client.generations.generateRecipe is not available. " +
          "Ensure Amplify outputs are up-to-date and include the generateRecipe generation route."
      );
      throw new Error(
        "AI assistant is not available right now. Please try again later or contact support."
      );
    }

    // Build a conversation transcript to pass as context
    const historyPrompt = history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");

    const prompt = `${SYSTEM_CONTEXT}\n\nConversation so far:\n${historyPrompt}\n\nRespond as the Assistant:`;

    const { data, errors } = await client.generations.generateRecipe({
      description: prompt,
    });

    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("\n"));
    }

    return data?.instructions ?? "Sorry, I couldn't generate a response.";
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const updatedHistory: ChatMessage[] = [
      ...messages,
      { role: "user", text },
    ];

    setInput("");
    setError("");
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const reply = await generateReply(updatedHistory);
      setMessages([...updatedHistory, { role: "assistant", text: reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send message.";
      if (/unauthorized|UnauthorizedException|access denied|not authorized/i.test(msg)) {
        console.error(
          "[PublicChatWidget] Authorization error — AppSync API key may be stale or expired.",
          "Ensure VITE_APPSYNC_API_KEY is set in Amplify Console env variables,",
          "or trigger a backend redeploy to rotate the key. Raw error:", msg
        );
        setError(
          "The AI assistant is temporarily unavailable due to an authorization error. " +
            "Please try again in a moment, or contact support if this persists."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function retryLastMessage() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const reply = await generateReply(messages);
      setMessages([...messages, { role: "assistant", text: reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send message.";
      if (/unauthorized|UnauthorizedException|access denied|not authorized/i.test(msg)) {
        console.error(
          "[PublicChatWidget] Authorization error on retry — AppSync API key may be stale or expired.",
          "Ensure VITE_APPSYNC_API_KEY is set in Amplify Console env variables,",
          "or trigger a backend redeploy to rotate the key. Raw error:", msg
        );
        setError(
          "The AI assistant is temporarily unavailable due to an authorization error. " +
            "Please try again in a moment, or contact support if this persists."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setInput("");
    setError("");
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div>
          <div className="cardLabel">💬 AI Assistant</div>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
            Ask anything about real estate investing, deal analysis, or your
            portfolio — no login required.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            className="btn"
            onClick={resetChat}
            style={{ fontSize: "12px" }}
          >
            🔄 New chat
          </button>
        )}
      </div>

      {/* Message thread */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: "300px",
          maxHeight: "480px",
          padding: "8px 4px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--muted)",
              fontSize: "14px",
              fontStyle: "italic",
            }}
          >
            Ask a question to get started…
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent:
                msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius:
                  msg.role === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)"
                    : "var(--panel2)",
                color: msg.role === "user" ? "#fff" : "var(--text)",
                border:
                  msg.role === "user" ? "none" : "1px solid var(--border)",
                fontSize: "14px",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "18px 18px 18px 4px",
                background: "var(--panel2)",
                border: "1px solid var(--border)",
                fontSize: "14px",
                color: "var(--muted)",
              }}
            >
              ▌
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ margin: "8px 0" }}>
          <p style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 6px" }}>
            {error}
          </p>
          {messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <button
              className="btn"
              onClick={retryLastMessage}
              disabled={loading}
              style={{ fontSize: "12px" }}
            >
              🔄 Retry
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "12px",
          alignItems: "flex-end",
        }}
      >
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "var(--panel2)",
            color: "var(--text)",
            fontSize: "14px",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          className="btnPrimary"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ alignSelf: "flex-end", padding: "10px 18px" }}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

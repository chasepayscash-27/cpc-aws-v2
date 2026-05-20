import { useEffect, useRef, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import outputs from "../../amplify/amplify_outputs.json";
import {
  getBedrockModelAccessRegions,
  getBedrockModelAccessUrl,
} from "../utils/bedrockModelAccess";
import {
  parseAmplifyErrors,
  formatCaughtError,
  hasAmplifyAuthError,
  isAuthErrorLike,
} from "../utils/amplifyErrors";

// Prefer Cognito Identity Pool guest credentials (SigV4), but keep API key
// available as a rollout fallback if guest auth has not propagated yet.
const guestClient = generateClient<Schema>({ authMode: "identityPool" });
const apiKeyClient = generateClient<Schema>({ authMode: "apiKey" });

// Deployment region — surfaced in error messages and console links so the user
// knows which AWS Console region(s) to check for Bedrock model access.
const DEPLOYMENT_REGION: string | undefined =
  (outputs as { data?: { aws_region?: string } })?.data?.aws_region;
const BEDROCK_MODEL_ACCESS_REGIONS = getBedrockModelAccessRegions(DEPLOYMENT_REGION);

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SYSTEM_CONTEXT =
  "You are a helpful assistant for Chase Pays Cash, a real estate investment company. " +
  "Answer questions about real estate investing, deal analysis, and property management. " +
  "Be concise, friendly, and practical.";
const MAX_AI_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateRecipeWithFallback(description: string) {
  const args = { description };

  try {
    const result = await guestClient.generations.generateRecipe(args);

    if (!hasAmplifyAuthError(result.errors)) {
      return result;
    }

    console.warn("[PublicChatWidget] Guest auth failed, retrying with apiKey.", result.errors);
  } catch (e: unknown) {
    if (!isAuthErrorLike(e)) {
      throw e;
    }

    console.warn("[PublicChatWidget] Guest auth threw, retrying with apiKey.", e);
  }

  return apiKeyClient.generations.generateRecipe(args);
}

export function PublicChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isAuthError, setIsAuthError] = useState(false);
  const [isThrottleError, setIsThrottleError] = useState(false);
  const [showBedrockConsoleLink, setShowBedrockConsoleLink] = useState(false);
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
    setShowBedrockConsoleLink(false);
    setMessages(updatedHistory);
    setLoading(true);

    try {
      if (typeof guestClient.generations?.generateRecipe !== "function") {
        console.error(
          "[PublicChatWidget] guestClient.generations.generateRecipe is not available. " +
            "Ensure Amplify outputs are up-to-date and include the generateRecipe generation route."
        );
        throw new Error(
          "AI assistant is not available right now. Please try again later or contact support."
        );
      }

      // Build a conversation transcript to pass as context
      const historyPrompt = updatedHistory
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
        .join("\n");

      const prompt = `${SYSTEM_CONTEXT}\n\nConversation so far:\n${historyPrompt}\n\nRespond as the Assistant:`;

      for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt += 1) {
        const isLastAttempt = attempt === MAX_AI_RETRIES - 1;

        try {
          const { data, errors } = await generateRecipeWithFallback(prompt);

          if (errors?.length) {
            const parsed = parseAmplifyErrors("PublicChatWidget", errors, DEPLOYMENT_REGION);

            if (parsed.isRetryable && !isLastAttempt) {
              const retryDelayMs = parsed.retryAfterMs * 2 ** attempt;
              console.warn(
                `[PublicChatWidget] Retrying AI request in ${retryDelayMs}ms due to transient Bedrock error.`,
                errors
              );
              await delay(retryDelayMs);
              continue;
            }

            setIsAuthError(parsed.isAuthError);
            setIsThrottleError(parsed.isThrottleError);
            setShowBedrockConsoleLink(parsed.showBedrockConsoleLink);
            setError(parsed.userMessage);
            return;
          }

          const reply = data?.instructions ?? "Sorry, I couldn't generate a response.";
          setMessages([...updatedHistory, { role: "assistant", text: reply }]);
          return;
        } catch (e: unknown) {
          const parsed = formatCaughtError("PublicChatWidget", e, DEPLOYMENT_REGION);

          if (parsed.isRetryable && !isLastAttempt) {
            const retryDelayMs = parsed.retryAfterMs * 2 ** attempt;
            console.warn(
              `[PublicChatWidget] Retrying AI request in ${retryDelayMs}ms due to transient caught error.`,
              e
            );
            await delay(retryDelayMs);
            continue;
          }

          setIsAuthError(parsed.isAuthError);
          setIsThrottleError(parsed.isThrottleError);
          setShowBedrockConsoleLink(parsed.showBedrockConsoleLink);
          setError(parsed.userMessage);
          return;
        }
      }
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
    setShowBedrockConsoleLink(false);
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
            {showBedrockConsoleLink &&
              (BEDROCK_MODEL_ACCESS_REGIONS.length > 0
                ? BEDROCK_MODEL_ACCESS_REGIONS
                : [undefined]
              ).map((region) => (
                <a
                  key={region ?? "default"}
                  href={getBedrockModelAccessUrl(region)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ fontSize: "12px", display: "inline-block" }}
                >
                  🔗 Open Bedrock Console{region ? ` (${region})` : ""}
                </a>
              ))
            }
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

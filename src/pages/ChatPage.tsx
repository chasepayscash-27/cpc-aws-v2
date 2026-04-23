import { PublicChatWidget } from "../components/PublicChatWidget";

export default function ChatPage() {
  return (
    <div>
      <div className="pageHeader">
        <h1 className="h1">AI Assistant</h1>
        <p className="muted">
          Ask anything about real estate investing, deal analysis, or your
          portfolio — no login required.
        </p>
      </div>

      <div className="card" style={{ marginTop: "8px" }}>
        <PublicChatWidget />
      </div>
    </div>
  );
}

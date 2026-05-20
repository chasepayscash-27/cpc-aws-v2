import { PublicChatWidget } from "../components/PublicChatWidget";

export default function ChatPage() {
  return (
    <div>
      <div className="pageHeader">
        <h1 className="h1">AI Assistant</h1>
        <p className="muted">
          Powered by Amazon Titan Text Lite — ask anything about real estate investing or your portfolio.
        </p>
      </div>

      <div className="card chatCard" style={{ marginTop: "8px" }}>
        <PublicChatWidget />
      </div>
    </div>
  );
}

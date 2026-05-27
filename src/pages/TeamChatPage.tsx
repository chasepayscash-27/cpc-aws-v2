import { useEffect, useRef, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import type { Schema } from "../../amplify/data/resource";

type ChatRoom = Schema["ChatRoom"]["type"];
type ChatMessage = Schema["ChatMessage"]["type"];

const client = generateClient<Schema>();

const DEFAULT_ROOMS = [
  { name: "general", description: "General team conversation" },
  { name: "deals", description: "Active and prospective deals" },
  { name: "announcements", description: "Team announcements" },
];

// ─── Seed default rooms if none exist ────────────────────────────────────────

async function seedDefaultRooms(existingRooms: ChatRoom[]) {
  for (const room of DEFAULT_ROOMS) {
    const alreadyExists = existingRooms.some(
      (r) => r.name.toLowerCase() === room.name.toLowerCase()
    );
    if (!alreadyExists) {
      await client.models.ChatRoom.create(room);
    }
  }
}

// ─── ChatRoomList ─────────────────────────────────────────────────────────────

interface ChatRoomListProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  onSelect: (room: ChatRoom) => void;
  onCreateRoom: (name: string, description: string) => Promise<void>;
}

function ChatRoomList({ rooms, selectedRoomId, onSelect, onCreateRoom }: ChatRoomListProps) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreateRoom(name, newDesc.trim());
      setNewName("");
      setNewDesc("");
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="tcRoomList">
      <div className="tcRoomListHeader">
        <span className="tcRoomListTitle">Channels</span>
        <button
          className="btn"
          style={{ fontSize: "12px", padding: "6px 10px" }}
          onClick={() => setShowForm((v) => !v)}
          title={showForm ? "Cancel" : "New channel"}
        >
          {showForm ? "✕" : "+ New"}
        </button>
      </div>

      {showForm && (
        <form className="tcNewRoomForm" onSubmit={handleCreate}>
          <input
            className="tcInput"
            placeholder="Channel name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={60}
            required
          />
          <input
            className="tcInput"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            maxLength={120}
          />
          <button className="chatSendBtn" type="submit" disabled={creating || !newName.trim()}>
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      <ul className="tcRoomItems">
        {rooms.map((room) => (
          <li
            key={room.id}
            className={`tcRoomItem${selectedRoomId === room.id ? " active" : ""}`}
            onClick={() => onSelect(room)}
          >
            <span className="tcRoomHash">#</span>
            <div className="tcRoomInfo">
              <span className="tcRoomName">{room.name}</span>
              {room.description && (
                <span className="tcRoomDesc">{room.description}</span>
              )}
            </div>
          </li>
        ))}
        {rooms.length === 0 && (
          <li className="tcRoomEmpty">No channels yet.</li>
        )}
      </ul>
    </div>
  );
}

// ─── ChatRoomView ─────────────────────────────────────────────────────────────

interface ChatRoomViewProps {
  room: ChatRoom;
  authorId: string;
  authorName: string;
}

function ChatRoomView({ room, authorId, authorName }: ChatRoomViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load messages + subscribe to new ones via observeQuery
  useEffect(() => {
    // Component remounts via key={room.id} when room changes, so initial
    // state (loading=true, messages=[], error="") is always correct.

    const subscription = client.models.ChatMessage.observeQuery({
      filter: { roomId: { eq: room.id } },
    }).subscribe({
      next: ({ items }) => {
        const sorted = [...items].sort(
          (a, b) =>
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
        );
        setMessages(sorted);
        setLoading(false);
      },
      error: (err) => {
        console.error("[TeamChat] observeQuery error:", err);
        setError("Failed to load messages. Please refresh.");
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [room.id]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setError("");
    try {
      await client.models.ChatMessage.create({
        roomId: room.id,
        authorId,
        authorName,
        content: text,
      });
    } catch (e) {
      console.error("[TeamChat] send error:", e);
      setError("Failed to send message. Please try again.");
      setInput(text); // restore input on failure
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatTime(isoString: string | null | undefined): string {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return "";
    const d = new Date(isoString);
    const today = new Date();
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    return isToday
      ? "Today"
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // Group messages by day
  const grouped: { date: string; messages: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== date) {
      grouped.push({ date, messages: [msg] });
    } else {
      last.messages.push(msg);
    }
  }

  return (
    <div className="tcRoomView">
      {/* Header */}
      <div className="tcRoomViewHeader">
        <div className="chatAvatar" style={{ fontSize: "18px", width: "38px", height: "38px" }}>
          💬
        </div>
        <div>
          <p className="chatHeaderTitle">#{room.name}</p>
          {room.description && (
            <p className="chatHeaderSub">{room.description}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chatMessages tcMessages">
        {loading && (
          <div className="chatEmptyState">
            <div className="chatTypingDots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="chatEmptyState">
            <div className="chatEmptyIcon">💬</div>
            <p className="chatEmptyTitle">No messages yet</p>
            <p className="chatEmptyHint">Be the first to say something in #{room.name}!</p>
          </div>
        )}

        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={date}>
            <div className="tcDateDivider">
              <span className="tcDateLabel">{date}</span>
            </div>
            {dayMsgs.map((msg) => {
              const isMe = msg.authorId === authorId;
              return (
                <div key={msg.id} className={`chatRow ${isMe ? "user" : "assistant"}`}>
                  <div className="tcMsgWrap">
                    {!isMe && (
                      <span className="tcAuthorName">{msg.authorName}</span>
                    )}
                    <div
                      className={`chatBubble ${isMe ? "user" : "assistant"}`}
                      title={formatTime(msg.createdAt)}
                    >
                      {msg.content}
                    </div>
                    <span className={`tcTimestamp ${isMe ? "right" : "left"}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="chatError">
          <p className="chatErrorText">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="chatInputWrap">
        <textarea
          className="chatTextarea"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${room.name}… (Enter to send, Shift+Enter for new line)`}
          disabled={sending}
        />
        <button
          className="chatSendBtn"
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          aria-label="Send message"
        >
          {sending ? "…" : "Send →"}
        </button>
      </div>
    </div>
  );
}

// ─── Main TeamChatPage ─────────────────────────────────────────────────────────

function TeamChatInner() {
  const { user } = useAuthenticator();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [authorId, setAuthorId] = useState("");
  const [authorName, setAuthorName] = useState("");

  // Fetch current user's identity
  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setAuthorId(u.userId);
        setAuthorName(
          u.signInDetails?.loginId ?? u.username ?? u.userId
        );
      })
      .catch(() => {
        setAuthorId(user?.username ?? "unknown");
        setAuthorName(user?.username ?? "Team Member");
      });
  }, [user]);

  // Load rooms + subscribe to new rooms
  useEffect(() => {
    const subscription = client.models.ChatRoom.observeQuery().subscribe({
      next: async ({ items }) => {
        const sorted = [...items].sort(
          (a, b) =>
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
        );
        setRooms(sorted);
        setRoomsLoading(false);

        // Seed default rooms once if empty
        if (sorted.length === 0) {
          await seedDefaultRooms(sorted);
        } else {
          // Auto-select first room on initial load
          setSelectedRoom((prev) => prev ?? sorted[0] ?? null);
        }
      },
      error: (err) => {
        console.error("[TeamChat] rooms observeQuery error:", err);
        setRoomsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleCreateRoom(name: string, description: string) {
    await client.models.ChatRoom.create({ name, description });
  }

  return (
    <div>
      <div className="pageHeader">
        <h1 className="h1">Team Chat</h1>
        <p className="muted">Real-time messaging for your team.</p>
      </div>

      <div className="tcLayout card" style={{ padding: 0, overflow: "hidden" }}>
        {roomsLoading ? (
          <div style={{ padding: "24px" }}>
            <p className="muted">Loading channels…</p>
          </div>
        ) : (
          <>
            <ChatRoomList
              rooms={rooms}
              selectedRoomId={selectedRoom?.id ?? null}
              onSelect={(room) => setSelectedRoom(room)}
              onCreateRoom={handleCreateRoom}
            />

            <div className="tcMain">
              {selectedRoom ? (
                <ChatRoomView
                  key={selectedRoom.id}
                  room={selectedRoom}
                  authorId={authorId}
                  authorName={authorName}
                />
              ) : (
                <div className="chatEmptyState" style={{ height: "100%" }}>
                  <div className="chatEmptyIcon">💬</div>
                  <p className="chatEmptyTitle">Select a channel to start chatting</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeamChatPage() {
  return (
    <Authenticator>
      {() => <TeamChatInner />}
    </Authenticator>
  );
}

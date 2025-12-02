import React, { useState } from "react";

interface Props {
  todos: {
    id: string;
    text: string | null;
    imageUrl?: string | null;
    createdAt: any;
    done?: boolean;
  }[];
  onDelete: (id: string) => void;
  onToggleDone: (id: string, current: boolean) => void;
  onEdit: (id: string, newText: string) => void;
  onImageClick: (url: string) => void;
}

export default function TodoList({
  todos,
  onDelete,
  onToggleDone,
  onEdit,
  onImageClick,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Not hooks — just variables inside event handlers
  let startX = 0;

  function handleTouchStart(e: React.TouchEvent) {
    startX = e.touches[0].clientX;
  }

  function handleTouchEnd(
    e: React.TouchEvent,
    onLeft: () => void,
    onRight: () => void
  ) {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;

    if (diff < -80) onLeft(); // left swipe
    if (diff > 80) onRight(); // right swipe
  }

  if (todos.length === 0) return <p>No todos yet</p>;

  return (
    <div className="todo-list">
      {todos.map((t) => (
        <div
          key={t.id}
          className="todo-item"
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) =>
            handleTouchEnd(
              e,
              () => onDelete(t.id),
              () => onToggleDone(t.id, !!t.done)
            )
          }
          style={{ touchAction: "pan-y" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              {editingId === t.id ? (
                <input
                  autoFocus
                  defaultValue={t.text ?? ""}
                  className="inline-editor"
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    setEditingId(null);
                    if (val && val !== t.text) onEdit(t.id, val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                  }}
                />
              ) : (
                <p
                  style={{
                    marginBottom: 6,
                    fontWeight: 500,
                    opacity: t.done ? 0.6 : 1,
                    textDecoration: t.done ? "line-through" : "none",
                    cursor: "text",
                  }}
                  onClick={() => setEditingId(t.id)}
                >
                  {t.text}
                </p>
              )}

              {t.imageUrl && (
                <img
                  src={t.imageUrl}
                  onClick={() => onImageClick(t.imageUrl!)}
                  alt=""
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    borderRadius: 12,
                    marginTop: 8,
                    cursor: "pointer",
                  }}
                />
              )}

              <small style={{ color: "#94a3b8", display: "block" }}>
                {t.createdAt?.toDate
                  ? t.createdAt.toDate().toLocaleString()
                  : ""}
              </small>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => onToggleDone(t.id, !!t.done)}
                className="icon-btn small"
              >
                {t.done ? "✓" : "◻"}
              </button>

              <button
                onClick={() => onDelete(t.id)}
                className="icon-btn small danger"
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

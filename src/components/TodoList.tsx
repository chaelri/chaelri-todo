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
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<{ [key: string]: number }>({});

  let startX = 0;

  function handleTouchStart(e: React.TouchEvent, id: string) {
    startX = e.touches[0].clientX;
    setActiveSwipeId(id);
  }

  function handleTouchMove(e: React.TouchEvent, id: string) {
    if (activeSwipeId !== id) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setSwipeOffset((s) => ({ ...s, [id]: diff }));
  }

  function handleTouchEnd(
    e: React.TouchEvent,
    id: string,
    onLeft: () => void,
    onRight: () => void
  ) {
    const diff = swipeOffset[id] || 0;

    if (diff < -80) {
      // SWIPE LEFT delete
      setSwipeOffset((s) => ({ ...s, [id]: -500 }));
      setTimeout(onLeft, 200);
    } else if (diff > 80) {
      // SWIPE RIGHT complete
      setSwipeOffset((s) => ({ ...s, [id]: 500 }));
      setTimeout(onRight, 200);
    } else {
      // snap back
      setSwipeOffset((s) => ({ ...s, [id]: 0 }));
    }

    setActiveSwipeId(null);
  }

  if (todos.length === 0) return <p>No todos yet</p>;

  return (
    <div className="todo-list">
      {todos.map((t) => {
        const offset = swipeOffset[t.id] || 0;

        return (
          <div
            key={t.id}
            className="todo-item"
            style={{
              touchAction: "pan-y",
              transform: `translateX(${offset}px)`,
              transition:
                activeSwipeId === t.id ? "none" : "transform 0.2s ease",
            }}
            onTouchStart={(e) => handleTouchStart(e, t.id)}
            onTouchMove={(e) => handleTouchMove(e, t.id)}
            onTouchEnd={(e) =>
              handleTouchEnd(
                e,
                t.id,
                () => onDelete(t.id),
                () => onToggleDone(t.id, !!t.done)
              )
            }
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
        );
      })}
    </div>
  );
}

import React, { useState } from "react";
import CommentSection from "./CommentSection"; // <-- import the comment component

interface TodoItem {
  id: string;
  text: string | null;
  imageUrl?: string | null;
  createdAt: any;
  done?: boolean;
}

interface Props {
  todos: TodoItem[];
  onDelete: (id: string) => void;
  onToggleDone: (id: string, current: boolean) => void;
  onEdit: (id: string, newText: string) => void;
  onImageClick: (url: string) => void;

  onAddComment: (todoId: string, text: string) => void;
  onLoadComments: (todoId: string) => Promise<any[]>;
}

export default function TodoList({
  todos,
  onDelete,
  onToggleDone,
  onEdit,
  onImageClick,
  onAddComment, // ← destructure
  onLoadComments, // ← destructure
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Tilt animation state
  const [activeTilt, setActiveTilt] = useState<{
    id: string | null;
    rx: number;
    ry: number;
  }>({ id: null, rx: 0, ry: 0 });

  // Touch swipe variables
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

  // Mouse tilt interaction
  function handleMouseMove(e: React.MouseEvent, id: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    const ry = Math.max(Math.min((dx / rect.width) * 6, 6), -6);
    const rx = Math.max(Math.min((-dy / rect.height) * 4, 4), -4);

    setActiveTilt({ id, rx, ry });
  }

  function handleMouseLeave() {
    setActiveTilt({ id: null, rx: 0, ry: 0 });
  }

  // ⭐ FIXED: Delete animation + passes item for undo
  function handleDeleteWithAnimation(id: string, item: any) {
    const el = document.getElementById(`todo-${id}`);
    if (!el) return onDelete(id);

    el.classList.add("delete-anim");

    setTimeout(() => onDelete(id), 300);
  }

  if (todos.length === 0) return <p>No todos yet</p>;

  return (
    <div className="todo-list">
      {todos.map((t) => {
        const isActive = activeTilt.id === t.id;

        const transformStyle = isActive
          ? `perspective(900px) rotateX(${activeTilt.rx}deg) rotateY(${activeTilt.ry}deg)`
          : "none";

        return (
          <div
            key={t.id}
            id={`todo-${t.id}`}
            className="todo-item"
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) =>
              handleTouchEnd(
                e,
                () => handleDeleteWithAnimation(t.id, t), // ← FIXED
                () => onToggleDone(t.id, !!t.done)
              )
            }
            onMouseMove={(e) => handleMouseMove(e, t.id)}
            onMouseLeave={handleMouseLeave}
            style={{
              touchAction: "pan-y",
              transform: transformStyle,
              transition: isActive
                ? "transform 0s"
                : "transform 220ms cubic-bezier(.2,.9,.2,1)",
              willChange: "transform",
            }}
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
                <CommentSection
                  todoId={t.id}
                  onAddComment={onAddComment}
                  onLoadComments={onLoadComments}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => onToggleDone(t.id, !!t.done)}
                  className={`check-btn ${t.done ? "on" : "off"}`}
                ></button>

                <button
                  onClick={() => handleDeleteWithAnimation(t.id, t)} // ← FIXED
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

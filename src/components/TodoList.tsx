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

  // For tilt effect: track which card is active and its small rotation values
  const [activeTilt, setActiveTilt] = useState<{
    id: string | null;
    rx: number;
    ry: number;
  }>({ id: null, rx: 0, ry: 0 });

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

  // Mouse move handler for tilt (desktop)
  function handleMouseMove(e: React.MouseEvent, id: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    // small normalized rotation values
    const ry = Math.max(Math.min((dx / rect.width) * 6, 6), -6); // rotateY up to 6deg
    const rx = Math.max(Math.min((-dy / rect.height) * 4, 4), -4); // rotateX up to 4deg
    setActiveTilt({ id, rx, ry });
  }

  function handleMouseLeave() {
    setActiveTilt({ id: null, rx: 0, ry: 0 });
  }

  function handleDeleteWithAnimation(id: string) {
    const el = document.getElementById(`todo-${id}`);
    if (!el) return onDelete(id);

    el.classList.add("delete-anim");

    setTimeout(() => onDelete(id), 300); // match CSS duration
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
                () => handleDeleteWithAnimation(t.id),
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
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => onToggleDone(t.id, !!t.done)}
                  className={`check-btn ${t.done ? "on" : "off"}`}
                ></button>

                <button
                  onClick={() => handleDeleteWithAnimation(t.id)}
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

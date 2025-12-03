import React, { useState, useRef } from "react";
import CommentSection from "./CommentSection";

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
  showToast: (msg: string) => void;
}

export default function TodoList({
  todos,
  onDelete,
  onToggleDone,
  onEdit,
  onImageClick,
  showToast,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // -------------------------------------------------
  //  TILT (kept exactly as your original)
  // -------------------------------------------------
  const [activeTilt, setActiveTilt] = useState<{
    id: string | null;
    rx: number;
    ry: number;
  }>({ id: null, rx: 0, ry: 0 });

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

  // -------------------------------------------------
  //  SWIPE LEFT/RIGHT (kept 100% intact)
  // -------------------------------------------------
  let startX = 0;
  function handleTouchStartLeftRight(e: React.TouchEvent) {
    startX = e.touches[0].clientX;
  }
  function handleTouchEndLeftRight(
    e: React.TouchEvent,
    onLeft: () => void,
    onRight: () => void
  ) {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;

    if (diff < -80) onLeft();
    if (diff > 80) onRight();
  }

  // delete with animation
  function handleDeleteWithAnimation(id: string, item: any) {
    const el = document.getElementById(`todo-${id}`);
    if (!el) return onDelete(id);

    el.classList.add("delete-anim");
    setTimeout(() => onDelete(id), 300);
  }

  // -------------------------------------------------
  //  VERTICAL CAROUSEL LOGIC (NEW)
  // -------------------------------------------------
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = todos.length;
  function goNext() {
    setCurrentIndex((i) => (i + 1) % total);
  }
  function goPrev() {
    setCurrentIndex((i) => (i - 1 + total) % total);
  }

  // Drag up/down gesture
  let startY = 0;

  function handleVerticalStart(e: React.TouchEvent | React.MouseEvent) {
    const y = "touches" in e ? e.touches[0].clientY : e.clientY;
    startY = y;
  }

  function handleVerticalEnd(e: React.TouchEvent | React.MouseEvent) {
    const y =
      "changedTouches" in e
        ? e.changedTouches[0].clientY
        : (e as React.MouseEvent).clientY;

    const diff = y - startY;

    if (diff < -60) goNext(); // swipe up
    if (diff > 60) goPrev(); // swipe down
  }

  // -------------------------------------------------
  //  LIST EMPTY
  // -------------------------------------------------
  if (todos.length === 0) return <p>No todos yet</p>;

  // -------------------------------------------------
  //  RENDER
  // -------------------------------------------------
  return (
    <div className="carousel-vertical">
      {todos.map((t, index) => {
        // distance from focused card
        let offset = index - currentIndex;
        // wrap around closest direction
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;

        // transform values
        const translateY = offset * 60;
        const scale = offset === 0 ? 1 : 0.85;
        const opacity = offset === 0 ? 1 : 0.5;
        const zIndex = 100 - Math.abs(offset);

        const isActiveTilt = activeTilt.id === t.id;

        const tiltTransform = isActiveTilt
          ? `perspective(900px) rotateX(${activeTilt.rx}deg) rotateY(${activeTilt.ry}deg)`
          : "";

        return (
          <div
            key={t.id}
            id={`todo-${t.id}`}
            className="todo-item carousel-card"
            style={{
              transform: `${tiltTransform} translateY(${translateY}px) scale(${scale})`,
              opacity,
              zIndex,
              transition:
                offset === 0
                  ? "transform 0.28s ease, opacity 0.28s ease"
                  : "transform 0.28s ease, opacity 0.28s ease",
            }}
            onTouchStart={(e) => {
              handleTouchStartLeftRight(e);
              handleVerticalStart(e);
            }}
            onTouchEnd={(e) => {
              // left/right preserved
              handleTouchEndLeftRight(
                e,
                () => handleDeleteWithAnimation(t.id, t),
                () => onToggleDone(t.id, !!t.done)
              );
              handleVerticalEnd(e);
            }}
            onMouseDown={handleVerticalStart}
            onMouseUp={handleVerticalEnd}
            onMouseMove={(e) => handleMouseMove(e, t.id)}
            onMouseLeave={handleMouseLeave}
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

                <CommentSection todoId={t.id} showToast={showToast} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => onToggleDone(t.id, !!t.done)}
                  className={`check-btn ${t.done ? "on" : "off"}`}
                ></button>

                <button
                  onClick={() => handleDeleteWithAnimation(t.id, t)}
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

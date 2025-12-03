import React from "react";

interface TodoItemProps {
  id: string;
  text: string | null;
  imageUrl?: string | null;
  createdAt: any;
  done?: boolean;

  onDelete?: (id: string) => void;
  onToggle?: (id: string, cur: boolean) => void;
  onImageClick?: (url: string) => void;
}

export default function TodoItem({
  id,
  text,
  imageUrl,
  createdAt,
  done,
  onDelete,
  onToggle,
  onImageClick,
}: TodoItemProps) {
  return (
    <div className="todo-item carousel-card">
      {/* TEXT */}
      {text ? (
        <p
          style={{
            fontWeight: 500,
            marginBottom: 6,
            textDecoration: done ? "line-through" : "none",
            opacity: done ? 0.6 : 1,
          }}
        >
          {text}
        </p>
      ) : (
        <p style={{ fontStyle: "italic", color: "#64748b", marginBottom: 6 }}>
          (Image note)
        </p>
      )}

      {/* IMAGE */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 12,
            marginTop: 8,
            cursor: "pointer",
          }}
          onClick={() => onImageClick?.(imageUrl)}
        />
      )}

      {/* DATE */}
      <small style={{ color: "#94a3b8", marginTop: 6, display: "block" }}>
        {createdAt?.toDate ? createdAt.toDate().toLocaleString() : ""}
      </small>

      {/* BUTTONS */}
      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        {onToggle && (
          <button
            className={`check-btn ${done ? "on" : "off"}`}
            onClick={() => onToggle(id, !!done)}
          />
        )}

        {onDelete && (
          <button
            className="icon-btn small danger"
            onClick={() => onDelete(id)}
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

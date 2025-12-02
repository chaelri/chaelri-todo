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
    <div className="todo-item">
      {text ? (
        <p
          style={{
            fontWeight: 500,
            marginBottom: 6,
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {text}
        </p>
      ) : (
        <p style={{ fontStyle: "italic", color: "#64748b", marginBottom: 6 }}>
          (Image note)
        </p>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt="todo"
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 10,
            marginTop: 8,
            cursor: "pointer",
          }}
          onClick={() => onImageClick?.(imageUrl)}
        />
      )}

      <small style={{ color: "#94a3b8", display: "block", marginTop: 8 }}>
        {createdAt?.toDate ? createdAt.toDate().toLocaleString() : ""}
      </small>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        {onToggle && (
          <button onClick={() => onToggle(id, !!done)} className="icon-btn">
            {done ? "✓" : "◻"}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              if (confirm("Delete this note?")) onDelete(id);
            }}
            className="icon-btn danger"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

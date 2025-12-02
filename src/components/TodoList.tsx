import React from "react";

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
  onImageClick: (url: string) => void;
  onEdit?: (id: string, newText: string) => void;
}

export default function TodoList({
  todos,
  onDelete,
  onToggleDone,
  onImageClick,
  onEdit,
}: Props) {
  if (todos.length === 0) return <p>No todos yet</p>;

  return (
    <div className="todo-list">
      {todos.map((t) => (
        <div key={t.id} className="todo-item">
          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
          >
            <div style={{ flex: 1 }}>
              {t.text ? (
                <p
                  style={{
                    fontWeight: 500,
                    marginBottom: 6,
                    textDecoration: t.done ? "line-through" : "none",
                    opacity: t.done ? 0.6 : 1,
                    cursor: onEdit ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (!onEdit) return;
                    const current = t.text ?? "";
                    const newText = prompt("Edit todo text:", current);
                    if (newText !== null && newText.trim() !== current) {
                      onEdit(t.id, newText.trim());
                    }
                  }}
                >
                  {t.text}
                </p>
              ) : (
                <p
                  style={{
                    fontStyle: "italic",
                    color: "#64748b",
                    marginBottom: 6,
                  }}
                >
                  (Image note)
                </p>
              )}

              {t.imageUrl && (
                <img
                  src={t.imageUrl}
                  alt="todo"
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    borderRadius: 10,
                    marginTop: 8,
                    display: "block",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    cursor: "pointer",
                  }}
                  onClick={() => onImageClick(t.imageUrl!)}
                />
              )}

              <small
                style={{ color: "#94a3b8", display: "block", marginTop: 8 }}
              >
                {t.createdAt?.toDate
                  ? t.createdAt.toDate().toLocaleString()
                  : ""}
              </small>
            </div>

            <div className="action-col">
              <button
                onClick={() => onToggleDone(t.id, !!t.done)}
                title={t.done ? "Mark as not done" : "Mark as done"}
                className="icon-btn small"
                aria-label="toggle done"
              >
                {t.done ? "✓" : "◻"}
              </button>

              <button
                onClick={() => {
                  if (confirm("Delete this note?")) onDelete(t.id);
                }}
                title="Delete"
                className="icon-btn small danger"
                aria-label="delete"
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

import React from "react";

interface Props {
  todos: {
    id: string;
    text: string | null;
    imageUrl?: string | null;
    createdAt: any;
  }[];
}

export default function TodoList({ todos }: Props) {
  if (todos.length === 0) return <p>No todos yet</p>;

  return (
    <div className="todo-list">
      {todos.map((t) => (
        <div key={t.id} className="todo-item">
          
          {/* TEXT (optional) */}
          {t.text ? (
            <p style={{ fontWeight: 500, marginBottom: "6px" }}>{t.text}</p>
          ) : (
            <p style={{ fontStyle: "italic", color: "#64748b", marginBottom: "6px" }}>
              (Image note)
            </p>
          )}

          {/* IMAGE (optional) */}
          {t.imageUrl && (
            <img
              src={t.imageUrl}
              alt="todo"
              style={{
                width: "100%",
                maxWidth: "200px",
                borderRadius: "10px",
                marginTop: "8px",
                display: "block",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              }}
            />
          )}

          {/* DATE */}
          <small style={{ color: "#94a3b8", display: "block", marginTop: "8px" }}>
            {t.createdAt?.toDate
              ? t.createdAt.toDate().toLocaleString()
              : ""}
          </small>
        </div>
      ))}
    </div>
  );
}

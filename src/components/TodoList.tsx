import React from "react";

interface Props {
  todos: {
    id: string;
    text: string;
    imageUrl?: string;
    createdAt: any;
  }[];
}

export default function TodoList({ todos }: Props) {
  if (todos.length === 0) return <p>No todos yet</p>;

  return (
    <div className="todo-list">
      {todos.map((t) => (
        <div key={t.id} className="todo-item">
          <p>{t.text}</p>

          {t.imageUrl && (
            <img
              src={t.imageUrl}
              alt="todo"
              style={{ width: "140px", borderRadius: "6px", marginTop: "8px" }}
            />
          )}

          <small>
            {t.createdAt?.toDate
              ? t.createdAt.toDate().toLocaleString()
              : ""}
          </small>
        </div>
      ))}
    </div>
  );
}

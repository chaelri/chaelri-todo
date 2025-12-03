import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function CommentSection({
  todoId,
  showToast,
}: {
  todoId: string;
  showToast: (msg: string) => void;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");

  // LIVE COMMENTS
  useEffect(() => {
    const q = query(
      collection(db, "todos", todoId, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setComments(list);
    });

    return () => unsub();
  }, [todoId]);

  // ADD COMMENT
  async function handleAdd() {
    if (!text.trim()) return;

    await addDoc(collection(db, "todos", todoId, "comments"), {
      text: text.trim(),
      createdAt: Timestamp.now(),
    });

    setText("");
    showToast("Comment added"); // toast
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  // DELETE COMMENT
  async function handleDelete(id: string) {
    await deleteDoc(doc(db, "todos", todoId, "comments", id));
    showToast("Comment deleted");
  }

  return (
    <div style={{ marginTop: 16, paddingLeft: 10 }}>
      <p style={{ fontSize: 14, marginBottom: 6, fontWeight: 600 }}>
        Comments:
      </p>

      {comments.length === 0 && (
        <p
          style={{
            fontSize: 13,
            fontStyle: "italic",
            opacity: 0.6,
            marginBottom: 10,
          }}
        >
          No comments yet
        </p>
      )}

      {comments.map((c) => (
        <div
          key={c.id}
          class="comment"
          style={{
            background: "rgba(0,0,0,0.05)",
            padding: "6px 10px 8px",
            borderRadius: 8,
            marginBottom: 8,
            width: "fit-content",
            maxWidth: "85%",
          }}
        >
          <div style={{ fontSize: 14 }}>{c.text}</div>

          {/* timestamp + delete button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
              alignItems: "center",
              fontSize: 12,
              opacity: 0.6,
            }}
          >
            <span>
              {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : ""}
            </span>

            <button
              onClick={() => handleDelete(c.id)}
              style={{
                marginLeft: 10,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              🗑
            </button>
          </div>
        </div>
      ))}

      {/* COMMENT INPUT */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          type="text"
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ccc",
            fontSize: 14,
            background: "white",
            outline: "none",
          }}
        />

        <button
          onClick={handleAdd}
          className="icon-btn small"
          style={{
            background: "white",
            border: "1px solid #ddd",
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 16,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function CommentSection({ todoId }: { todoId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // LIVE updates
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

      // Auto-scroll to bottom
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        80
      );
    });

    return () => unsub();
  }, [todoId]);

  async function handleAdd() {
    if (!text.trim()) return;

    await addDoc(collection(db, "todos", todoId, "comments"), {
      text: text.trim(),
      createdAt: Timestamp.now(),
    });

    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
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
          style={{
            background: "rgba(0,0,0,0.05)",
            padding: "6px 10px",
            borderRadius: 8,
            marginBottom: 6,
            fontSize: 14,
            width: "fit-content",
            maxWidth: "85%",
          }}
        >
          {c.text}
        </div>
      ))}

      {/* Input */}
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

      <div ref={bottomRef} />
    </div>
  );
}

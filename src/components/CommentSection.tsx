import React, { useEffect, useState } from "react";

export default function CommentSection({
  todoId,
  onAddComment,
  onLoadComments,
}: {
  todoId: string;
  onAddComment: (id: string, text: string) => void;
  onLoadComments: (id: string) => Promise<any>;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    let mounted = true;

    onLoadComments(todoId).then((items: any) => {
      if (mounted) setComments(items);
    });

    return () => {
      mounted = false;
    };
  }, [todoId]);

  function handleAdd() {
    if (!text.trim()) return;
    onAddComment(todoId, text);
    setText("");
  }

  return (
    <div style={{ marginTop: 12, paddingLeft: 12 }}>
      {comments.map((c) => (
        <div
          key={c.id}
          style={{
            background: "rgba(0,0,0,0.04)",
            padding: "6px 10px",
            borderRadius: 8,
            marginBottom: 6,
            fontSize: 14,
          }}
        >
          {c.text}
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          type="text"
          value={text}
          placeholder="Write a comment..."
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, fontSize: 14 }}
        />
        <button onClick={handleAdd} className="icon-btn small">
          ➤
        </button>
      </div>
    </div>
  );
}

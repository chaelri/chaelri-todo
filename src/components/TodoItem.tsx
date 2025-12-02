import React from "react";

interface TodoItemProps {
    id: string;
    text: string | null;
    imageUrl?: string | null;
    createdAt: any;
}

export default function TodoItem({ text, imageUrl, createdAt }: TodoItemProps) {
    return (
        <div className="todo-item">
            {/* TEXT (optional) */}
            {text ? (
                <p style={{ fontWeight: 500, marginBottom: "6px" }}>{text}</p>
            ) : (
                <p style={{ fontStyle: "italic", color: "#64748b", marginBottom: "6px" }}>
                    (Image note)
                </p>
            )}

            {/* IMAGE (optional) */}
            {imageUrl && (
                <img
                    src={imageUrl}
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
                {createdAt?.toDate ? createdAt.toDate().toLocaleString() : ""}
            </small>
        </div>
    );
}

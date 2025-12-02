import React, { useState, useEffect } from "react";

interface Props {
  onAdd: (text: string | null, file?: File | null) => void;
  uploading?: boolean;
}

export default function TodoForm({ onAdd, uploading = false }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);

    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ALLOW: text only, image only, or both
    if (!text.trim() && !file) {
      alert("Please enter text or choose an image.");
      return;
    }

    onAdd(text.trim() || null, file);

    // Reset fields
    setText("");
    setFile(null);
    setPreview(null);
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter todo (optional)..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="file" accept="image/*" onChange={handleFileChange} />

        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{
              width: 80,
              height: 80,
              objectFit: "cover",
              borderRadius: 6,
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={uploading}>
          {uploading ? <span className="spinner" aria-hidden /> : "Add"}
        </button>
      </div>
    </form>
  );
}

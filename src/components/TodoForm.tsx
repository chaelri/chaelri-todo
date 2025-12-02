import React, { useState, useEffect, useRef } from "react";

interface Props {
  onAdd: (text: string | null, file?: File | null) => void;
  uploading?: boolean;
}

async function resizeImageFile(file: File, maxWidth = 1024): Promise<File> {
  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = img.width / img.height;
      const width = Math.min(img.width, maxWidth);
      const height = Math.round(width / ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const newFile = new File([blob], file.name, { type: file.type });
          resolve(newFile);
        },
        file.type,
        0.8
      ); // quality 0.8
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

export default function TodoForm({ onAdd, uploading = false }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }

    // resize before setting
    const resized = await resizeImageFile(f, 1024);
    setFile(resized);

    const url = URL.createObjectURL(resized);
    setPreview(url);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    requestNotificationsIfNeeded();

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
        ref={inputRef}
        type="text"
        placeholder="Enter todo (optional)..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div className="file-input-wrapper">
          <label htmlFor="todoFile">Choose File</label>
          <span>{file?.name ?? "no file selected"}</span>
          <input
            id="todoFile"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

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
        <button
          type="submit"
          disabled={uploading}
          className="add-btn"
          aria-disabled={uploading}
        >
          {uploading ? <span className="spinner" aria-hidden /> : "Add"}
        </button>
      </div>
    </form>
  );
}

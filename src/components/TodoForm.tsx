import React, { useState } from "react";

interface Props {
    onAdd: (text: string | null, file?: File | null) => void;
}

export default function TodoForm({ onAdd }: Props) {
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

            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
            />

            {preview && (
                <img
                    src={preview}
                    alt="preview"
                    style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "6px",
                    }}
                />
            )}

            <button type="submit">Add</button>
        </form>
    );
}

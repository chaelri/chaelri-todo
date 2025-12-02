import React, { useState } from "react";

interface Props {
    onAdd: (text: string, file?: File | null) => void;
}

export default function TodoForm({ onAdd }: Props) {
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!text.trim()) return;

        onAdd(text.trim(), file);
        setText("");
        setFile(null);
    }

    return (
        <form className="todo-form" onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Enter todo..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />

            <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <button type="submit">Add</button>
        </form>
    );
}

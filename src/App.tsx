import React, { useEffect, useState } from "react";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";
import { messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";


import { db, storage } from "./firebase";
import {
    collection,
    addDoc,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface TodoItem {
    id: string;
    text: string;
    imageUrl?: string;
    createdAt: any;
}

export default function App() {
    const [todos, setTodos] = useState<TodoItem[]>([]);

    useEffect(() => {
        const unsub = onMessage(messaging, (payload) => {
            console.log("Foreground notification:", payload);
            alert(`New Notification: ${payload.notification?.title}`);
        });

        return () => {
            unsub();
        };
    }, []);


    async function addTodo(text: string, file?: File | null) {
        console.log("[addTodo] called", { text, file });

        let imageUrl = "";

        try {
            if (file) {
                console.log("[upload] creating ref...");
                const imageRef = ref(storage, `todos/${Date.now()}-${file.name}`);
                console.log("[upload] ref path:", imageRef.fullPath || "(no fullPath)");

                // upload with basic progress tracking using uploadBytes (no resumable progress API in this snippet)
                const uploadResult = await uploadBytes(imageRef, file).catch((err) => {
                    console.error("[uploadBytes] failed", err);
                    throw err;
                });

                console.log("[uploadBytes] result:", uploadResult);

                // getDownloadURL
                try {
                    imageUrl = await getDownloadURL(imageRef);
                    console.log("[getDownloadURL] success:", imageUrl);
                } catch (err) {
                    console.error("[getDownloadURL] failed", err);
                    // If this fails, we still continue to write the doc but with empty imageUrl
                }
            }

            const docRef = await addDoc(collection(db, "todos"), {
                text,
                imageUrl,
                createdAt: Timestamp.now(),
            });

            console.log("[addDoc] done, id:", docRef.id);
        } catch (err) {
            console.error("[addTodo] overall error:", err);
            alert("Failed to add todo — check console for details.");
        }
    }

    console.log("VAPID KEY:", import.meta.env.VITE_VAPID_KEY);


    async function enableNotifications() {
        console.log("Requesting notifications...");
      
        if (!messaging) {
          console.log("Messaging not initialized.");
          alert("Messaging not supported.");
          return;
        }
      
        try {
          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_VAPID_KEY,
          });
          console.log("TOKEN RESULT:", token);
          alert("Notifications enabled! Check console.");
        } catch (err) {
          console.error("getToken ERROR:", err);
          alert("Failed to activate notifications. Check console.");
        }
      }
      



    return (
        <div className="app-container">
            <header>
                <h1>Chaelri ToDo</h1>
                <button onClick={enableNotifications}>Enable Notifications</button>
            </header>


            <main>
                <TodoForm onAdd={addTodo} />
                <TodoList todos={todos} />
            </main>
        </div>
    );
}

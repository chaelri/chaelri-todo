import { useEffect, useState } from "react";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";

import { db, storage, messaging } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { getToken, onMessage } from "firebase/messaging";

interface TodoItem {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: Timestamp;
}

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  //
  // ------------------------------
  // REALTIME FIRESTORE LISTENER
  // ------------------------------
  //
  useEffect(() => {
    const q = query(collection(db, "todos"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((doc) => {
            const { id: _ignored, ...rest } = doc.data() as any;
            return { id: doc.id, ...rest };
          });
      setTodos(list);
    });

    return () => unsub();
  }, []);

  //
  // ------------------------------
  // ADD TODO + UPLOAD IMAGE
  // ------------------------------
  //
  async function addTodo(text: string, file?: File | null) {
    let imageUrl = "";

    try {
      if (file) {
        const imageRef = ref(storage, `todos/${Date.now()}-${file.name}`);
        await uploadBytes(imageRef, file);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "todos"), {
        text,
        imageUrl,
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.error("Add todo error:", err);
      alert("Failed to add todo.");
    }
  }

  //
  // ------------------------------
  // ENABLE FCM NOTIFICATIONS
  // ------------------------------
  //
  async function enableNotifications() {
    console.log("Requesting notifications...");

    if (!messaging) {
      console.warn("Messaging is not supported in this environment.");
      alert("Messaging not supported.");
      return;
    }

    try {
        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_VAPID_KEY,
            serviceWorkerRegistration: await navigator.serviceWorker.register(
              "/chaelri-todo/firebase-messaging-sw.js",
              { scope: "/chaelri-todo/" }
            )
          });
          

      console.log("FCM Token:", token);
      alert("Notifications enabled! Token printed in console.");
    } catch (err) {
      console.error("getToken ERROR:", err);
      alert("Failed to activate notifications.");
    }
  }

  //
  // ------------------------------
  // FOREGROUND MESSAGES
  // ------------------------------
  //
  useEffect(() => {
    if (!messaging) return;

    const unsub = onMessage(messaging, (payload) => {
      console.log("Foreground notification:", payload);
      alert(`New Notification: ${payload.notification?.title}`);
    });

    return () => {
      unsub();
    };
  }, []);

  //
  // ------------------------------
  // UI
  // ------------------------------
  //
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

      <footer>
        <small>Built with React + Firebase + PWA</small>
      </footer>
    </div>
  );
}

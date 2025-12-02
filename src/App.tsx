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
  setDoc,
  doc,
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getToken, onMessage } from "firebase/messaging";

interface TodoItem {
  id: string;
  text: string | null;
  imageUrl?: string | null;
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
      const list = snap.docs.map((docSnap) => {
        const data = docSnap.data() as any;

        return {
          id: docSnap.id,
          text: data.text ?? null,
          imageUrl: data.imageUrl ?? null,
          createdAt: data.createdAt,
        } as TodoItem;
      });

      setTodos(list);
    });

    return () => unsub();
  }, []);

  //
  // ------------------------------
  // ADD TODO (text optional, image optional)
  // ------------------------------
  //
  async function addTodo(text: string | null, file?: File | null) {
    if (!text && !file) {
      alert("Please add text or an image.");
      return;
    }

    let imageUrl = null;

    try {
      if (file) {
        const imageRef = ref(storage, `todos/${Date.now()}-${file.name}`);
        await uploadBytes(imageRef, file);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "todos"), {
        text: text || null,
        imageUrl: imageUrl,
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
      console.warn("Messaging not supported");
      return;
    }

    // Register SW (GitHub Pages path required)
    const swReg = await navigator.serviceWorker.register(
      "/chaelri-todo/firebase-messaging-sw.js",
      { scope: "/chaelri-todo/" }
    );

    console.log("SW registered:", swReg);

    try {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      console.log("FCM Token:", token);

      if (token) {
        await saveTokenToFirestore(token);
      }

      alert("Notifications enabled!");
    } catch (err) {
      console.error("getToken ERROR:", err);
    }
  }

  async function saveTokenToFirestore(token: string) {
    const tokenData = {
      token,
      createdAt: Timestamp.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      uid: null,
    };

    await setDoc(doc(db, "tokens", token), tokenData, { merge: true });
    console.log("Token synced:", tokenData);
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

    return () => unsub();
  }, []);

  //
  // ------------------------------
  // INITIAL TOKEN SYNC
  // ------------------------------
  //
  useEffect(() => {
    async function syncToken() {
      if (!messaging) return;

      try {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_VAPID_KEY,
        });

        if (token) await saveTokenToFirestore(token);
      } catch (err) {
        console.log("Token sync skipped:", err);
      }
    }

    syncToken();
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

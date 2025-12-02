import { useEffect, useState } from "react";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";
import Toast from "./components/Toast";

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
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getToken, onMessage } from "firebase/messaging";

interface TodoItem {
  id: string;
  text: string | null;
  imageUrl?: string | null;
  createdAt: Timestamp;
  done?: boolean;
}

interface ToastObj {
  id: string;
  message: string;
  timeout?: number;
}

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastObj[]>([]);

  function showToast(message: string, timeout = 4000) {
    const id = String(Math.random()).slice(2);
    setToasts((s) => [...s, { id, message, timeout }]);
  }
  function removeToast(id: string) {
    setToasts((s) => s.filter((t) => t.id !== id));
  }

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
          done: data.done ?? false,
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
      showToast("Please add text or an image.");
      return;
    }

    let imageUrl: string | null = null;

    try {
      setUploading(true);

      if (file) {
        const imageRef = ref(storage, `todos/${Date.now()}-${file.name}`);
        await uploadBytes(imageRef, file);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "todos"), {
        text: text ?? "",
        imageUrl: imageUrl,
        createdAt: Timestamp.now(),
        done: false,
      });

      showToast("Todo added");
    } catch (err) {
      console.error("Add todo error:", err);
      showToast("Failed to add todo.");
    } finally {
      setUploading(false);
    }
  }

  //
  // ------------------------------
  // DELETE TODO
  // ------------------------------
  //
  async function deleteTodo(id: string) {
    try {
      await deleteDoc(doc(db, "todos", id));
      showToast("Deleted");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete.");
    }
  }

  //
  // ------------------------------
  // EDIT TODO (click -> edit)
  // ------------------------------
  //
  async function editTodo(id: string, newText: string) {
    try {
      await updateDoc(doc(db, "todos", id), { text: newText });
      showToast("Updated");
    } catch (err) {
      console.error("Edit error:", err);
      showToast("Failed to update.");
    }
  }

  //
  // ------------------------------
  // TOGGLE DONE
  // ------------------------------
  //
  async function toggleDone(id: string, current: boolean) {
    try {
      await updateDoc(doc(db, "todos", id), { done: !current });

      if (!current) {
        // trigger confetti when marking as done
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.7 },
        });
      }
    } catch (err) {
      console.error("Toggle done error:", err);
      showToast("Failed to update.");
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
      showToast("Messaging not supported in this browser");
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

      showToast("Notifications enabled!");
    } catch (err) {
      console.error("getToken ERROR:", err);
      showToast("Failed to enable notifications");
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
  // FOREGROUND MESSAGES (toast)
  // ------------------------------
  //
  useEffect(() => {
    if (!messaging) return;

    const unsub = onMessage(messaging, (payload) => {
      console.log("Foreground notification:", payload);

      const title = payload.data?.title || "New Todo";
      const body = payload.data?.body || "";

      showToast(`${title} — ${body}`);
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
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={enableNotifications}>Enable Notifications</button>
        </div>
      </header>

      <main>
        <TodoForm onAdd={addTodo} uploading={uploading} />
        <TodoList
          todos={todos}
          onDelete={deleteTodo}
          onToggleDone={toggleDone}
          onEdit={editTodo}
          onImageClick={(url) => setImageModalUrl(url)}
        />
      </main>

      <footer>
        <small>Built with React + Firebase + PWA</small>
      </footer>

      {/* Image modal (simple) */}
      {imageModalUrl && (
        <div className="image-modal" onClick={() => setImageModalUrl(null)}>
          <img src={imageModalUrl} alt="full" />
        </div>
      )}

      {/* Toast stack */}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  // Load saved dark mode on first load
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") {
      setDarkMode(true);
      document.body.classList.add("dark");
    }
  }, []);

  function showToast(message: string, timeout = 4000) {
    const id = String(Math.random()).slice(2);
    setToasts((s) => [...s, { id, message, timeout }]);
  }
  function removeToast(id: string) {
    setToasts((s) => s.filter((t) => t.id !== id));
  }

  function vibrate(ms = 30) {
    if (navigator.vibrate) navigator.vibrate(ms);
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
      // close modal (if open)
      setShowAddModal(false);
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
      showToast("Failed to delete");
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
        const globalAny = window as any;
        globalAny.confetti?.({
          particleCount: 80,
          spread: 55,
          origin: { y: 0.7 },
        });
      }
      vibrate(25);
    } catch (err) {
      console.error("Toggle error:", err);
      showToast("Failed to update");
    }
  }

  async function requestNotificationsIfNeeded() {
    if (!("Notification" in window)) return;

    const alreadyAsked = localStorage.getItem("askedNotifications");
    if (alreadyAsked) return;

    if (Notification.permission === "default") {
      localStorage.setItem("askedNotifications", "true");
      await enableNotifications();
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
  // Modal keyboard close (Esc)
  // ------------------------------
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setShowAddModal(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  //
  // ------------------------------
  // UI
  // ------------------------------
  //
  return (
    <div className="app-container">
      <header>
        <h1>CharLa ToDo</h1>
        <button onClick={() => setDarkMode((s) => !s)}>
          {darkMode ? "Light" : "Dark"}
        </button>
      </header>

      <main>
        {/* Keep your existing inline form for fallback but hide visually on larger screens.
            We keep rendering it here to avoid removing functionality; primary add now via modal. */}
        <div style={{ display: "none" }}>
          <TodoForm
            onAdd={addTodo}
            uploading={uploading}
            onBeforeAdd={requestNotificationsIfNeeded}
          />
        </div>

        <TodoList
          todos={todos}
          onDelete={deleteTodo}
          onToggleDone={toggleDone}
          onEdit={editTodo}
          onImageClick={(url) => setImageModalUrl(url)}
        />
      </main>

      {/* Floating centered Add button (FAB) */}
      <button
        onClick={() => setShowAddModal(true)}
        aria-label="Add todo"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 28,
          zIndex: 1200,
          width: 72,
          height: 72,
          borderRadius: 36,
          border: "none",
          background:
            "linear-gradient(135deg, rgba(200,140,255,1), rgba(240,120,200,1))",
          color: "white",
          fontSize: 20,
          boxShadow: "0 12px 30px rgba(96,43,182,0.18)",
          cursor: "pointer",
        }}
      >
        ＋
      </button>

      {/* Centered Add Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(4,6,14,0.35)",
            backdropFilter: "blur(6px)",
            padding: 20,
          }}
          onClick={(e) => {
            // close when clicking outside the modal card
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div
            style={{
              width: "min(720px, 96vw)",
              background: "rgba(255,255,255,0.9)",
              borderRadius: 20,
              padding: 18,
              boxShadow: "0 20px 50px rgba(2,6,23,0.36)",
              transform: "translateY(0)",
              transition: "transform 220ms cubic-bezier(.2,.9,.2,1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>Add Todo</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <TodoForm
                onAdd={addTodo}
                uploading={uploading}
                onBeforeAdd={requestNotificationsIfNeeded}
              />
            </div>
          </div>
        </div>
      )}

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

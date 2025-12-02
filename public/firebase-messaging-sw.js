// Firebase Messaging Service Worker
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAzbXjGyT1_jbpIdJYKYdcG9y368r7NKRw",
  authDomain: "chaelri-todo.firebaseapp.com",
  projectId: "chaelri-todo",
  storageBucket: "chaelri-todo.firebasestorage.app",
  messagingSenderId: "271724667038",
  appId: "1:271724667038:web:185cd2c2db593b96db9b8f",
});

const messaging = firebase.messaging();

// Only background notifications
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Chaelri ToDo";
  const body = payload.notification?.body || "";

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
  });
});

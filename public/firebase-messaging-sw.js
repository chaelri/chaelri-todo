// Firebase Messaging Service Worker
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js"
);

// SAME Firebase config as firebase.ts
firebase.initializeApp({
  apiKey: "AIzaSyAzbXjGyT1_jbpIdJYKYdcG9y368r7NKRw",
  authDomain: "chaelri-todo.firebaseapp.com",
  projectId: "chaelri-todo",
  storageBucket: "chaelri-todo.firebasestorage.app",
  messagingSenderId: "271724667038",
  appId: "1:271724667038:web:185cd2c2db593b96db9b8f",
});

// Background push handling
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: "/icon-192.png",
    image: payload.data.imageUrl,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

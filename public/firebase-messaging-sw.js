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

// This handler is triggered when a message is received while the app is in the background
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  // Extract the notification details from the DATA payload
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: "/icon-192.png", // Your default icon
    image: payload.data.imageUrl, // The large image for the notification
    data: {
      // Pass the link to the click handler
      url: payload.data.link,
    },
  };

  // Display the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// This handler is triggered when a user clicks on the notification
self.addEventListener("notificationclick", (event) => {
  // Close the notification
  event.notification.close();

  const notificationUrl = event.notification.data.url;

  // This opens the URL from the notification data
  if (notificationUrl) {
    event.waitUntil(clients.openWindow(notificationUrl));
  }
});

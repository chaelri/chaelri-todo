import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAzbXjGyT1_jbpIdJYKYdcG9y368r7NKRw",
  authDomain: "chaelri-todo.firebaseapp.com",
  projectId: "chaelri-todo",
  storageBucket: "chaelri-todo.firebasestorage.app",
  messagingSenderId: "271724667038",
  appId: "1:271724667038:web:185cd2c2db593b96db9b8f",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

export const messaging =
  typeof window !== "undefined"
    ? await isSupported().then((ok) => (ok ? getMessaging(app) : null))
    : null;

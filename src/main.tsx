import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const BASE_PATH = "/chaelri-todo/";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${BASE_PATH}pwa-sw.js`)
      .then((reg) => console.log("PWA SW registered:", reg.scope))
      .catch((err) => console.error("PWA SW failed:", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

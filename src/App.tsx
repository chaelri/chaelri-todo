import React from "react";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";

export default function App() {
  return (
    <div className="app-container">
      <header>
        <h1>Chaelri ToDo</h1>
        <button className="notif-btn">Enable Notifications</button>
      </header>

      <main>
        <TodoForm />
        <TodoList />
      </main>

      <footer>
        <small>Built with React + Firebase + PWA</small>
      </footer>
    </div>
  );
}

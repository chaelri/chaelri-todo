export default function TodoForm() {
    return (
      <form className="todo-form">
        <input type="text" placeholder="Enter todo..." />
        <input type="file" accept="image/*" />
        <button type="submit">Add</button>
      </form>
    );
  }
  
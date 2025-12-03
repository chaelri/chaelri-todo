import React, { useEffect } from "react";

interface Toast {
  id: string;
  message: string;
  timeout?: number;
}

export default function Toast({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), toast.timeout ?? 3000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  return (
    <div className="toast" onClick={() => onClose(toast.id)}>
      <div className="toast-body">{toast.message}</div>
    </div>
  );
}

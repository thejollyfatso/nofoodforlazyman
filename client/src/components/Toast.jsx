import { useState, useCallback, useRef } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, duration = 2500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  return { toast, showToast };
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.82)",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: "20px",
        fontSize: "14px",
        zIndex: 2000,
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}

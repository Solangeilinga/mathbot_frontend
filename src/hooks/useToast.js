import { useState, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  return { toast, showToast };
}

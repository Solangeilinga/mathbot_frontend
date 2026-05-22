import { useState } from "react";

export function useXP(initial = 0) {
  const [xp, setXP] = useState(initial);
  const addXP = (amount) => setXP((prev) => prev + amount);
  return { xp, addXP };
}

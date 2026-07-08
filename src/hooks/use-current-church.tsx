import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import type { ChurchLite } from "@/modules/tenancy/tenancy.functions";

type Value = {
  currentChurchId: string | null; // null = "All Churches"
  setCurrentChurchId: (id: string | null) => void;
  currentChurch: ChurchLite | null;
  churches: ChurchLite[];
};

const Ctx = createContext<Value | null>(null);
const KEY = "co.current_church_id";

export function CurrentChurchProvider({
  churches,
  children,
}: {
  churches: ChurchLite[];
  children: ReactNode;
}) {
  const [currentChurchId, setCurrentChurchIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (stored === "__all__") setCurrentChurchIdState(null);
    else if (stored && churches.some((c) => c.id === stored)) setCurrentChurchIdState(stored);
    else if (churches.length === 1) setCurrentChurchIdState(churches[0].id);
    else setCurrentChurchIdState(null);
  }, [churches]);

  const setCurrentChurchId = (id: string | null) => {
    setCurrentChurchIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, id ?? "__all__");
    }
  };

  const value = useMemo<Value>(
    () => ({
      currentChurchId,
      setCurrentChurchId,
      currentChurch: churches.find((c) => c.id === currentChurchId) ?? null,
      churches,
    }),
    [currentChurchId, churches],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrentChurch() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCurrentChurch must be inside CurrentChurchProvider");
  return v;
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type OperationLogType =
  | "offer_create"
  | "decrypt"
  | "info"
  | "error";

export type OperationLogEntry = {
  id: string;
  ts: number; // epoch ms
  type: OperationLogType;
  title: string;
  details?: string;
};

type OperationLogContextType = {
  entries: OperationLogEntry[];
  add: (e: Omit<OperationLogEntry, "id" | "ts"> & { ts?: number }) => void;
  clear: () => void;
};

const OperationLogContext = createContext<OperationLogContextType | undefined>(
  undefined
);

export function OperationLogProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<OperationLogEntry[]>([]);

  const add = useCallback(
    (e: Omit<OperationLogEntry, "id" | "ts"> & { ts?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ts = e.ts ?? Date.now();
      setEntries((prev) => [{ id, ts, type: e.type, title: e.title, details: e.details }, ...prev].slice(0, 100));
    },
    []
  );

  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo(() => ({ entries, add, clear }), [entries, add, clear]);

  return (
    <OperationLogContext.Provider value={value}>{children}</OperationLogContext.Provider>
  );
}

export function useOperationLog() {
  const ctx = useContext(OperationLogContext);
  if (!ctx) throw new Error("useOperationLog must be used within OperationLogProvider");
  return ctx;
}


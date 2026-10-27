import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface UseIpcState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (args?: Record<string, unknown>) => Promise<T | null>;
}

export function useTauriIpc<T>(commandName: string): UseIpcState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (args?: Record<string, unknown>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await invoke<T>(commandName, args);
        setData(result);
        return result;
      } catch (err: unknown) {
        const errMessage = typeof err === "string" ? err : JSON.stringify(err);
        setError(errMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [commandName]
  );

  return { data, loading, error, execute };
}

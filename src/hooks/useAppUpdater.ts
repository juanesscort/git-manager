import { useState, useCallback } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "up-to-date"
  | "downloading"
  | "ready"
  | "error";

export function useAppUpdater() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateObj, setUpdateObj] = useState<Update | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    setStatus("checking");
    setError(null);
    try {
      const token = localStorage.getItem("github_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const update = await check({ headers });
      if (update && update.available) {
        setUpdateObj(update);
        setStatus("available");
      } else {
        setUpdateObj(null);
        setStatus("up-to-date");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("Comprobación de actualización:", errMsg);
      // If offline or release doesn't exist yet on GitHub, provide user-friendly error
      setError(errMsg);
      setStatus("error");
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!updateObj) return;
    setStatus("downloading");
    setProgress(0);
    setError(null);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await updateObj.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setProgress(100);
            setStatus("ready");
            break;
        }
      });

      setStatus("ready");
      await relaunch();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Error instalando actualización:", errMsg);
      setError(errMsg);
      setStatus("error");
    }
  }, [updateObj]);

  return {
    status,
    updateObj,
    progress,
    error,
    checkForUpdates,
    installUpdate,
  };
}

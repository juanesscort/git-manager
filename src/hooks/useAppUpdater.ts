import { useState, useCallback } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "manual-available"
  | "up-to-date"
  | "downloading"
  | "ready"
  | "error";

export interface ManualReleaseInfo {
  version: string;
  url: string;
  body: string;
}

function isVersionGreater(remote: string, local: string): boolean {
  const cleanR = remote.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const cleanL = local.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(cleanR.length, cleanL.length); i++) {
    const r = cleanR[i] || 0;
    const l = cleanL[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

export function useAppUpdater() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateObj, setUpdateObj] = useState<Update | null>(null);
  const [manualRelease, setManualRelease] = useState<ManualReleaseInfo | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    setStatus("checking");
    setError(null);
    setManualRelease(null);
    try {
      const token = localStorage.getItem("github_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      let otaUpdate: Update | null = null;

      try {
        otaUpdate = await check({ headers });
      } catch (otaErr) {
        console.warn("OTA update check no disponible o manifiesto ausente:", otaErr);
      }

      if (otaUpdate && otaUpdate.available) {
        setUpdateObj(otaUpdate);
        setStatus("available");
        return;
      }

      // Fallback: Check GitHub Releases API for manual releases without latest.json
      try {
        const ghHeaders: Record<string, string> = {
          Accept: "application/vnd.github.v3+json",
        };
        if (token) ghHeaders["Authorization"] = `Bearer ${token}`;
        const res = await fetch(
          "https://api.github.com/repos/juanesscort/git-manager/releases/latest",
          { headers: ghHeaders }
        );
        if (res.ok) {
          const release = await res.json();
          const remoteTag = release.tag_name || "";
          if (isVersionGreater(remoteTag, __APP_VERSION__)) {
            setManualRelease({
              version: remoteTag,
              url: release.html_url || "https://github.com/juanesscort/git-manager/releases",
              body: release.body || "",
            });
            setStatus("manual-available");
            return;
          }
        }
      } catch (ghErr) {
        console.warn("No se pudo comprobar GitHub Releases directamente:", ghErr);
      }

      setUpdateObj(null);
      setStatus("up-to-date");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("Comprobación de actualización:", errMsg);
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
    manualRelease,
    progress,
    error,
    checkForUpdates,
    installUpdate,
  };
}

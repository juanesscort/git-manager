import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DeviceAuthResponse, GitHubUser, RemoteRepo } from "../../../types/git";

export function useGitHub() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [deviceAuth, setDeviceAuth] = useState<DeviceAuthResponse | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [reposModalOpen, setReposModalOpen] = useState<boolean>(false);
  const [repositories, setRepositories] = useState<RemoteRepo[]>([]);
  const [reposLoading, setReposLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
      const activeUser = await invoke<GitHubUser | null>("check_github_session");
      setUser(activeUser);
    } catch (err: unknown) {
      console.warn("No active GitHub session", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const checkAuthorizationNow = async () => {
    if (!deviceAuth?.device_code) return false;
    setChecking(true);
    setError(null);
    try {
      const authUser = await invoke<GitHubUser | null>("poll_github_device_token", {
        deviceCode: deviceAuth.device_code,
      });

      if (authUser) {
        setUser(authUser);
        stopPolling();
        setTimeout(() => {
          setAuthModalOpen(false);
          setDeviceAuth(null);
        }, 1200);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const errMsg = typeof err === "string" ? err : JSON.stringify(err);
      setError(errMsg);
      return false;
    } finally {
      setChecking(false);
    }
  };

  const startDeviceAuth = async () => {
    stopPolling();
    setError(null);
    setLoading(true);
    try {
      const res = await invoke<DeviceAuthResponse>("start_github_device_flow");
      setDeviceAuth(res);
      setAuthModalOpen(true);

      // Start polling every `interval` seconds (default 5s)
      const intervalSec = Math.max(res.interval || 5, 5);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const authUser = await invoke<GitHubUser | null>("poll_github_device_token", {
            deviceCode: res.device_code,
          });

          if (authUser) {
            setUser(authUser);
            stopPolling();
            setTimeout(() => {
              setAuthModalOpen(false);
              setDeviceAuth(null);
            }, 1200);
          }
        } catch (pollErr: unknown) {
          const errMsg = typeof pollErr === "string" ? pollErr : JSON.stringify(pollErr);
          // Only stop polling if code expired or access was explicitly denied
          if (errMsg.includes("expirado") || errMsg.includes("denegado")) {
            stopPolling();
            setError(errMsg);
          } else {
            console.warn("GitHub poll warning (continuing to poll):", pollErr);
          }
        }
      }, intervalSec * 1000);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    stopPolling();
    try {
      await invoke("logout_github_session");
      setUser(null);
      setRepositories([]);
      setReposModalOpen(false);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    }
  };

  const fetchRepositories = async () => {
    setReposLoading(true);
    setError(null);
    try {
      const repos = await invoke<RemoteRepo[]>("get_github_repositories");
      setRepositories(repos);
      setReposModalOpen(true);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setReposLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
    return () => stopPolling();
  }, [checkSession, stopPolling]);

  return {
    user,
    loading,
    checking,
    deviceAuth,
    authModalOpen,
    reposModalOpen,
    repositories,
    reposLoading,
    error,
    startDeviceAuth,
    checkAuthorizationNow,
    logout,
    fetchRepositories,
    closeAuthModal: () => {
      stopPolling();
      setAuthModalOpen(false);
      setDeviceAuth(null);
    },
    closeReposModal: () => setReposModalOpen(false),
  };
}

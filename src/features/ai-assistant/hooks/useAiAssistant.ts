import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AiConfig, SaveAiConfigRequest } from "../../../types/git";

export function useAiAssistant() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await invoke<AiConfig>("get_ai_config");
      setConfig(cfg);
    } catch (err: unknown) {
      console.warn("Error cargando configuración IA", err);
    }
  }, []);

  const saveConfig = async (req: SaveAiConfigRequest) => {
    setError(null);
    try {
      await invoke("save_ai_config", { config: req });
      await loadConfig();
      setConfigModalOpen(false);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    }
  };

  const generateCommit = async (repoPath: string): Promise<string | null> => {
    setError(null);
    setGenerating(true);
    try {
      const message = await invoke<string>("generate_ai_commit", { repoPath });
      return message;
    } catch (err: unknown) {
      const errMsg = typeof err === "string" ? err : JSON.stringify(err);
      setError(errMsg);

      // If missing API key, automatically open config modal
      if (errMsg.toLowerCase().includes("api key no configurada") || errMsg.toLowerCase().includes("missing")) {
        setConfigModalOpen(true);
      }
      return null;
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    configModalOpen,
    generating,
    error,
    loadConfig,
    saveConfig,
    generateCommit,
    openConfigModal: () => setConfigModalOpen(true),
    closeConfigModal: () => setConfigModalOpen(false),
  };
}

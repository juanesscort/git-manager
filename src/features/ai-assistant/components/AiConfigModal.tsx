import React, { useState, useEffect } from "react";
import { AiConfig, SaveAiConfigRequest } from "../../../types/git";
import { Sparkles, X, Shield, Server, Key, ExternalLink } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface AiConfigModalProps {
  isOpen: boolean;
  currentConfig: AiConfig | null;
  onSave: (config: SaveAiConfigRequest) => void;
  onClose: () => void;
}

export const AiConfigModal: React.FC<AiConfigModalProps> = ({
  isOpen,
  currentConfig,
  onSave,
  onClose,
}) => {
  const [provider, setProvider] = useState<string>("gemini");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    if (currentConfig) {
      setProvider(currentConfig.provider || "gemini");
      setModel(currentConfig.model || "");
      setBaseUrl(currentConfig.base_url || "");
    }
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      provider,
      api_key: apiKey ? apiKey : undefined,
      model: model ? model : undefined,
      base_url: baseUrl ? baseUrl : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Configuración del Asistente IA</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#30363d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {/* Provider Selector Tabs */}
          <div>
            <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block mb-2">
              Proveedor de IA
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setProvider("gemini");
                  setModel("gemini-2.5-flash");
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center ${
                  provider === "gemini"
                    ? "bg-blue-950/40 border-blue-500 text-white shadow-sm"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white"
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-400 mb-1" />
                <span className="font-semibold text-xs">Gemini API</span>
                <span className="text-[10px] text-[#8b949e] mt-0.5">Google Cloud</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("ollama");
                  setModel("qwen2.5-coder");
                  setBaseUrl("http://localhost:11434");
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center ${
                  provider === "ollama"
                    ? "bg-emerald-950/40 border-emerald-500 text-white shadow-sm"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white"
                }`}
              >
                <Server className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="font-semibold text-xs">Ollama Local</span>
                <span className="text-[10px] text-[#8b949e] mt-0.5">100% Privado</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("openai");
                  setModel("gpt-4o-mini");
                  setBaseUrl("https://api.openai.com/v1");
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center ${
                  provider === "openai"
                    ? "bg-purple-950/40 border-purple-500 text-white shadow-sm"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white"
                }`}
              >
                <Key className="w-5 h-5 text-purple-400 mb-1" />
                <span className="font-semibold text-xs">OpenAI / Groq</span>
                <span className="text-[10px] text-[#8b949e] mt-0.5">Compatible</span>
              </button>
            </div>
          </div>

          {/* Provider Specific Inputs */}
          {provider !== "ollama" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  API Key
                </label>
                {provider === "gemini" && (
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Obtener API Key gratuita <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="password"
                placeholder={
                  currentConfig?.has_api_key
                    ? "•••••••••••••••••••••••••••••••••••• (Guardada en Keyring)"
                    : "Pega tu API Key..."
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-[#8b949e] mt-1">
                La clave se encripta y guarda en el llavero de tu sistema operativo (Secret Service de Linux).
              </p>
            </div>
          )}

          {/* Model Name */}
          <div>
            <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block mb-1.5">
              Modelo
            </label>
            <input
              type="text"
              placeholder={
                provider === "gemini"
                  ? "gemini-2.5-flash"
                  : provider === "ollama"
                  ? "qwen2.5-coder"
                  : "gpt-4o-mini"
              }
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-none font-mono"
            />
          </div>

          {/* Base URL (for Ollama or custom OpenAI proxy) */}
          {(provider === "ollama" || provider === "openai") && (
            <div>
              <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block mb-1.5">
                Endpoint URL
              </label>
              <input
                type="text"
                placeholder={provider === "ollama" ? "http://localhost:11434" : "https://api.openai.com/v1"}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d] mt-2">
            <Button size="sm" variant="secondary" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Guardar Configuración
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

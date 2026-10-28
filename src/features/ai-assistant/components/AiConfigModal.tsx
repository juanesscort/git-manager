import React, { useState, useEffect } from "react";
import { AiConfig, SaveAiConfigRequest } from "../../../types/git";
import { Sparkles, X, Shield, Server, Key, ExternalLink, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface AiConfigModalProps {
  isOpen: boolean;
  currentConfig: AiConfig | null;
  onSave: (config: SaveAiConfigRequest) => void;
  onClose: () => void;
}

const GEMINI_MODELS = [
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    desc: "500 req/día • 15 RPM • Máxima cuota (Principal)",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    desc: "500 req/día • 15 RPM • Respaldo Nivel 1",
  },
  {
    id: "gemini-flash-lite-latest",
    name: "Gemini Flash-Lite Latest",
    desc: "Auto-actualizable • Respaldo Nivel 2",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    desc: "20 req/día • Razonamiento ampliado",
  },
];

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
      setModel(currentConfig.model || (currentConfig.provider === "gemini" ? "gemini-3.5-flash-lite" : ""));
      setBaseUrl(currentConfig.base_url || "");
    }
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalModel = model.trim()
      ? model.trim()
      : provider === "gemini"
      ? "gemini-3.5-flash-lite"
      : provider === "ollama"
      ? "qwen2.5-coder"
      : "gpt-4o-mini";

    onSave({
      provider,
      api_key: apiKey.trim() ? apiKey.trim() : undefined,
      model: finalModel,
      base_url: baseUrl.trim() ? baseUrl.trim() : undefined,
    });
  };

  const isGeminiOAuthClientId = provider === "gemini" && apiKey.trim().startsWith("gen-lang-client");

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
                  setModel("gemini-3.5-flash-lite");
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center cursor-pointer ${
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
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center cursor-pointer ${
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
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center cursor-pointer ${
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
                    Obtener API Key en Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="password"
                placeholder={
                  currentConfig?.has_api_key
                    ? "•••••••••••••••••••••••••••••••••••• (Guardada de forma segura en Keyring)"
                    : "Pega tu API Key..."
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`w-full bg-[#0d1117] border rounded px-3 py-2 text-xs text-white placeholder-[#484f58] focus:outline-none font-mono ${
                  isGeminiOAuthClientId ? "border-amber-500" : "border-[#30363d] focus:border-blue-500"
                }`}
              />

              {/* Warning if OAuth Client ID is pasted */}
              {isGeminiOAuthClientId && (
                <div className="mt-2 p-2.5 bg-amber-950/40 border border-amber-500/40 rounded text-[11px] text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">¡Advertencia de Credencial! </span>
                    Has ingresado <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">gen-lang-client-...</span>, que es un Client ID OAuth de Google Cloud, no una API Key.
                    <br />
                    Las API Keys de Gemini comienzan con <span className="font-mono text-emerald-400 font-bold">AIzaSy...</span> o <span className="font-mono text-emerald-400 font-bold">AQ.Ab...</span>.
                  </div>
                </div>
              )}

              {provider === "gemini" && !isGeminiOAuthClientId && (
                <p className="text-[10px] text-[#8b949e] mt-1">
                  Tu API Key queda guardada permanentemente en el llavero seguro de Linux (Secret Service API / GNOME Keyring).
                </p>
              )}
            </div>
          )}

          {/* Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block">
                Modelo de IA
              </label>
              {provider === "gemini" && (
                <span className="text-[10px] text-emerald-400 font-medium">Mayor cuota gratuita</span>
              )}
            </div>

            {/* Quick buttons for Gemini */}
            {provider === "gemini" && (
              <>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {GEMINI_MODELS.map((m) => {
                    const isSelected = model === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModel(m.id)}
                        className={`flex flex-col p-2 rounded border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-900/30 border-blue-500 text-white"
                            : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] hover:border-[#484f58]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-[11px]">{m.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <span className="text-[9px] text-[#8b949e] mt-0.5">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Failover Info Banner */}
                <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded text-[10px] text-[#8b949e] flex items-start gap-1.5 mb-2">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-blue-300">Respaldo Automático en Cascada Activo: </span>
                    Si el modelo principal agota su cuota o límite por minuto, el sistema conmuta automáticamente a los modelos de respaldo (hasta 3 niveles) para garantizar continuidad total.
                  </div>
                </div>
              </>
            )}

            <input
              type="text"
              placeholder={
                provider === "gemini"
                  ? "gemini-3.5-flash-lite"
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
          <div className="flex items-center justify-between pt-2 border-t border-[#30363d] mt-2">
            <span className="text-[10px] text-[#8b949e]">
              Ajustes guardados permanentemente en disco.
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button size="sm" variant="primary" type="submit">
                Guardar Configuración
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

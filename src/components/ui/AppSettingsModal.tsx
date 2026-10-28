import React, { useState, useEffect } from "react";
import { AiConfig, SaveAiConfigRequest } from "../../types/git";
import {
  Sparkles,
  X,
  Shield,
  Server,
  Key,
  ExternalLink,
  AlertTriangle,
  Check,
  RefreshCw,
  Info,
  Download,
  FolderGit2,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { Button } from "./Button";
import { useAppUpdater } from "../../hooks/useAppUpdater";

interface AppSettingsModalProps {
  isOpen: boolean;
  initialTab?: "ai" | "about";
  currentConfig: AiConfig | null;
  onSaveAiConfig: (config: SaveAiConfigRequest) => void;
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

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  initialTab = "ai",
  currentConfig,
  onSaveAiConfig,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"ai" | "about">(initialTab);
  const [provider, setProvider] = useState<string>("gemini");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");

  const {
    status: updateStatus,
    updateObj,
    progress: updateProgress,
    error: updateError,
    checkForUpdates,
    installUpdate,
  } = useAppUpdater();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (currentConfig) {
      setProvider(currentConfig.provider || "gemini");
      setModel(
        currentConfig.model || (currentConfig.provider === "gemini" ? "gemini-3.5-flash-lite" : "")
      );
      setBaseUrl(currentConfig.base_url || "");
    }
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalModel = model.trim()
      ? model.trim()
      : provider === "gemini"
      ? "gemini-3.5-flash-lite"
      : provider === "ollama"
      ? "qwen2.5-coder"
      : "gpt-4o-mini";

    onSaveAiConfig({
      provider,
      api_key: apiKey.trim() ? apiKey.trim() : undefined,
      model: finalModel,
      base_url: baseUrl.trim() ? baseUrl.trim() : undefined,
    });
  };

  const isGeminiOAuthClientId = provider === "gemini" && apiKey.trim().startsWith("gen-lang-client");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Navigation Tabs */}
        <div className="px-5 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Configuración</span>
            </h2>

            <div className="flex items-center bg-[#161b22] p-0.5 rounded-lg border border-[#30363d]">
              <button
                type="button"
                onClick={() => setActiveTab("ai")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === "ai"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-[#8b949e] hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Asistente IA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("about")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors relative ${
                  activeTab === "about"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-[#8b949e] hover:text-white"
                }`}
              >
                <Info className="w-3.5 h-3.5 text-blue-300" />
                <span>Acerca de & Updates</span>
                {updateStatus === "available" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#30363d] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 text-xs">
          {/* TAB 1: ASISTENTE IA */}
          {activeTab === "ai" && (
            <form onSubmit={handleAiSubmit} className="flex flex-col gap-4">
              {/* Provider Selector Tabs */}
              <div>
                <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block mb-2">
                  Proveedor de Inteligencia Artificial
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
                      isGeminiOAuthClientId
                        ? "border-amber-500"
                        : "border-[#30363d] focus:border-blue-500"
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
                        Si el modelo principal agota su cuota de 500 peticiones diarias o límite por minuto, conmuta automáticamente a los modelos de respaldo (hasta 3 niveles) para garantizar continuidad total.
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
              <div className="flex items-center justify-between pt-3 border-t border-[#30363d] mt-1">
                <span className="text-[10px] text-[#8b949e]">
                  Ajustes persistentes en <code className="text-blue-300">~/.config/git-manager/</code>
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
          )}

          {/* TAB 2: ACERCA DE GIT-MANAGER & ACTUALIZACIONES */}
          {activeTab === "about" && (
            <div className="flex flex-col gap-5">
              {/* Hero Banner */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center p-0.5 shadow-lg shrink-0">
                  <div className="w-full h-full bg-[#161b22] rounded-[10px] flex items-center justify-center">
                    <FolderGit2 className="w-7 h-7 text-blue-400" />
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">Git-Manager</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/60 border border-blue-500/40 text-blue-300">
                      v0.1.0
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Cliente de escritorio nativo de Git & GitHub con Asistente IA y Grafo Interactivo.
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#8b949e] font-mono">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-purple-400" /> Linux x86_64 (Tauri v2 + Rust)
                    </span>
                    <span>•</span>
                    <span>React 19 + TypeScript</span>
                  </div>
                </div>
              </div>

              {/* Updates Section Card */}
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-xs text-white">Actualizaciones de la Aplicación</span>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={updateStatus === "checking" || updateStatus === "downloading"}
                    onClick={checkForUpdates}
                    className="h-7 text-xs"
                    icon={
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          updateStatus === "checking" ? "animate-spin text-blue-400" : ""
                        }`}
                      />
                    }
                  >
                    {updateStatus === "checking" ? "Buscando..." : "Buscar Actualizaciones"}
                  </Button>
                </div>

                {/* State Displays */}
                {updateStatus === "idle" && (
                  <div className="text-[11px] text-[#8b949e]">
                    Presiona el botón para comprobar si existe una versión más reciente publicada en GitHub Releases.
                  </div>
                )}

                {updateStatus === "checking" && (
                  <div className="text-[11px] text-blue-400 animate-pulse">
                    Conectando con GitHub Releases y verificando firmas criptográficas...
                  </div>
                )}

                {updateStatus === "up-to-date" && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center gap-2.5 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>¡Estás al día! Tienes instalada la versión más reciente de Git-Manager (v0.1.0).</span>
                  </div>
                )}

                {updateStatus === "available" && updateObj && (
                  <div className="p-3.5 bg-blue-950/40 border border-blue-500/50 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-300 text-xs">
                        🚀 ¡Nueva versión disponible: {updateObj.version}!
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={installUpdate}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500"
                        icon={<Download className="w-3.5 h-3.5" />}
                      >
                        Actualizar y Reiniciar
                      </Button>
                    </div>

                    {updateObj.body && (
                      <div className="bg-[#161b22] p-2.5 rounded border border-[#30363d] text-[11px] text-[#c9d1d9] font-mono whitespace-pre-wrap max-h-28 overflow-y-auto">
                        {updateObj.body}
                      </div>
                    )}
                  </div>
                )}

                {updateStatus === "downloading" && (
                  <div className="flex flex-col gap-2 p-3 bg-blue-950/30 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center justify-between text-xs text-blue-300">
                      <span>Descargando actualización desde GitHub...</span>
                      <span className="font-mono font-bold">{updateProgress}%</span>
                    </div>
                    <div className="w-full bg-[#161b22] h-2 rounded-full overflow-hidden border border-[#30363d]">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${updateProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {updateStatus === "ready" && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs">
                    Actualización instalada con éxito. Reiniciando Git-Manager...
                  </div>
                )}

                {updateStatus === "error" && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg flex items-start gap-2 text-amber-200 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">Nota de Actualización: </span>
                      {updateError?.includes("404") || updateError?.includes("release")
                        ? "Aún no se ha publicado una versión en GitHub Releases para comparar. Esta versión v0.1.0 es la inicial."
                        : `No se pudo conectar al servicio de releases: ${updateError}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Useful Links & Community */}
              <div className="flex items-center justify-between pt-2 border-t border-[#30363d] text-[11px] text-[#8b949e]">
                <span>Desarrollado para la comunidad de código abierto</span>
                <div className="flex items-center gap-3">
                  <a
                    href="https://github.com/juanesscort/git-manager"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Repositorio GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>•</span>
                  <a
                    href="https://github.com/juanesscort/git-manager/issues"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Reportar Problema <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

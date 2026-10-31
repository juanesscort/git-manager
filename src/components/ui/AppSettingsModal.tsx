import React, { useState, useEffect } from "react";
import { AiConfig, SaveAiConfigRequest } from "../../types/git";
import {
  Sparkles,
  X,
  Server,
  Key,
  ExternalLink,
  AlertTriangle,
  Check,
  RefreshCw,
  Info,
  Download,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./Button";
import { useAppUpdater, UpdateStatus, ManualReleaseInfo } from "../../hooks/useAppUpdater";
import { Update } from "@tauri-apps/plugin-updater";
import logoImg from "../../assets/logo.png";

interface AppSettingsModalProps {
  isOpen: boolean;
  initialTab?: "ai" | "about";
  currentConfig: AiConfig | null;
  showCommitBody?: boolean;
  onToggleShowCommitBody?: (show: boolean) => void;
  onSaveAiConfig: (config: SaveAiConfigRequest) => void;
  onClose: () => void;
  updateStatus?: UpdateStatus;
  updateObj?: Update | null;
  manualRelease?: ManualReleaseInfo | null;
  updateProgress?: number;
  updateError?: string | null;
  onCheckForUpdates?: () => Promise<void>;
  onInstallUpdate?: () => Promise<void>;
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
  updateStatus: propUpdateStatus,
  updateObj: propUpdateObj,
  manualRelease: propManualRelease,
  updateProgress: propUpdateProgress,
  updateError: propUpdateError,
  onCheckForUpdates,
  onInstallUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<"ai" | "about">(
    initialTab === "about" ? "about" : "ai"
  );
  const [provider, setProvider] = useState<string>("gemini");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");

  const internalUpdater = useAppUpdater();

  const updateStatus = propUpdateStatus ?? internalUpdater.status;
  const updateObj = propUpdateObj !== undefined ? propUpdateObj : internalUpdater.updateObj;
  const manualRelease =
    propManualRelease !== undefined ? propManualRelease : internalUpdater.manualRelease;
  const updateProgress = propUpdateProgress ?? internalUpdater.progress;
  const updateError = propUpdateError !== undefined ? propUpdateError : internalUpdater.error;
  const checkForUpdates = onCheckForUpdates ?? internalUpdater.checkForUpdates;
  const installUpdate = onInstallUpdate ?? internalUpdater.installUpdate;

  useEffect(() => {
    setActiveTab(initialTab === "about" ? "about" : "ai");
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
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#30363d] bg-[#0d1117]/80 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
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
                {(updateStatus === "available" || updateStatus === "manual-available") && (
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
                        : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#c9d1d9]"
                    }`}
                  >
                    <span className="font-semibold text-xs text-blue-400">Google Gemini</span>
                    <span className="text-[10px] text-emerald-400 mt-0.5 font-medium">Recomendado (Free)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProvider("ollama");
                      setModel("qwen2.5-coder");
                      if (!baseUrl) setBaseUrl("http://localhost:11434");
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center cursor-pointer ${
                      provider === "ollama"
                        ? "bg-purple-950/40 border-purple-500 text-white shadow-sm"
                        : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#c9d1d9]"
                    }`}
                  >
                    <span className="font-semibold text-xs text-purple-400">Ollama Local</span>
                    <span className="text-[10px] text-[#8b949e] mt-0.5">100% Privado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProvider("openai");
                      setModel("gpt-4o-mini");
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center cursor-pointer ${
                      provider === "openai"
                        ? "bg-emerald-950/40 border-emerald-500 text-white shadow-sm"
                        : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#c9d1d9]"
                    }`}
                  >
                    <span className="font-semibold text-xs text-emerald-400">OpenAI Compatible</span>
                    <span className="text-[10px] text-[#8b949e] mt-0.5">GPT-4o Mini / Otros</span>
                  </button>
                </div>
              </div>

              {/* Provider Fields */}
              {provider === "gemini" && (
                <div className="flex flex-col gap-3 p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-400" />
                      Gemini API Key
                    </span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>Obtener API Key Gratis</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />

                  {isGeminiOAuthClientId && (
                    <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-200 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        Has ingresado un Client ID de OAuth. Gemini requiere una <strong>API Key</strong> generada en Google AI Studio.
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 mt-1">
                    <label className="text-[11px] font-semibold text-[#8b949e]">
                      Modelo Preferido (Con rotación automática inteligente):
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {GEMINI_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setModel(m.id)}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                            model === m.id
                              ? "bg-blue-950/40 border-blue-500 text-white"
                              : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                          }`}
                        >
                          <div className="font-semibold text-[11px] text-white flex items-center justify-between">
                            <span>{m.name}</span>
                            {model === m.id && <Check className="w-3 h-3 text-blue-400" />}
                          </div>
                          <div className="text-[10px] text-[#8b949e] mt-0.5">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {provider === "ollama" && (
                <div className="flex flex-col gap-3 p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d]">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                    <Server className="w-3.5 h-3.5 text-purple-400" />
                    <span>Configuración de Ollama Local</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8b949e] block mb-1">URL del Servidor Ollama:</label>
                    <input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8b949e] block mb-1">Nombre del Modelo:</label>
                    <input
                      type="text"
                      placeholder="qwen2.5-coder o codellama"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              )}

              {provider === "openai" && (
                <div className="flex flex-col gap-3 p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d]">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Configuración OpenAI Compatible</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8b949e] block mb-1">API Key:</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8b949e] block mb-1">Modelo:</label>
                    <input
                      type="text"
                      placeholder="gpt-4o-mini"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8b949e] block mb-1">Base URL (Opcional):</label>
                    <input
                      type="text"
                      placeholder="https://api.openai.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>
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
            <div className="flex flex-col gap-5 py-1">
              {/* Brand Presentation - Flat, without nested cards (Flechas 2, 3, 4) */}
              <div className="flex items-center gap-4 py-1">
                <img
                  src={logoImg}
                  alt="GitManager Logo"
                  className="w-16 h-16 object-contain shrink-0 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                />

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">GitManager</h3>
                    <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.2 rounded bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 text-amber-300 border border-amber-500/40 shadow-xs uppercase">
                      PRO
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/60 border border-blue-500/40 text-blue-300">
                      v{__APP_VERSION__}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8b949e] mt-1">
                    Cliente de escritorio nativo de Git & GitHub con Asistente IA, Grafo Interactivo y Gestor de Tags.
                  </p>
                </div>
              </div>

              {/* Clean Divider */}
              <div className="border-t border-[#30363d]" />

              {/* Updates Section - Direct and Flat (Flechas 1 y 2) */}
              <div className="flex flex-col gap-3">
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
                          updateStatus === "checking" ? "animate-pulse text-blue-400" : ""
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
                  <div className="text-[11px] text-blue-400 animate-pulse flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Conectando con GitHub Releases y verificando firmas criptográficas...</span>
                  </div>
                )}

                {updateStatus === "up-to-date" && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>¡Estás al día! Tienes instalada la versión más reciente de Git-Manager (v{__APP_VERSION__}).</span>
                  </div>
                )}

                {updateStatus === "available" && updateObj && (
                  <div className="p-3.5 bg-blue-950/30 border border-blue-500/40 rounded-xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                        <span>🚀</span>
                        <span>¡Nueva versión disponible: v{updateObj.version}!</span>
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
                      <div className="p-2.5 rounded-lg bg-[#0d1117] text-[11px] text-[#c9d1d9] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border border-[#30363d]/60">
                        {updateObj.body}
                      </div>
                    )}
                  </div>
                )}

                {updateStatus === "manual-available" && manualRelease && (
                  <div className="p-3.5 bg-blue-950/30 border border-blue-500/40 rounded-xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                        <span>🚀</span>
                        <span>¡Nueva versión disponible: {manualRelease.version}!</span>
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={async () => {
                          try {
                            const { openUrl } = await import("@tauri-apps/plugin-opener");
                            await openUrl(manualRelease.url);
                          } catch {
                            window.open(manualRelease.url, "_blank");
                          }
                        }}
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-500"
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        Ver en GitHub
                      </Button>
                    </div>

                    <p className="text-[11px] text-[#8b949e]">
                      Hay una nueva versión publicada con instaladores oficiales (.deb, .AppImage, .rpm).
                    </p>

                    {manualRelease.body && (
                      <div className="p-2.5 rounded-lg bg-[#0d1117] text-[11px] text-[#c9d1d9] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border border-[#30363d]/60">
                        {manualRelease.body}
                      </div>
                    )}
                  </div>
                )}

                {updateStatus === "downloading" && (
                  <div className="flex flex-col gap-2 p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl">
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
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs">
                    Actualización instalada con éxito. Reiniciando Git-Manager...
                  </div>
                )}

                {updateStatus === "error" && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-200 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Aviso de actualización:</span>
                      <p className="mt-0.5 text-[#8b949e]">{updateError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Clean Footer Links */}
              <div className="border-t border-[#30363d] pt-3 flex items-center justify-between text-[11px] text-[#8b949e]">
                <span>Desarrollado para la comunidad de código abierto</span>
                <div className="flex items-center gap-3">
                  <a
                    href="https://github.com/juanesscort/git-manager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 flex items-center gap-1"
                  >
                    <span>Repositorio GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>•</span>
                  <a
                    href="https://github.com/juanesscort/git-manager/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 flex items-center gap-1"
                  >
                    <span>Reportar Problema</span>
                    <ExternalLink className="w-3 h-3" />
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

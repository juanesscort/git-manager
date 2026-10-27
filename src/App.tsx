import React, { useEffect } from "react";
import { GitBranch, GitCommit, Sparkles, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import { useTauriIpc } from "./hooks/useTauriIpc";
import "./App.css";

interface AppStatusDto {
  ready: boolean;
  version: string;
  message: string;
}

export const App: React.FC = () => {
  const { data: status, loading, execute: checkStatus } = useTauriIpc<AppStatusDto>("check_system_status");

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#c9d1d9] select-none">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-[#30363d] bg-[#161b22] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <h1 className="font-semibold text-white tracking-wide text-sm">Git-Manager</h1>
          </div>
          <Badge label="v0.1.0" variant="purple" />
          <Badge label="Linux Nativo" variant="blue" />
        </div>

        <div className="flex items-center gap-2">
          {status?.ready ? (
            <Badge
              label="Core Conectado"
              variant="green"
              icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            />
          ) : (
            <Badge
              label="Conectando..."
              variant="yellow"
              icon={<RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />}
            />
          )}

          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            onClick={() => checkStatus()}
            disabled={loading}
          >
            Reconectar
          </Button>
        </div>
      </header>

      {/* Main 3-Column Studio Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Navigation & Repos */}
        <aside className="w-64 border-r border-[#30363d] bg-[#0d1117] flex flex-col p-3 gap-4">
          <div>
            <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
              Repositorio
            </span>
            <div className="mt-2 p-2 rounded bg-[#161b22] border border-[#30363d] text-xs">
              <p className="font-medium text-white truncate">git-manager</p>
              <p className="text-[#8b949e] text-[10px] truncate mt-0.5">/home/juanesscort/Proyectos/git-manager</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 text-xs">
            <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-1">
              Ramas Locales
            </span>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1f6feb]/20 text-white font-medium border border-blue-600/30">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              <span>main</span>
              <span className="ml-auto text-[10px] bg-blue-500/20 px-1.5 py-0.2 rounded text-blue-300">HEAD</span>
            </div>
          </nav>

          <div className="mt-auto border-t border-[#30363d] pt-3 flex flex-col gap-1.5 text-xs text-[#8b949e]">
            <div className="flex items-center gap-2">
              <GitCommit className="w-3.5 h-3.5 text-purple-400" />
              <span>Grafo: Fase 2</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>IA Assistant: Fase 4</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              <span>3-Way Merge: Fase 5</span>
            </div>
          </div>
        </aside>

        {/* Center: Interactive Commit Graph Area */}
        <main className="flex-1 flex flex-col bg-[#010409] overflow-hidden">
          <div className="h-9 border-b border-[#30363d] px-4 flex items-center justify-between text-xs text-[#8b949e] bg-[#161b22]/50">
            <span>Historial de Commits y Grafo de Ramas</span>
            <span className="text-[11px]">Renderizado Virtualizado</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-4 text-blue-400 shadow-xl">
              <GitBranch className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-white">Scaffolding Modular Completado</h2>
            <p className="text-sm text-[#8b949e] max-w-md mt-1 mb-4">
              Frontend en React + TypeScript y Core modular en Rust listos para la Fase 1 (Motor Git Local con `libgit2`).
            </p>

            {status && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 max-w-sm w-full text-left text-xs">
                <p className="text-[#8b949e]">Respuesta del Core de Rust:</p>
                <p className="text-emerald-400 font-mono mt-1 font-semibold">{status.message}</p>
                <p className="text-[#8b949e] text-[10px] mt-1 font-mono">Versión compilada: {status.version}</p>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Staging Area & AI Assistant */}
        <aside className="w-80 border-l border-[#30363d] bg-[#0d1117] flex flex-col">
          <div className="h-9 border-b border-[#30363d] px-3 flex items-center justify-between text-xs bg-[#161b22]/50">
            <span className="font-semibold text-white">Cambios (Staging Area)</span>
            <Badge label="0 archivos" variant="gray" />
          </div>

          <div className="flex-1 p-3 flex flex-col justify-between">
            <div className="text-xs text-[#8b949e] text-center mt-8">
              No hay cambios en el directorio de trabajo
            </div>

            <div className="border-t border-[#30363d] pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                  Mensaje de Commit
                </span>
                <Button size="sm" variant="ghost" icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}>
                  IA
                </Button>
              </div>
              <textarea
                placeholder="Escribe un commit o usa el asistente IA..."
                className="w-full h-20 bg-[#161b22] border border-[#30363d] rounded p-2 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-none resize-none font-mono"
                disabled
              />
              <Button size="sm" variant="primary" disabled>
                Commit a main
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default App;

import React, { useState } from "react";
import { Plus, Minus, Sparkles, RefreshCw, Layers, Settings } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { FileItem } from "./FileItem";
import { FileStatusItem } from "../../../types/git";

interface StagingAreaProps {
  stagedFiles: FileStatusItem[];
  unstagedFiles: FileStatusItem[];
  selectedFile: { path: string; staged: boolean } | null;
  currentBranch?: string | null;
  loading: boolean;
  aiGenerating?: boolean;
  onRefresh: () => void;
  onStageFile: (path: string) => void;
  onUnstageFile: (path: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onSelectFile: (path: string, staged: boolean) => void;
  onCommit: (message: string) => void;
  onGenerateAiCommit?: () => Promise<string | null>;
  onOpenAiConfig?: () => void;
}

export const StagingArea: React.FC<StagingAreaProps> = ({
  stagedFiles,
  unstagedFiles,
  selectedFile,
  currentBranch,
  loading,
  aiGenerating,
  onRefresh,
  onStageFile,
  onUnstageFile,
  onStageAll,
  onUnstageAll,
  onSelectFile,
  onCommit,
  onGenerateAiCommit,
  onOpenAiConfig,
}) => {
  const [commitMessage, setCommitMessage] = useState("");

  const handleCommitSubmit = () => {
    if (!commitMessage.trim()) return;
    onCommit(commitMessage);
    setCommitMessage("");
  };

  const handleAiGenerate = async () => {
    if (onGenerateAiCommit) {
      const generated = await onGenerateAiCommit();
      if (generated) {
        setCommitMessage(generated);
      }
    }
  };

  return (
    <aside className="w-80 border-l border-[#30363d] bg-[#0d1117] flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="h-10 border-b border-[#30363d] px-3 flex items-center justify-between text-xs bg-[#161b22] shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white">Área de Cambios</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors"
          title="Refrescar estado"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Files Split View */}
      <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-[#30363d]/50 p-2 gap-2">
        {/* Section: Staged Files */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Preparados (Staged)
              </span>
              <Badge label={String(stagedFiles.length)} variant={stagedFiles.length > 0 ? "green" : "gray"} />
            </div>
            {stagedFiles.length > 0 && (
              <button
                onClick={onUnstageAll}
                className="text-[10px] text-[#8b949e] hover:text-rose-400 flex items-center gap-0.5"
                title="Deshacer todos"
              >
                <Minus className="w-3 h-3" /> Unstage All
              </button>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {stagedFiles.length === 0 ? (
              <p className="text-[11px] text-[#484f58] italic px-2 py-1">
                Ningún archivo preparado para commit.
              </p>
            ) : (
              stagedFiles.map((file) => (
                <FileItem
                  key={`staged-${file.path}`}
                  path={file.path}
                  status={file.staged_status || "Added"}
                  isStaged={true}
                  isSelected={selectedFile?.path === file.path && selectedFile.staged}
                  onSelect={() => onSelectFile(file.path, true)}
                  onAction={() => onUnstageFile(file.path)}
                />
              ))
            )}
          </div>
        </div>

        {/* Section: Unstaged Files */}
        <div className="flex flex-col gap-1 pt-2">
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Sin Preparar (Unstaged)
              </span>
              <Badge
                label={String(unstagedFiles.length)}
                variant={unstagedFiles.length > 0 ? "yellow" : "gray"}
              />
            </div>
            {unstagedFiles.length > 0 && (
              <button
                onClick={onStageAll}
                className="text-[10px] text-[#8b949e] hover:text-emerald-400 flex items-center gap-0.5"
                title="Preparar todos"
              >
                <Plus className="w-3 h-3" /> Stage All
              </button>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {unstagedFiles.length === 0 ? (
              <p className="text-[11px] text-[#484f58] italic px-2 py-1">
                El directorio de trabajo está limpio.
              </p>
            ) : (
              unstagedFiles.map((file) => (
                <FileItem
                  key={`unstaged-${file.path}`}
                  path={file.path}
                  status={file.unstaged_status || "Modified"}
                  isStaged={false}
                  isSelected={selectedFile?.path === file.path && !selectedFile.staged}
                  onSelect={() => onSelectFile(file.path, false)}
                  onAction={() => onStageFile(file.path)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Commit Box */}
      <div className="border-t border-[#30363d] bg-[#161b22] p-3 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
            Mensaje de Commit
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={stagedFiles.length === 0 || aiGenerating}
              onClick={handleAiGenerate}
              className="text-amber-400 hover:text-amber-300 py-0.5 px-2 text-xs h-6 border border-amber-500/20 bg-amber-950/20"
              icon={
                <Sparkles className={`w-3.5 h-3.5 ${aiGenerating ? "animate-spin text-amber-300" : ""}`} />
              }
              title={
                stagedFiles.length === 0
                  ? "Prepara archivos para generar con IA"
                  : "Generar commit con IA (Conventional Commits)"
              }
            >
              {aiGenerating ? "Analizando..." : "Generar IA"}
            </Button>

            {onOpenAiConfig && (
              <button
                onClick={onOpenAiConfig}
                className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors"
                title="Configurar proveedor IA (Gemini / Ollama / OpenAI)"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="feat: resumen del cambio..."
          className="w-full h-20 bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-none resize-none font-mono"
        />

        <Button
          size="sm"
          variant="primary"
          disabled={stagedFiles.length === 0 || !commitMessage.trim()}
          onClick={handleCommitSubmit}
          className="w-full"
        >
          Commit a {currentBranch || "HEAD"} ({stagedFiles.length})
        </Button>
      </div>
    </aside>
  );
};

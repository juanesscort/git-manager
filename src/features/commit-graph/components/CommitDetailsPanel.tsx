import React, { useState } from "react";
import { CommitInfo, CommitFileChange } from "../../../types/git";
import {
  GitCommit,
  User,
  Calendar,
  Copy,
  Check,
  X,
  FileCode,
  ArrowLeft,
  Layers,
} from "lucide-react";

interface CommitDetailsPanelProps {
  commit: CommitInfo | null;
  files: CommitFileChange[];
  loading: boolean;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  onClose: () => void;
}

export const CommitDetailsPanel: React.FC<CommitDetailsPanelProps> = ({
  commit,
  files,
  loading,
  selectedFilePath,
  onSelectFile,
  onClose,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!commit) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(commit.oid);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    Added: { label: "A", color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800" },
    Modified: { label: "M", color: "text-amber-400", bg: "bg-amber-950/40 border-amber-800" },
    Deleted: { label: "D", color: "text-rose-400", bg: "bg-rose-950/40 border-rose-800" },
    Renamed: { label: "R", color: "text-blue-400", bg: "bg-blue-950/40 border-blue-800" },
    Untracked: { label: "U", color: "text-gray-400", bg: "bg-gray-800 border-gray-700" },
    Conflicted: { label: "C", color: "text-purple-400", bg: "bg-purple-950/40 border-purple-800" },
  };

  const formattedDate = new Date(commit.timestamp * 1000).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <aside className="w-full h-full flex flex-col bg-[#0d1117] overflow-hidden select-none">
      {/* Header with Back button */}
      <div className="h-10 border-b border-[#30363d] px-3 flex items-center justify-between text-xs bg-[#161b22] shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors"
          title="Regresar al Área de Cambios (WIP)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Cambios</span>
        </button>

        <button
          onClick={onClose}
          className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors"
          title="Deseleccionar commit"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Commit Metadata Card */}
      <div className="p-3 border-b border-[#30363d] bg-[#161b22]/50 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <GitCommit className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-xs font-semibold text-white">
              {commit.short_oid}
            </span>
            <button
              onClick={handleCopyHash}
              className="p-1 text-[#8b949e] hover:text-white rounded"
              title="Copiar hash completo"
            >
              {copiedHash ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-medium">
            {files.length} archivo{files.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Message */}
        <p className="text-xs text-white font-medium leading-relaxed break-words bg-[#0d1117]/60 p-2 rounded border border-[#30363d]/60 max-h-24 overflow-y-auto">
          {commit.summary || commit.message}
        </p>

        {/* Author & Date */}
        <div className="flex flex-col gap-1 text-[11px] text-[#8b949e] pt-1 border-t border-[#30363d]/40">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3 h-3 text-[#58a6ff] shrink-0" />
            <span className="truncate">{commit.author_name}</span>
            <span className="text-[10px] text-[#484f58] truncate">&lt;{commit.author_email}&gt;</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#8b949e] shrink-0" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Files List in this commit */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-2 border-b border-[#30363d] bg-[#161b22]/30 flex items-center justify-between text-[11px] text-[#8b949e] shrink-0">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Archivos Modificados
          </span>
          <span className="font-mono text-[10px]">{files.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {loading ? (
            <div className="p-4 text-xs text-[#8b949e] text-center italic">
              Cargando archivos del commit...
            </div>
          ) : files.length === 0 ? (
            <div className="p-6 text-xs text-[#8b949e] text-center italic">
              Este commit no contiene modificaciones directas en archivos (commit de merge limpio).
            </div>
          ) : (
            files.map((file) => {
              const badge = statusConfig[file.status] || {
                label: "M",
                color: "text-amber-400",
                bg: "bg-amber-950/40 border-amber-800",
              };
              const parts = file.path.split("/");
              const fileName = parts.pop() || file.path;
              const dirPath = parts.join("/");
              const isSelected = selectedFilePath === file.path;

              return (
                <div
                  key={file.path}
                  onClick={() => onSelectFile(isSelected ? "" : file.path)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors border group ${
                    isSelected
                      ? "bg-[#1f6feb]/25 border-blue-500 text-white font-medium shadow-sm"
                      : "border-[#30363d]/40 bg-[#161b22]/30 hover:bg-[#161b22] text-[#c9d1d9]"
                  }`}
                  title={`${file.path} (Click para ver/cerrar diff en el centro)`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                    <span
                      className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center border shrink-0 ${badge.bg} ${badge.color}`}
                      title={file.status}
                    >
                      {badge.label}
                    </span>
                    <FileCode className="w-3.5 h-3.5 text-[#8b949e] shrink-0 group-hover:text-blue-400" />
                    <div className="flex flex-col truncate">
                      <span className="font-mono text-xs truncate">{fileName}</span>
                      {dirPath && (
                        <span className="text-[10px] text-[#484f58] truncate">{dirPath}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                    {file.lines_added > 0 && (
                      <span className="text-emerald-400">+{file.lines_added}</span>
                    )}
                    {file.lines_deleted > 0 && (
                      <span className="text-rose-400">-{file.lines_deleted}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Back Action */}
      <div className="p-2 border-t border-[#30363d] bg-[#161b22] shrink-0">
        <button
          onClick={onClose}
          className="w-full py-1.5 px-3 rounded text-xs bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Área de Cambios (WIP)</span>
        </button>
      </div>
    </aside>
  );
};

import React, { useState } from "react";
import { CommitInfo, CommitFileChange, DiffDelta } from "../../../types/git";
import { DiffViewer } from "../../staging-area/components/DiffViewer";
import {
  GitCommit,
  User,
  Calendar,
  Copy,
  Check,
  X,
  FileCode,
  Layers,
} from "lucide-react";

interface CommitDetailsPanelProps {
  commit: CommitInfo | null;
  files: CommitFileChange[];
  loading: boolean;
  selectedFilePath: string | null;
  fileDiff: DiffDelta | null;
  diffLoading: boolean;
  onSelectFile: (path: string) => void;
  onClose: () => void;
}

export const CommitDetailsPanel: React.FC<CommitDetailsPanelProps> = ({
  commit,
  files,
  loading,
  selectedFilePath,
  fileDiff,
  diffLoading,
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
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="h-80 flex flex-col bg-[#161b22] border-t border-[#30363d] shadow-2xl select-none shrink-0 overflow-hidden">
      {/* Top Header of the Drawer */}
      <div className="h-10 px-3 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs shrink-0">
            <GitCommit className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-white text-xs">{commit.short_oid}</span>
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

          <div className="h-3 w-[1px] bg-[#30363d] shrink-0" />

          {/* Commit Message */}
          <span className="text-xs text-white font-medium truncate max-w-lg">
            {commit.summary || commit.message}
          </span>

          <div className="h-3 w-[1px] bg-[#30363d] shrink-0" />

          {/* Author */}
          <div className="flex items-center gap-1 text-[11px] text-[#8b949e] shrink-0">
            <User className="w-3 h-3" />
            <span>{commit.author_name}</span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 text-[11px] text-[#8b949e] shrink-0">
            <Calendar className="w-3 h-3" />
            <span>{formattedDate}</span>
          </div>

          {/* Files count */}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-medium shrink-0">
            {files.length} archivo{files.length === 1 ? "" : "s"} modificado{files.length === 1 ? "" : "s"}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors"
          title="Cerrar detalles del commit"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Drawer Split View: Left List of Files, Right Diff Viewer */}
      <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-[#30363d]">
        {/* Left Column: Files list in this commit */}
        <div className="w-72 bg-[#0d1117] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-2 border-b border-[#30363d] flex items-center justify-between text-[11px] text-[#8b949e]">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" /> Archivos del Commit
            </span>
            <span>{files.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5">
            {loading ? (
              <div className="p-4 text-xs text-[#8b949e] text-center italic">
                Cargando archivos del commit...
              </div>
            ) : files.length === 0 ? (
              <div className="p-4 text-xs text-[#8b949e] text-center italic">
                Commit sin cambios en archivos (merge commit limpio).
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
                    onClick={() => onSelectFile(file.path)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors border ${
                      isSelected
                        ? "bg-[#1f6feb]/20 border-blue-600/50 text-white font-medium"
                        : "border-transparent hover:bg-[#161b22] text-[#c9d1d9]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-2">
                      <span
                        className={`w-3.5 h-3.5 rounded text-[9px] font-bold flex items-center justify-center border shrink-0 ${badge.bg} ${badge.color}`}
                        title={file.status}
                      >
                        {badge.label}
                      </span>
                      <FileCode className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                      <span className="font-mono text-xs truncate">
                        {fileName}
                        {dirPath && (
                          <span className="text-[10px] text-[#484f58] ml-1">({dirPath})</span>
                        )}
                      </span>
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

        {/* Right Column: Historical Diff Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#010409]">
          <DiffViewer
            diff={fileDiff}
            loading={diffLoading}
            onClose={() => {
              // Leave open or deselect
            }}
          />
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { CommitInfo, CommitFileChange } from "../../../types/git";
import {
  GitCommit,
  User,
  Calendar,
  Clock,
  Copy,
  Check,
  X,
  FileCode,
  ArrowLeft,
  Layers,
  ChevronDown,
  AlignLeft,
  Undo2,
} from "lucide-react";

interface CommitDetailsPanelProps {
  commit: CommitInfo | null;
  files: CommitFileChange[];
  loading: boolean;
  selectedFilePath: string | null;
  isHead?: boolean;
  githubAvatarUrl?: string | null;
  githubLogin?: string | null;
  onSelectFile: (path: string) => void;
  onUndoCommit?: () => void;
  onClose: () => void;
}

function getAuthorAvatarUrl(
  authorName: string,
  authorEmail: string,
  githubAvatarUrl?: string | null,
  githubLogin?: string | null
): string {
  if (githubAvatarUrl) {
    if (
      !githubLogin ||
      authorName.toLowerCase().includes(githubLogin.toLowerCase()) ||
      authorEmail.toLowerCase().includes(githubLogin.toLowerCase())
    ) {
      return githubAvatarUrl;
    }
  }
  const nameParam = encodeURIComponent(authorName.trim() || "Git");
  return `https://ui-avatars.com/api/?name=${nameParam}&background=1f2937&color=e5e7eb&size=64&bold=true`;
}

export const CommitDetailsPanel: React.FC<CommitDetailsPanelProps> = ({
  commit,
  files,
  loading,
  selectedFilePath,
  isHead = false,
  githubAvatarUrl,
  githubLogin,
  onSelectFile,
  onUndoCommit,
  onClose,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [isFilesAccordionOpen, setIsFilesAccordionOpen] = useState(true);

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

  // Extract separate summary and body
  const commitSummary = commit.summary || commit.message.split("\n")[0] || "";
  const commitBody =
    commit.message.length > commitSummary.length
      ? commit.message.slice(commitSummary.length).trim()
      : "";

  // Detailed date and time formats in Spanish
  const dateObj = new Date(commit.timestamp * 1000);
  const rawDateStr = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateObj);
  const detailedDate = rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1);

  const detailedTime = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(dateObj);

  const avatarUrl = getAuthorAvatarUrl(
    commit.author_name,
    commit.author_email,
    githubAvatarUrl,
    githubLogin
  );

  return (
    <aside className="w-full h-full flex flex-col bg-[#0d1117] overflow-hidden select-none">
      {/* Header with Back button */}
      <div className="h-10 border-b border-[#30363d] px-3 flex items-center justify-between text-xs bg-[#161b22] shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
          title="Regresar al Área de Cambios (WIP)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Cambios</span>
        </button>

        <button
          onClick={onClose}
          className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors cursor-pointer"
          title="Deseleccionar commit"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Details Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Commit Metadata Card (Flecha 1) */}
        <div className="p-3 border-b border-[#30363d] bg-[#161b22]/50 flex flex-col gap-3 shrink-0">
          {/* Author info with avatar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#21262d] border border-[#30363d] shrink-0">
                <img
                  src={avatarUrl}
                  alt={commit.author_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to basic avatar if image fails
                    e.currentTarget.style.display = "none";
                  }}
                />
                <User className="w-4 h-4 text-[#8b949e] absolute inset-0 m-auto -z-10" />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {commit.author_name}
                </span>
                <span className="text-[10px] text-[#8b949e] font-mono truncate">
                  {commit.author_email}
                </span>
              </div>
            </div>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-medium shrink-0">
              {files.length} archivo{files.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Full Hash with copy button */}
          <div className="flex items-center justify-between bg-[#0d1117] px-2.5 py-1.5 rounded-lg border border-[#30363d] gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <GitCommit className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="font-mono text-[11px] text-[#c9d1d9] truncate select-all" title={commit.oid}>
                {commit.oid}
              </span>
            </div>

            <button
              onClick={handleCopyHash}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer shrink-0 ${
                copiedHash
                  ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                  : "bg-[#21262d] hover:bg-[#30363d] border-[#30363d] text-[#8b949e] hover:text-white"
              }`}
              title="Copiar hash SHA-1 completo de 40 caracteres"
            >
              {copiedHash ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* Date and Time (Full detail in Spanish) */}
          <div className="grid grid-cols-1 gap-1 text-[11px] text-[#8b949e] bg-[#0d1117]/50 p-2 rounded-lg border border-[#30363d]/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />
              <span className="text-[#c9d1d9] font-medium">{detailedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[#8b949e] font-mono">{detailedTime}</span>
            </div>
          </div>

          {/* Commit Title (Summary) */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[#8b949e] tracking-wider">
              Título del Commit
            </span>
            <div className="text-xs font-semibold text-white leading-relaxed break-words bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
              {commitSummary}
            </div>
          </div>

          {/* Commit Extended Description (Body), if present */}
          {commitBody && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#8b949e] tracking-wider">
                <AlignLeft className="w-3 h-3 text-cyan-400" />
                <span>Descripción Detallada</span>
              </div>
              <div className="text-xs text-[#c9d1d9] font-mono whitespace-pre-wrap leading-relaxed break-words bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] max-h-48 overflow-y-auto">
                {commitBody}
              </div>
            </div>
          )}

          {/* Quick Undo Action (Only for HEAD) */}
          {isHead && onUndoCommit && (
            <button
              type="button"
              onClick={onUndoCommit}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 font-semibold text-xs transition-all cursor-pointer shadow-xs mt-1"
              title="Deshacer este commit y conservar todos los cambios en tu espacio de trabajo"
            >
              <Undo2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Deshacer este Commit (Conservar Cambios)</span>
            </button>
          )}
        </div>

        {/* Accordion: Modified Files in this commit (Flecha 2) */}
        <div className="flex flex-col shrink-0">
          {/* Accordion Header */}
          <button
            type="button"
            onClick={() => setIsFilesAccordionOpen(!isFilesAccordionOpen)}
            className="p-2.5 border-b border-[#30363d] bg-[#161b22]/70 hover:bg-[#161b22] flex items-center justify-between text-[11px] text-[#8b949e] hover:text-white transition-colors cursor-pointer select-none"
            title={isFilesAccordionOpen ? "Colapsar lista de archivos" : "Expandir lista de archivos"}
          >
            <div className="flex items-center gap-2">
              <ChevronDown
                className={`w-3.5 h-3.5 text-blue-400 transition-transform duration-200 ${
                  isFilesAccordionOpen ? "transform rotate-0" : "transform -rotate-90"
                }`}
              />
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold uppercase tracking-wider text-white">
                Archivos Modificados
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] bg-[#21262d] px-1.5 py-0.2 rounded border border-[#30363d] text-[#c9d1d9]">
                {files.length}
              </span>
            </div>
          </button>

          {/* Accordion Content */}
          {isFilesAccordionOpen && (
            <div className="p-2 flex flex-col gap-1 bg-[#0d1117]">
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
          )}
        </div>
      </div>

      {/* Footer Back Action */}
      <div className="p-2 border-t border-[#30363d] bg-[#161b22] shrink-0">
        <button
          onClick={onClose}
          className="w-full py-1.5 px-3 rounded text-xs bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Área de Cambios (WIP)</span>
        </button>
      </div>
    </aside>
  );
};

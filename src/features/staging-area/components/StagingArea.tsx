import React, { useState, useMemo } from "react";
import {
  Plus,
  Minus,
  Sparkles,
  RefreshCw,
  Layers,
  AlertTriangle,
  GitMerge,
  List,
  FolderTree,
  ArrowUpDown,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCode,
  X,
  Maximize2,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { FileItem } from "./FileItem";
import { FileStatusItem } from "../../../types/git";
import { CommitEditorModal } from "./CommitEditorModal";

interface StagingAreaProps {
  stagedFiles: FileStatusItem[];
  unstagedFiles: FileStatusItem[];
  conflictedFiles?: string[];
  selectedFile: { path: string; staged: boolean } | null;
  currentBranch?: string | null;
  loading: boolean;
  aiGenerating?: boolean;
  onRefresh?: () => void;
  onStageFile: (path: string) => void;
  onUnstageFile: (path: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onSelectFile: (path: string, staged: boolean) => void;
  onCommit: (message: string) => void;
  onGenerateAiCommit?: () => Promise<string | null>;
  onOpenAiConfig?: () => void;
  onOpenConflictResolver?: (path: string) => void;
}

interface StagingTreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  fileItem?: FileStatusItem;
  children: Map<string, StagingTreeNode>;
}

function buildFileTree(files: FileStatusItem[]): StagingTreeNode[] {
  const root = new Map<string, StagingTreeNode>();

  for (const file of files) {
    const parts = file.path.split("/");
    let currentMap = root;
    let accumulatedPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const isLeaf = i === parts.length - 1;

      if (!currentMap.has(part)) {
        currentMap.set(part, {
          name: part,
          fullPath: accumulatedPath,
          isFolder: !isLeaf,
          children: new Map(),
          fileItem: isLeaf ? file : undefined,
        });
      }

      const node = currentMap.get(part)!;
      if (isLeaf) {
        node.fileItem = file;
      }
      currentMap = node.children;
    }
  }

  return Array.from(root.values());
}

export const StagingArea: React.FC<StagingAreaProps> = ({
  stagedFiles,
  unstagedFiles,
  conflictedFiles = [],
  selectedFile,
  currentBranch,
  loading,
  aiGenerating,
  onStageFile,
  onUnstageFile,
  onStageAll,
  onUnstageAll,
  onSelectFile,
  onCommit,
  onGenerateAiCommit,
  onOpenAiConfig,
  onOpenConflictResolver,
}) => {
  const [commitTitle, setCommitTitle] = useState("");
  const [commitDescription, setCommitDescription] = useState("");
  const [viewMode, setViewMode] = useState<"path" | "tree">("path");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState<string | null>(null);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);

  // User adjustable commit box vertical height (Flecha 6)
  const [commitBoxHeight, setCommitBoxHeight] = useState<number>(() => {
    const saved = localStorage.getItem("gitmanager_commit_box_height");
    return saved ? Math.max(170, Math.min(550, parseInt(saved, 10))) : 230;
  });

  const handleCommitBoxResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = commitBoxHeight;
    const onPointerMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY;
      const newH = Math.max(170, Math.min(550, startH + delta));
      setCommitBoxHeight(newH);
      localStorage.setItem("gitmanager_commit_box_height", newH.toString());
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleCommitSubmit = () => {
    if (!commitTitle.trim()) return;
    const fullMessage = commitDescription.trim()
      ? `${commitTitle.trim()}\n\n${commitDescription.trim()}`
      : commitTitle.trim();
    onCommit(fullMessage);
    setCommitTitle("");
    setCommitDescription("");
    setAiError(null);
  };

  const handleToggleFile = (path: string, staged: boolean) => {
    if (selectedFile?.path === path && selectedFile.staged === staged) {
      onSelectFile("", false);
    } else {
      onSelectFile(path, staged);
    }
  };

  const handleAiGenerate = async () => {
    setAiError(null);
    if (!onGenerateAiCommit) return;

    try {
      const generated = await onGenerateAiCommit();
      if (generated) {
        let title = "";
        let description = "";

        if (generated.includes("TITLE:") && generated.includes("DESCRIPTION:")) {
          const titleMatch = generated.match(/TITLE:\s*(.+)/i);
          const descMatch = generated.match(/DESCRIPTION:\s*([\s\S]+)/i);
          title = titleMatch ? titleMatch[1].trim() : "";
          description = descMatch ? descMatch[1].trim() : "";
        } else {
          const lines = generated.trim().split("\n");
          title = lines[0].replace(/^TITLE:\s*/i, "").trim();
          description = lines.slice(1).join("\n").replace(/^DESCRIPTION:\s*/i, "").trim();
        }

        setCommitTitle(title);
        setCommitDescription(description);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiError(msg);
    }
  };

  // Sort files for Path Mode
  const sortedStagedFiles = useMemo(() => {
    return [...stagedFiles].sort((a, b) =>
      sortAsc ? a.path.localeCompare(b.path) : b.path.localeCompare(a.path)
    );
  }, [stagedFiles, sortAsc]);

  const sortedUnstagedFiles = useMemo(() => {
    return [...unstagedFiles].sort((a, b) =>
      sortAsc ? a.path.localeCompare(b.path) : b.path.localeCompare(a.path)
    );
  }, [unstagedFiles, sortAsc]);

  // Build trees for Tree Mode
  const stagedTree = useMemo(() => buildFileTree(stagedFiles), [stagedFiles]);
  const unstagedTree = useMemo(() => buildFileTree(unstagedFiles), [unstagedFiles]);

  const renderTreeNode = (
    node: StagingTreeNode,
    isStaged: boolean,
    depth = 0
  ): React.ReactNode => {
    if (node.isFolder) {
      const isCollapsed = !!collapsedFolders[`${isStaged ? "s" : "u"}-${node.fullPath}`];
      const childCount = node.children.size;

      return (
        <div key={`folder-${node.fullPath}`} className="flex flex-col">
          <div
            onClick={() => toggleFolder(`${isStaged ? "s" : "u"}-${node.fullPath}`)}
            style={{ paddingLeft: `${depth * 10 + 4}px` }}
            className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-[#161b22] text-[#8b949e] hover:text-white cursor-pointer select-none text-xs group"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3 text-[#484f58] shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[#484f58] shrink-0" />
            )}
            {isCollapsed ? (
              <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="font-mono text-[11px] text-amber-200/90 truncate flex-1">
              {node.name}
            </span>
            <span className="text-[9px] text-[#484f58] group-hover:text-[#8b949e]">
              ({childCount})
            </span>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col">
              {Array.from(node.children.values()).map((child) =>
                renderTreeNode(child, isStaged, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    if (!node.fileItem) return null;
    const file = node.fileItem;
    const isSelected = selectedFile?.path === file.path && selectedFile.staged === isStaged;

    return (
      <div
        key={`file-${file.path}`}
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
        onClick={() => handleToggleFile(file.path, isStaged)}
        className={`flex items-center justify-between py-1 px-2 rounded text-xs cursor-pointer group select-none transition-colors ${
          isSelected
            ? "bg-[#1f6feb]/20 text-white font-medium border-l-2 border-l-blue-500"
            : "text-[#c9d1d9] hover:bg-[#161b22]"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
          <FileCode className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
          <span className="truncate font-mono text-[11px]">{node.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isStaged) {
                onUnstageFile(file.path);
              } else {
                onStageFile(file.path);
              }
            }}
            className={`p-0.5 rounded transition-colors ${
              isStaged
                ? "hover:bg-rose-950/40 text-[#8b949e] hover:text-rose-400"
                : "hover:bg-emerald-950/40 text-[#8b949e] hover:text-emerald-400"
            }`}
            title={isStaged ? "Quitar de preparados (Unstage)" : "Preparar archivo (Stage)"}
          >
            {isStaged ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-full h-full bg-[#0d1117] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="h-10 border-b border-[#30363d] px-3 flex items-center justify-between text-xs bg-[#161b22] shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white">Área de Cambios (WIP)</span>
          {loading && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-medium">
          {stagedFiles.length + unstagedFiles.length} cambios
        </span>
      </div>

      {/* View Switcher: Path vs Tree, and Sort (Flechas 3 y 4) */}
      <div className="h-8 border-b border-[#30363d]/70 px-3 bg-[#13171f] flex items-center justify-between shrink-0 text-xs select-none">
        {/* Sort button (Path mode) */}
        <div className="flex items-center gap-1.5">
          {viewMode === "path" ? (
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors"
              title={`Ordenar archivos: ${sortAsc ? "Ascendente (A-Z)" : "Descendente (Z-A)"}`}
            >
              <ArrowUpDown className="w-3 h-3 text-blue-400" />
              <span>{sortAsc ? "A-Z" : "Z-A"}</span>
            </button>
          ) : (
            <span className="text-[10px] text-[#484f58] font-mono">Jerarquía</span>
          )}
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center bg-[#0d1117] p-0.5 rounded border border-[#30363d]">
          <button
            onClick={() => setViewMode("path")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              viewMode === "path"
                ? "bg-[#21262d] text-white shadow-xs"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
            title="Vista plana de archivos (Path)"
          >
            <List className="w-3 h-3 text-blue-400" />
            <span>Path</span>
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              viewMode === "tree"
                ? "bg-[#21262d] text-white shadow-xs"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
            title="Vista de árbol por carpetas (Tree)"
          >
            <FolderTree className="w-3 h-3 text-emerald-400" />
            <span>Tree</span>
          </button>
        </div>
      </div>

      {/* Main Files Split View */}
      <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-[#30363d]/50 p-2 gap-2">
        {/* Conflict Alert Banner */}
        {conflictedFiles.length > 0 && (
          <div className="bg-purple-950/30 border border-purple-500/40 rounded p-2.5 text-xs flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{conflictedFiles.length} conflicto(s) pendiente(s)</span>
              </div>
              <Badge label="3-Way Merge" variant="purple" />
            </div>
            <p className="text-[11px] text-[#8b949e]">
              Hay ramas en conflicto que deben resolverse antes de poder continuar o hacer commit.
            </p>
            {onOpenConflictResolver && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full h-6 text-xs bg-purple-900/40 border-purple-500/40 text-purple-200 hover:bg-purple-800/50"
                onClick={() => onOpenConflictResolver(conflictedFiles[0])}
                icon={<GitMerge className="w-3.5 h-3.5 text-purple-300" />}
              >
                Resolver: {conflictedFiles[0]}
              </Button>
            )}
          </div>
        )}

        {/* Section: Staged Files */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Preparados (Staged)
              </span>
              <Badge
                label={String(stagedFiles.length)}
                variant={stagedFiles.length > 0 ? "green" : "gray"}
              />
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
            ) : viewMode === "path" ? (
              sortedStagedFiles.map((file) => (
                <FileItem
                  key={`staged-${file.path}`}
                  path={file.path}
                  status={file.staged_status || "Added"}
                  isStaged={true}
                  isSelected={selectedFile?.path === file.path && selectedFile.staged}
                  isConflicted={conflictedFiles.includes(file.path) || file.is_conflicted}
                  onSelect={() => handleToggleFile(file.path, true)}
                  onAction={() => onUnstageFile(file.path)}
                  onResolveConflict={
                    onOpenConflictResolver ? () => onOpenConflictResolver(file.path) : undefined
                  }
                />
              ))
            ) : (
              stagedTree.map((node) => renderTreeNode(node, true))
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
            ) : viewMode === "path" ? (
              sortedUnstagedFiles.map((file) => (
                <FileItem
                  key={`unstaged-${file.path}`}
                  path={file.path}
                  status={file.unstaged_status || "Modified"}
                  isStaged={false}
                  isSelected={selectedFile?.path === file.path && !selectedFile.staged}
                  isConflicted={conflictedFiles.includes(file.path) || file.is_conflicted}
                  onSelect={() => handleToggleFile(file.path, false)}
                  onAction={() => onStageFile(file.path)}
                  onResolveConflict={
                    onOpenConflictResolver ? () => onOpenConflictResolver(file.path) : undefined
                  }
                />
              ))
            ) : (
              unstagedTree.map((node) => renderTreeNode(node, false))
            )}
          </div>
        </div>
      </div>

      {/* Resizable Divider between file trees and commit box (Flecha 6) */}
      <div
        onPointerDown={handleCommitBoxResizeStart}
        className="h-1.5 w-full bg-[#30363d] hover:bg-blue-500 cursor-row-resize transition-colors shrink-0 z-20 flex items-center justify-center group select-none"
        title="Arrastra para redimensionar verticalmente el panel de escritura de commits"
      >
        <div className="w-8 h-0.5 rounded bg-transparent group-hover:bg-blue-300 transition-colors pointer-events-none" />
      </div>

      {/* Commit Box: Title (Required) + Description (Optional) with Dynamic Height */}
      <div
        style={{ height: commitBoxHeight }}
        className="bg-[#161b22] p-3 flex flex-col gap-2 shrink-0 overflow-hidden"
      >
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
              Título
            </span>
            <span className="text-[10px] text-rose-400 font-bold">*</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono ${
                commitTitle.length > 72
                  ? "text-amber-400 font-bold"
                  : commitTitle.length > 50
                  ? "text-[#8b949e]"
                  : "text-[#484f58]"
              }`}
            >
              {commitTitle.length}/72
            </span>

            <Button
              size="sm"
              variant="ghost"
              disabled={stagedFiles.length === 0 || aiGenerating}
              onClick={handleAiGenerate}
              className="text-amber-400 hover:text-amber-300 py-0.5 px-2 text-xs h-6 border border-amber-500/20 bg-amber-950/20"
              icon={
                <Sparkles
                  className={`w-3.5 h-3.5 ${aiGenerating ? "animate-spin text-amber-300" : ""}`}
                />
              }
              title={
                stagedFiles.length === 0
                  ? "Prepara archivos para generar con IA"
                  : "Generar título y descripción con IA (Conventional Commits)"
              }
            >
              {aiGenerating ? "Analizando..." : "Generar IA"}
            </Button>

            {/* Expand in Dedicated Modal Button (Flecha 6) */}
            <button
              type="button"
              onClick={() => setIsCommitModalOpen(true)}
              className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
              title="Abrir editor de commits en modal ampliado (mayor espacio y libertad)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* AI Error Alert */}
        {aiError && (
          <div className="bg-rose-950/50 border border-rose-500/50 rounded-lg p-2 text-xs flex flex-col gap-1 shrink-0 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Error al generar commit con IA</span>
              </div>
              <button
                type="button"
                onClick={() => setAiError(null)}
                className="text-rose-400 hover:text-white p-0.5 rounded hover:bg-rose-900/50"
                title="Cerrar alerta"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-rose-200 font-mono break-words leading-tight">
              {aiError}
            </p>
          </div>
        )}

        {/* Title Input (Obligatorio) */}
        <input
          type="text"
          value={commitTitle}
          onChange={(e) => setCommitTitle(e.target.value)}
          placeholder="feat(alcance): resumen conciso del cambio..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-hidden font-mono shrink-0"
        />

        {/* Description Textarea (Opcional) - Flexible to expand with height */}
        <div className="flex flex-col gap-1 flex-1 min-h-0">
          <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider shrink-0">
            Descripción (Opcional)
          </span>
          <textarea
            value={commitDescription}
            onChange={(e) => setCommitDescription(e.target.value)}
            placeholder="Detalles adicionales, contexto o notas sobre este cambio..."
            className="w-full flex-1 min-h-[40px] bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-hidden resize-none font-mono leading-relaxed"
          />
        </div>

        <Button
          size="sm"
          variant="primary"
          disabled={stagedFiles.length === 0 || !commitTitle.trim()}
          onClick={handleCommitSubmit}
          className="w-full mt-0.5 shrink-0"
        >
          Commit a {currentBranch || "HEAD"} ({stagedFiles.length})
        </Button>
      </div>

      {/* Dedicated Pop-out Modal for Free & Spacious Commit Writing (Flecha 6) */}
      <CommitEditorModal
        isOpen={isCommitModalOpen}
        commitTitle={commitTitle}
        commitDescription={commitDescription}
        stagedFiles={stagedFiles}
        currentBranch={currentBranch}
        aiGenerating={aiGenerating}
        aiError={aiError}
        onChangeTitle={setCommitTitle}
        onChangeDescription={setCommitDescription}
        onGenerateAiCommit={handleAiGenerate}
        onCommit={() => {
          handleCommitSubmit();
          setIsCommitModalOpen(false);
        }}
        onClose={() => setIsCommitModalOpen(false)}
        onOpenAiConfig={onOpenAiConfig}
      />
    </aside>
  );
};

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
  Tag,
  TagPlus,
  Undo2,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { AccordionSection } from "../../../components/ui/AccordionSection";
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
  onDiscardFile?: (path: string) => void;
  onDiscardAll?: () => void;
  onSelectFile: (path: string, staged: boolean) => void;
  onCommit: (message: string, tag?: string, tagMessage?: string) => void;
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
  onDiscardFile,
  onDiscardAll,
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
  const [commitTag, setCommitTag] = useState("");
  const [commitTagMessage, setCommitTagMessage] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // User adjustable commit box vertical height (Flechas 4, 5, 6)
  const [commitBoxHeight, setCommitBoxHeight] = useState<number>(() => {
    const saved = localStorage.getItem("gitmanager_commit_box_height");
    return saved ? Math.max(230, Math.min(550, parseInt(saved, 10))) : 240;
  });

  const handleCommitBoxResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = commitBoxHeight;
    const onPointerMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY;
      const newH = Math.max(230, Math.min(550, startH + delta));
      setCommitBoxHeight(newH);
      localStorage.setItem("gitmanager_commit_box_height", newH.toString());
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "ns-resize";
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
    onCommit(
      fullMessage,
      commitTag.trim() || undefined,
      commitTagMessage.trim() || undefined
    );
    setCommitTitle("");
    setCommitDescription("");
    setCommitTag("");
    setCommitTagMessage("");
    setShowTagInput(false);
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
    if (stagedFiles.length === 0) {
      setAiError(
        "No hay archivos preparados (staged). Para que la IA analice los cambios y genere el mensaje de commit, primero debes preparar (stage) al menos un archivo."
      );
      return;
    }
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

        if (title.length > 72) {
          title = title.slice(0, 72).trimEnd();
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
              <Folder
                className={`w-3.5 h-3.5 shrink-0 ${isStaged ? "text-emerald-400/80" : "text-[#8b949e] group-hover:text-blue-400"
                  }`}
              />
            ) : (
              <FolderOpen
                className={`w-3.5 h-3.5 shrink-0 ${isStaged ? "text-emerald-400" : "text-blue-400"
                  }`}
              />
            )}
            <span
              className={`font-mono text-[11px] truncate flex-1 ${isStaged ? "text-emerald-200/90" : "text-[#c9d1d9] group-hover:text-white"
                }`}
            >
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
        className={`flex items-center justify-between py-1 px-2 rounded text-xs cursor-pointer group select-none transition-colors ${isSelected
            ? "bg-[#1f6feb]/20 text-white font-medium border-l-2 border-l-blue-500"
            : "text-[#c9d1d9] hover:bg-[#161b22]"
          }`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
          <FileCode className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
          <span className="truncate font-mono text-[11px]">{node.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isStaged && onDiscardFile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDiscardFile(file.path);
              }}
              className="p-0.5 rounded transition-colors hover:bg-rose-950/40 text-[#8b949e] hover:text-rose-400 cursor-pointer"
              title="Descartar cambios de este archivo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isStaged) {
                onUnstageFile(file.path);
              } else {
                onStageFile(file.path);
              }
            }}
            className={`p-0.5 rounded transition-colors cursor-pointer ${isStaged
                ? "hover:bg-rose-950/40 text-[#8b949e] hover:text-rose-400"
                : "hover:bg-emerald-950/40 text-[#8b949e] hover:text-emerald-400"
              }`}
            title={isStaged ? "Quitar de preparados (Unstage)" : "Preparar archivo (Stage)"}
          >
            {isStaged ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
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
          {loading && <RefreshCw className="w-3 h-3 text-blue-400 animate-pulse" />}
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
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${viewMode === "path"
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
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${viewMode === "tree"
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

        {/* Section: Staged Files (Flecha 1 - Acordeón) */}
        <AccordionSection
          title="Preparados (Staged)"
          count={stagedFiles.length}
          badgeClassName="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
          defaultOpen={true}
          action={
            stagedFiles.length > 0 ? (
              <button
                type="button"
                onClick={onUnstageAll}
                className="p-1 rounded hover:bg-rose-950/50 text-[#8b949e] hover:text-rose-400 transition-colors cursor-pointer"
                title="Quitar todos los archivos preparados (Unstage All)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            ) : undefined
          }
        >
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
        </AccordionSection>

        {/* Section: Unstaged Files (Flecha 1 - Acordeón) */}
        <AccordionSection
          title="Sin Preparar (Unstaged)"
          count={unstagedFiles.length}
          badgeClassName="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
          defaultOpen={true}
          action={
            unstagedFiles.length > 0 ? (
              <div className="flex items-center gap-1">
                {onDiscardAll && (
                  <button
                    type="button"
                    onClick={onDiscardAll}
                    className="p-1 rounded hover:bg-rose-950/50 text-[#8b949e] hover:text-rose-400 transition-colors cursor-pointer"
                    title="Descartar todos los cambios no preparados"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onStageAll}
                  className="p-1 rounded hover:bg-emerald-950/50 text-[#8b949e] hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Preparar todos los cambios (Stage All)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : undefined
          }
        >
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
                  onDiscard={onDiscardFile ? () => onDiscardFile(file.path) : undefined}
                  onResolveConflict={
                    onOpenConflictResolver ? () => onOpenConflictResolver(file.path) : undefined
                  }
                />
              ))
            ) : (
              unstagedTree.map((node) => renderTreeNode(node, false))
            )}
          </div>
        </AccordionSection>
      </div>

      {/* Resizable Divider between file trees and commit box (Flechas 4, 5, 6) */}
      <div
        onPointerDown={handleCommitBoxResizeStart}
        style={{ cursor: "ns-resize" }}
        className="h-2 w-full bg-[#30363d] hover:bg-blue-500 cursor-ns-resize transition-colors shrink-0 z-20 flex items-center justify-center group select-none -my-0.5"
        title="Arrastra para redimensionar verticalmente el panel de escritura de commits"
      >
        <div className="w-8 h-0.5 rounded bg-transparent group-hover:bg-blue-300 transition-colors pointer-events-none" />
      </div>

      {/* Commit Box: Title (Required) + Description (Optional) with Dynamic Height */}
      <div
        style={{ height: commitBoxHeight }}
        className="bg-[#161b22] p-3 flex flex-col gap-2 shrink-0 min-h-[230px] overflow-y-auto no-scrollbar justify-start"
      >
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
              Título
            </span>
            <span className="text-[10px] text-rose-400 font-bold">*</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono mr-1 ${commitTitle.length > 72
                  ? "text-amber-400 font-bold"
                  : commitTitle.length > 50
                    ? "text-[#8b949e]"
                    : "text-[#484f58]"
                }`}
            >
              {commitTitle.length}/72
            </span>

            {/* Compact AI Icon Button (Flecha 2) */}
            <button
              type="button"
              disabled={aiGenerating}
              onClick={handleAiGenerate}
              className={`p-1.5 rounded transition-colors cursor-pointer border ${aiGenerating
                  ? "bg-amber-950/40 border-amber-500/50 text-amber-300"
                  : stagedFiles.length === 0
                    ? "text-amber-400/70 hover:text-amber-300 hover:bg-amber-950/20 border-amber-500/20 bg-amber-950/10"
                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 border-amber-500/20 bg-amber-950/10"
                }`}
              title={
                stagedFiles.length === 0
                  ? "Haz clic para saber cómo usar la IA (requiere archivos preparados)"
                  : aiGenerating
                    ? "Analizando cambios con IA..."
                    : "Generar título y descripción con IA"
              }
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${aiGenerating ? "animate-pulse text-amber-300" : ""}`}
              />
            </button>

            {/* TagPlus Switch Button (Flecha 2) */}
            <button
              type="button"
              onClick={() => setShowTagInput((prev) => !prev)}
              className={`p-1.5 rounded transition-colors cursor-pointer border ${showTagInput || commitTag.trim()
                  ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-xs"
                  : "text-[#8b949e] hover:text-white hover:bg-[#21262d] border-transparent"
                }`}
              title={
                showTagInput
                  ? "Ocultar campo de etiqueta / tag"
                  : "Crear y asignar etiqueta (tag) a este commit"
              }
            >
              <TagPlus className="w-3.5 h-3.5" />
            </button>

            {/* Expand in Dedicated Modal Button */}
            <button
              type="button"
              onClick={() => setIsCommitModalOpen(true)}
              className="p-1.5 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
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
                <span>Aviso de IA</span>
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

        {/* Title Input (Obligatorio, máx 72 caracteres estrictos) */}
        <input
          type="text"
          maxLength={72}
          value={commitTitle}
          onChange={(e) => setCommitTitle(e.target.value)}
          placeholder="feat(alcance): resumen conciso del cambio..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-hidden font-mono shrink-0"
        />

        {/* Description Textarea (Opcional) - Flexible to expand with height, min-h-[48px], no collision */}
        <div className="flex flex-col gap-1 flex-1 min-h-[48px]">
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

        {/* Dedicated Tag Input Row (Flecha 3: Ubicado DEBAJO de la descripción) */}
        {(showTagInput || commitTag.trim()) && (
          <div className="flex items-center gap-1.5 bg-[#0d1117] border border-emerald-500/40 rounded px-2.5 py-1 shrink-0 animate-in fade-in duration-150">
            <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={commitTag}
              onChange={(e) => setCommitTag(e.target.value)}
              placeholder="Nombre del tag (ej: v0.1.1)..."
              className="w-full bg-transparent border-none text-xs text-emerald-300 placeholder-[#484f58] focus:outline-hidden font-mono"
              autoFocus
            />
            {commitTag.trim() && (
              <button
                type="button"
                onClick={() => setCommitTag("")}
                className="text-[#8b949e] hover:text-white p-0.5 cursor-pointer"
                title="Borrar etiqueta"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <Button
          size="sm"
          variant="primary"
          disabled={stagedFiles.length === 0 || !commitTitle.trim()}
          onClick={handleCommitSubmit}
          className="w-full mt-0.5 shrink-0"
        >
          {commitTag.trim()
            ? `Commit & Tag "${commitTag.trim()}"`
            : `Commit a ${currentBranch || "HEAD"} (${stagedFiles.length})`}
        </Button>
      </div>

      {/* Dedicated Pop-out Modal for Free & Spacious Commit Writing */}
      <CommitEditorModal
        isOpen={isCommitModalOpen}
        commitTitle={commitTitle}
        commitDescription={commitDescription}
        commitTag={commitTag}
        commitTagMessage={commitTagMessage}
        stagedFiles={stagedFiles}
        currentBranch={currentBranch}
        aiGenerating={aiGenerating}
        aiError={aiError}
        onChangeTitle={setCommitTitle}
        onChangeDescription={setCommitDescription}
        onChangeTag={setCommitTag}
        onChangeTagMessage={setCommitTagMessage}
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

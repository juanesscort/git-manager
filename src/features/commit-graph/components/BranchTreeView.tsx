import React, { useState, useMemo } from "react";
import { Folder, FolderOpen, GitBranch, Cloud, ChevronRight, ChevronDown, Check } from "lucide-react";
import { BranchInfo } from "../../../types/git";

interface BranchTreeViewProps {
  branches: BranchInfo[];
  currentBranch?: string | null;
  isRemote?: boolean;
  onSelectBranch?: (branchName: string, targetOid: string) => void;
  onContextMenu?: (
    x: number,
    y: number,
    branchName: string,
    isHead: boolean,
    isRemote: boolean,
    commitOid?: string
  ) => void;
  onDropBranch?: (
    sourceBranch: string,
    targetBranch: string,
    sourceIsRemote: boolean,
    targetIsRemote: boolean
  ) => void;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  branch?: BranchInfo;
  children: Map<string, TreeNode>;
}

export const BranchTreeView: React.FC<BranchTreeViewProps> = ({
  branches,
  currentBranch,
  isRemote = false,
  onSelectBranch,
  onContextMenu,
  onDropBranch,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [dragOverBranch, setDragOverBranch] = useState<string | null>(null);

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Build the hierarchical tree from branch names with "/"
  const treeRoots = useMemo(() => {
    const root = new Map<string, TreeNode>();

    for (const b of branches) {
      const parts = b.name.split("/");
      let currentMap = root;
      let pathAccumulator = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        pathAccumulator = pathAccumulator ? `${pathAccumulator}/${part}` : part;
        const isLeaf = i === parts.length - 1;

        if (!currentMap.has(part)) {
          currentMap.set(part, {
            name: part,
            fullPath: pathAccumulator,
            isFolder: !isLeaf,
            branch: isLeaf ? b : undefined,
            children: new Map(),
          });
        }

        const node = currentMap.get(part)!;
        if (isLeaf) {
          node.branch = b;
        }
        currentMap = node.children;
      }
    }

    return Array.from(root.values());
  }, [branches]);

  const renderNode = (node: TreeNode, depth = 0) => {
    if (node.isFolder) {
      const isCollapsed = !!collapsedFolders[node.fullPath];
      const childCount = node.children.size;

      return (
        <div key={`folder-${node.fullPath}`} className="flex flex-col">
          <button
            onClick={() => toggleFolder(node.fullPath)}
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
            className="flex items-center gap-1.5 py-1 px-1.5 rounded text-xs text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22] transition-colors group select-none text-left w-full"
            title={`Carpeta de ramas: ${node.fullPath}`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3 text-[#484f58] group-hover:text-[#8b949e] shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[#484f58] group-hover:text-[#8b949e] shrink-0" />
            )}
            {isCollapsed ? (
              <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="font-mono text-[11px] font-medium text-amber-200/90 truncate flex-1">
              {node.name}
            </span>
            <span className="text-[9px] font-mono text-[#484f58] px-1 bg-[#161b22] rounded border border-[#30363d]/50">
              {childCount}
            </span>
          </button>

          {!isCollapsed && (
            <div className="flex flex-col">
              {Array.from(node.children.values()).map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf branch item
    const isHead = node.branch?.is_head || node.branch?.name === currentBranch;
    const isSelected = isHead;
    const isDragTarget = dragOverBranch === node.fullPath;

    return (
      <div
        key={`branch-${node.fullPath}`}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData("application/git-branch", node.fullPath);
          e.dataTransfer.setData("application/is-remote", String(isRemote));
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/git-branch")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverBranch !== node.fullPath) {
              setDragOverBranch(node.fullPath);
            }
          }
        }}
        onDragLeave={() => {
          if (dragOverBranch === node.fullPath) {
            setDragOverBranch(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverBranch(null);
          const source = e.dataTransfer.getData("application/git-branch");
          const sourceIsRemote = e.dataTransfer.getData("application/is-remote") === "true";
          if (source && source !== node.fullPath && onDropBranch) {
            onDropBranch(source, node.fullPath, sourceIsRemote, isRemote);
          }
        }}
        onClick={() => onSelectBranch && node.branch && onSelectBranch(node.fullPath, node.branch.target_oid)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onContextMenu) {
            onContextMenu(
              e.clientX,
              e.clientY,
              node.fullPath,
              isHead,
              isRemote,
              node.branch?.target_oid
            );
          }
        }}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`flex items-center gap-2 py-1 px-2 rounded text-xs transition-all cursor-pointer group select-none relative ${
          isDragTarget
            ? "bg-blue-600/30 border-2 border-dashed border-blue-400 text-white scale-[1.02]"
            : isSelected
            ? "bg-[#1f6feb]/20 text-white font-medium border border-blue-600/30 shadow-sm"
            : "text-[#c9d1d9] hover:bg-[#161b22] border border-transparent"
        }`}
        title={`${isRemote ? "Rama remota" : "Rama local"}: ${node.fullPath} (Clic derecho para menú de opciones, arrastra para merge/pull)`}
      >
        {isRemote ? (
          <Cloud className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        ) : (
          <GitBranch
            className={`w-3.5 h-3.5 shrink-0 ${
              isSelected ? "text-blue-400" : "text-[#8b949e] group-hover:text-blue-400"
            }`}
          />
        )}

        <span className="truncate font-mono text-[11px] flex-1">{node.name}</span>

        {isHead && (
          <span className="ml-auto text-[9px] bg-blue-500/20 px-1 py-0.2 rounded text-blue-300 font-mono shrink-0 flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5 text-blue-400" /> HEAD
          </span>
        )}
      </div>
    );
  };

  if (branches.length === 0) {
    return (
      <p className="text-[11px] text-[#484f58] italic px-2 py-1">
        {isRemote ? "Sin ramas remotas (origin)." : "Sin ramas."}
      </p>
    );
  }

  return <div className="flex flex-col gap-0.5">{treeRoots.map((root) => renderNode(root))}</div>;
};

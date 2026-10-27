import React from "react";
import { FileStatusKind } from "../../../types/git";
import { Plus, Minus, FileCode } from "lucide-react";

interface FileItemProps {
  path: string;
  status: FileStatusKind;
  isStaged: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onAction: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  path,
  status,
  isStaged,
  isSelected,
  onSelect,
  onAction,
}) => {
  const statusConfig: Record<FileStatusKind, { label: string; color: string; bg: string }> = {
    Added: { label: "A", color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800" },
    Untracked: { label: "U", color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800" },
    Modified: { label: "M", color: "text-amber-400", bg: "bg-amber-950/40 border-amber-800" },
    Deleted: { label: "D", color: "text-rose-400", bg: "bg-rose-950/40 border-rose-800" },
    Renamed: { label: "R", color: "text-blue-400", bg: "bg-blue-950/40 border-blue-800" },
    Conflicted: { label: "C", color: "text-purple-400", bg: "bg-purple-950/40 border-purple-800" },
  };

  const badge = statusConfig[status] || {
    label: "?",
    color: "text-gray-400",
    bg: "bg-gray-800 border-gray-700",
  };

  // Split path for cleaner visual display
  const parts = path.split("/");
  const fileName = parts.pop() || path;
  const dirPath = parts.join("/");

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors border ${
        isSelected
          ? "bg-[#1f6feb]/20 border-blue-600/50 text-white"
          : "border-transparent hover:bg-[#161b22] text-[#c9d1d9]"
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
        <span
          className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center border shrink-0 ${badge.bg} ${badge.color}`}
          title={status}
        >
          {badge.label}
        </span>
        <FileCode className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
        <span className="font-mono text-xs truncate">
          {fileName}
          {dirPath && <span className="text-[10px] text-[#484f58] ml-1.5">({dirPath})</span>}
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction();
        }}
        title={isStaged ? "Deshacer preparación (Unstage)" : "Preparar archivo (Stage)"}
        className={`p-1 rounded transition-colors shrink-0 ${
          isStaged
            ? "hover:bg-rose-950/50 text-[#8b949e] hover:text-rose-400"
            : "hover:bg-emerald-950/50 text-[#8b949e] hover:text-emerald-400"
        }`}
      >
        {isStaged ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

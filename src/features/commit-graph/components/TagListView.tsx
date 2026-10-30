import React, { useState, useEffect, useRef } from "react";
import { Tag, Trash2, Copy, Check, UploadCloud, Download, Edit3, Cloud, HardDrive, CheckCircle2 } from "lucide-react";
import { UnifiedGitTag } from "../../../types/git";

interface TagListViewProps {
  tags: UnifiedGitTag[];
  onSelectTag?: (targetCommitId: string) => void;
  onOpenTagDetails?: (tag: UnifiedGitTag) => void;
  onOpenDeleteTag?: (tag: UnifiedGitTag) => void;
  onDeleteTag?: (name: string, deleteLocal?: boolean, deleteRemote?: boolean) => void;
  onPushTag?: (name: string) => void;
  onFetchTag?: (name: string) => void;
  pushingTag?: string | null;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  tag: UnifiedGitTag | null;
}

export const TagListView: React.FC<TagListViewProps> = ({
  tags,
  onSelectTag,
  onOpenTagDetails,
  onOpenDeleteTag,
  onDeleteTag,
  onPushTag,
  onFetchTag,
  pushingTag,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    tag: null,
  });
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [fetchingTag, setFetchingTag] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
      }
    };

    if (contextMenu.isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu.isOpen]);

  const handleContextMenu = (e: React.MouseEvent, tag: UnifiedGitTag) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 200),
      tag,
    });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
      setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
    }, 800);
  };

  if (tags.length === 0) {
    return (
      <p className="text-[11px] text-[#484f58] italic px-2 py-1 select-none">
        Sin etiquetas (tags). Pulsa + para crear una.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 select-none relative">
      {tags.map((tag) => {
        const isPushing = pushingTag === tag.name;
        const isFetching = fetchingTag === tag.name;
        const isSynced = tag.is_local && tag.is_remote;
        const isLocalOnly = tag.is_local && !tag.is_remote;
        const isRemoteOnly = !tag.is_local && tag.is_remote;

        return (
          <div
            key={`tag-${tag.name}`}
            onClick={() => {
              if (tag.target_commit_id && onSelectTag) {
                onSelectTag(tag.target_commit_id);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenTagDetails && onOpenTagDetails(tag);
            }}
            onContextMenu={(e) => handleContextMenu(e, tag)}
            className="flex flex-col py-1.5 px-2 rounded hover:bg-[#161b22] transition-colors cursor-pointer group"
            title={`${
              tag.is_annotated ? "Etiqueta anotada" : "Etiqueta"
            }: ${tag.name} ${
              isSynced
                ? "(Sincronizada en Local y GitHub)"
                : isLocalOnly
                ? "(Solo en Local)"
                : "(Solo en GitHub)"
            }${tag.target_commit_id ? `\nCommit: ${tag.target_commit_id}` : ""}${
              tag.message ? `\n\n"${tag.message}"` : ""
            }\n\n(Doble clic para ver/editar, clic derecho para opciones)`}
          >
            {/* First Row: Tag Name, Status Badge & Actions */}
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 mr-1">
                <span className="font-mono text-[11px] font-semibold text-emerald-300 truncate block">
                  {tag.name}
                </span>

                {/* Status Badges */}
                {isSynced && (
                  <span
                    className="px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 shrink-0"
                    title="Etiqueta sincronizada en local y en GitHub"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Sync</span>
                  </span>
                )}

                {isLocalOnly && (
                  <span
                    className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 shrink-0"
                    title="Etiqueta presente solo en tu clon local"
                  >
                    <HardDrive className="w-2.5 h-2.5" />
                    <span>Local</span>
                  </span>
                )}

                {isRemoteOnly && (
                  <span
                    className="px-1 py-0.2 rounded text-[9px] font-mono bg-sky-950/40 text-sky-300 border border-sky-500/30 flex items-center gap-0.5 shrink-0"
                    title="Etiqueta presente en GitHub pero ausente en local"
                  >
                    <Cloud className="w-2.5 h-2.5" />
                    <span>GitHub</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* View/Edit Button (Hover) */}
                {onOpenTagDetails && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTagDetails(tag);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-all cursor-pointer"
                    title="Ver y editar detalles de la etiqueta"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Local Only -> Push to GitHub Button */}
                {isLocalOnly && onPushTag && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPushing) onPushTag(tag.name);
                    }}
                    disabled={isPushing}
                    className="p-1 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    title="Subir a GitHub (git push origin)"
                  >
                    <UploadCloud
                      className={`w-3.5 h-3.5 ${isPushing ? "animate-pulse" : ""}`}
                    />
                  </button>
                )}

                {/* Remote Only -> Fetch to Local Button */}
                {isRemoteOnly && onFetchTag && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!isFetching) {
                        setFetchingTag(tag.name);
                        try {
                          await onFetchTag(tag.name);
                        } finally {
                          setFetchingTag(null);
                        }
                      }
                    }}
                    disabled={isFetching}
                    className="p-1 rounded hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                    title="Traer a local (git fetch origin refs/tags/...)"
                  >
                    <Download
                      className={`w-3.5 h-3.5 ${isFetching ? "animate-pulse" : ""}`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Second Row: Tag Description if present */}
            {tag.message && tag.message.trim() && (
              <div className="text-[10px] text-[#8b949e] font-sans truncate pr-1 mt-0.5 leading-tight">
                {tag.message.trim()}
              </div>
            )}
          </div>
        );
      })}

      {/* Context Menu (Right Click) */}
      {contextMenu.isOpen && contextMenu.tag && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-60 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl py-1 text-xs text-[#c9d1d9] animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-3 py-1.5 border-b border-[#30363d] font-mono font-bold text-[11px] text-white flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{contextMenu.tag.name}</span>
            </div>
            <span className="text-[9px] font-mono text-[#8b949e]">
              {contextMenu.tag.is_local && contextMenu.tag.is_remote
                ? "Sincronizado"
                : contextMenu.tag.is_local
                ? "Solo Local"
                : "Solo GitHub"}
            </span>
          </div>

          {/* Option: View & Edit Tag Details */}
          {onOpenTagDetails && (
            <button
              type="button"
              onClick={() => {
                if (contextMenu.tag) {
                  onOpenTagDetails(contextMenu.tag);
                }
                setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] flex items-center gap-2 text-[#c9d1d9] hover:text-white transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver y editar detalles...</span>
            </button>
          )}

          {/* Option: Fetch Tag to Local (if Remote Only) */}
          {contextMenu.tag.is_remote && !contextMenu.tag.is_local && onFetchTag && (
            <button
              type="button"
              onClick={() => {
                if (contextMenu.tag) {
                  onFetchTag(contextMenu.tag.name);
                }
                setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] flex items-center gap-2 text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Traer a local (Fetch Tag)</span>
            </button>
          )}

          {/* Option: Push Tag to GitHub (if Local Only) */}
          {contextMenu.tag.is_local && !contextMenu.tag.is_remote && onPushTag && (
            <button
              type="button"
              onClick={() => {
                if (contextMenu.tag) {
                  onPushTag(contextMenu.tag.name);
                }
                setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] flex items-center gap-2 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Subir a GitHub (Push Tag)</span>
            </button>
          )}

          {/* Option: Copy Tag Name */}
          <button
            type="button"
            onClick={() => handleCopy(contextMenu.tag!.name, "name")}
            className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] flex items-center gap-2 text-[#c9d1d9] hover:text-white transition-colors cursor-pointer"
          >
            {copiedType === "name" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#8b949e]" />
            )}
            <span>
              {copiedType === "name" ? "¡Copiado!" : "Copiar nombre de etiqueta"}
            </span>
          </button>

          {/* Option: Delete Tag */}
          {(onOpenDeleteTag || onDeleteTag) && (
            <div className="border-t border-[#30363d]/70 mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (contextMenu.tag) {
                    if (onOpenDeleteTag) {
                      onOpenDeleteTag(contextMenu.tag);
                    } else if (onOpenTagDetails) {
                      onOpenTagDetails(contextMenu.tag);
                    }
                  }
                  setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar etiqueta...</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

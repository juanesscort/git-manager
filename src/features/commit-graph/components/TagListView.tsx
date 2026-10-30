import React, { useState, useEffect, useRef } from "react";
import { Tag, Trash2, Copy, Check, UploadCloud } from "lucide-react";
import { GitTag } from "../../../types/git";

interface TagListViewProps {
  tags: GitTag[];
  onSelectTag?: (targetCommitId: string) => void;
  onDeleteTag?: (name: string) => void;
  onPushTag?: (name: string) => void;
  pushingTag?: string | null;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  tag: GitTag | null;
}

export const TagListView: React.FC<TagListViewProps> = ({
  tags,
  onSelectTag,
  onDeleteTag,
  onPushTag,
  pushingTag,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    tag: null,
  });
  const [copiedType, setCopiedType] = useState<string | null>(null);
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

  const handleContextMenu = (e: React.MouseEvent, tag: GitTag) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 180),
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

        return (
          <div
            key={`tag-${tag.name}`}
            onClick={() => onSelectTag && onSelectTag(tag.target_commit_id)}
            onContextMenu={(e) => handleContextMenu(e, tag)}
            className="flex flex-col py-1 px-2 rounded hover:bg-[#161b22] transition-colors cursor-pointer group"
            title={`${tag.is_annotated ? "Etiqueta anotada" : "Etiqueta ligera"}: ${tag.name} (Commit: ${tag.target_commit_id})${tag.message ? `\n\n"${tag.message}"` : ""}\n\n(Clic derecho para más opciones)`}
          >
            {/* First Row: Tag Name & Right Push Button (No redundant icon, clean text) */}
            <div className="flex items-center justify-between min-w-0">
              <div className="truncate flex-1 min-w-0 mr-1">
                <span className="font-mono text-[11px] font-semibold text-emerald-300 truncate block">
                  {tag.name}
                </span>
              </div>

              {/* Push to GitHub: Only icon, pegged to the right, hidden if already remote */}
              {!tag.is_remote && onPushTag && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isPushing) onPushTag(tag.name);
                  }}
                  disabled={isPushing}
                  className="shrink-0 p-1 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  title="Etiqueta solo en local. Clic para subir a GitHub (git push origin)"
                >
                  <UploadCloud
                    className={`w-3.5 h-3.5 ${isPushing ? "animate-pulse" : ""}`}
                  />
                </button>
              )}
            </div>

            {/* Second Row: Tag Description if present (Flecha 4) */}
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
          className="fixed z-50 w-56 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl py-1 text-xs text-[#c9d1d9] animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-3 py-1.5 border-b border-[#30363d] font-mono font-bold text-[11px] text-white flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">{contextMenu.tag.name}</span>
          </div>

          {/* Option: Push Tag to GitHub */}
          {onPushTag && (
            <button
              type="button"
              disabled={contextMenu.tag.is_remote}
              onClick={() => {
                if (contextMenu.tag && !contextMenu.tag.is_remote) {
                  onPushTag(contextMenu.tag.name);
                }
                setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
              }}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${
                contextMenu.tag.is_remote
                  ? "text-[#484f58] opacity-50 cursor-not-allowed"
                  : "text-[#c9d1d9] hover:text-white hover:bg-[#21262d] cursor-pointer"
              }`}
            >
              <UploadCloud
                className={`w-3.5 h-3.5 ${
                  contextMenu.tag.is_remote ? "text-[#484f58]" : "text-amber-400"
                }`}
              />
              <span>
                {contextMenu.tag.is_remote
                  ? "Etiqueta ya subida a GitHub"
                  : "Subir etiqueta a GitHub"}
              </span>
            </button>
          )}

          {/* Option: Copy Commit Hash */}
          <button
            type="button"
            onClick={() => {
              if (contextMenu.tag) {
                handleCopy(contextMenu.tag.target_commit_id, "hash");
              }
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] flex items-center gap-2 text-[#c9d1d9] hover:text-white transition-colors cursor-pointer"
          >
            {copiedType === "hash" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>
              {copiedType === "hash"
                ? "¡Hash copiado!"
                : `Copiar hash (${contextMenu.tag.short_target_id})`}
            </span>
          </button>

          {/* Option: Copy Tag Name */}
          <button
            type="button"
            onClick={() => {
              if (contextMenu.tag) {
                handleCopy(contextMenu.tag.name, "name");
              }
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#21262d] flex items-center gap-2 text-[#c9d1d9] hover:text-white transition-colors cursor-pointer"
          >
            {copiedType === "name" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{copiedType === "name" ? "¡Nombre copiado!" : "Copiar nombre del tag"}</span>
          </button>

          <div className="my-1 border-t border-[#30363d]" />

          {/* Option: Delete Tag */}
          {onDeleteTag && (
            <button
              type="button"
              onClick={() => {
                const tagName = contextMenu.tag?.name;
                setContextMenu({ isOpen: false, x: 0, y: 0, tag: null });
                if (
                  tagName &&
                  window.confirm(
                    `¿Seguro que deseas eliminar la etiqueta '${tagName}'?`
                  )
                ) {
                  onDeleteTag(tagName);
                }
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar etiqueta</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

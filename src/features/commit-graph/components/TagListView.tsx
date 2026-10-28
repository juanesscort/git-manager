import React, { useState } from "react";
import { Tag, Trash2, Copy, Check, GitCommit } from "lucide-react";
import { GitTag } from "../../../types/git";

interface TagListViewProps {
  tags: GitTag[];
  onSelectTag?: (targetCommitId: string) => void;
  onDeleteTag?: (name: string) => void;
}

export const TagListView: React.FC<TagListViewProps> = ({
  tags,
  onSelectTag,
  onDeleteTag,
}) => {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleCopyHash = (e: React.MouseEvent, commitId: string, tagName: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(commitId);
    setCopiedTag(tagName);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  if (tags.length === 0) {
    return (
      <p className="text-[11px] text-[#484f58] italic px-2 py-1 select-none">
        Sin etiquetas (tags). Pulsa + para crear una.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 select-none">
      {tags.map((tag) => {
        const isCopied = copiedTag === tag.name;

        return (
          <div
            key={`tag-${tag.name}`}
            onClick={() => onSelectTag && onSelectTag(tag.target_commit_id)}
            className="flex items-center justify-between py-1 px-2 rounded text-xs text-[#c9d1d9] hover:bg-[#161b22] hover:text-white transition-colors cursor-pointer group"
            title={`${tag.is_annotated ? "Etiqueta anotada" : "Etiqueta ligera"}: ${tag.name} (Commit: ${tag.target_commit_id})${tag.message ? `\n\n"${tag.message}"` : ""}`}
          >
            <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
              <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono text-[11px] font-semibold text-emerald-300 truncate">
                {tag.name}
              </span>
              <span className="font-mono text-[9px] text-[#8b949e] px-1 bg-[#161b22] border border-[#30363d]/60 rounded shrink-0 flex items-center gap-0.5">
                <GitCommit className="w-2.5 h-2.5 text-purple-400" />
                {tag.short_target_id}
              </span>
            </div>

            {/* Actions: Copy Hash & Delete Tag */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={(e) => handleCopyHash(e, tag.target_commit_id, tag.name)}
                className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors"
                title="Copiar Hash del commit"
              >
                {isCopied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>

              {onDeleteTag && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`¿Seguro que deseas eliminar la etiqueta '${tag.name}'?`)) {
                      onDeleteTag(tag.name);
                    }
                  }}
                  className="p-1 text-[#8b949e] hover:text-rose-400 rounded hover:bg-rose-950/40 transition-colors"
                  title="Eliminar etiqueta"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React from "react";
import { GraphNode } from "../hooks/useCommitGraph";
import { CommitInfo } from "../../../types/git";
import { GitCommit, User, Calendar, Hash } from "lucide-react";

interface CommitGraphProps {
  nodes: GraphNode[];
  selectedCommit: CommitInfo | null;
  loading: boolean;
  onSelectCommit: (commit: CommitInfo) => void;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  nodes,
  selectedCommit,
  loading,
  onSelectCommit,
}) => {
  if (loading && nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#8b949e] text-xs">
        <span className="animate-pulse">Cargando árbol de commits...</span>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8b949e] text-xs">
        <GitCommit className="w-12 h-12 mb-3 opacity-30 text-blue-400" />
        <p className="font-medium text-white text-sm">Este repositorio no tiene commits</p>
        <p className="mt-1">Prepara tus primeros archivos y confirma los cambios para ver el grafo de ramas.</p>
      </div>
    );
  }

  // Maximum lane index determines SVG column width
  const maxLane = Math.max(...nodes.map((n) => n.lane), 0);
  const svgWidth = Math.max(48, (maxLane + 1) * 20 + 20);
  const rowHeight = 36;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#010409]">
      {/* Table Header */}
      <div className="h-8 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider shrink-0 select-none">
        <div style={{ width: svgWidth }} className="shrink-0 text-center">
          Grafo
        </div>
        <div className="flex-1 px-3">Mensaje del Commit</div>
        <div className="w-36 px-2">Autor</div>
        <div className="w-28 px-2">Fecha</div>
        <div className="w-20 px-2 text-right">Hash</div>
      </div>

      {/* Virtualized/Scrollable Commit List with SVG Graph */}
      <div className="flex-1 overflow-auto relative">
        <div className="flex flex-col">
          {nodes.map((node, idx) => {
            const { commit, lane, color } = node;
            const isSelected = selectedCommit?.oid === commit.oid;
            const dateStr = new Date(commit.timestamp * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const cx = 14 + lane * 18;
            const cy = rowHeight / 2;

            return (
              <div
                key={commit.oid}
                onClick={() => onSelectCommit(commit)}
                style={{ height: rowHeight }}
                className={`flex items-center text-xs cursor-pointer border-b border-[#21262d]/50 transition-colors ${
                  isSelected
                    ? "bg-[#1f6feb]/20 text-white font-medium"
                    : "hover:bg-[#161b22]/70 text-[#c9d1d9]"
                }`}
              >
                {/* SVG Graph Lane Node */}
                <div
                  style={{ width: svgWidth, height: rowHeight }}
                  className="shrink-0 relative overflow-visible"
                >
                  <svg width={svgWidth} height={rowHeight} className="overflow-visible">
                    {/* Vertical connecting line to previous row */}
                    {idx > 0 && (
                      <line
                        x1={cx}
                        y1={0}
                        x2={cx}
                        y2={cy}
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Vertical connecting line to next row */}
                    {idx < nodes.length - 1 && (
                      <line
                        x1={cx}
                        y1={cy}
                        x2={cx}
                        y2={rowHeight}
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Commit Node Circle */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? "5.5" : "4.5"}
                      fill={color}
                      stroke="#0d1117"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Commit Summary */}
                <div className="flex-1 px-3 truncate font-sans text-xs">
                  <span className="font-mono text-white text-xs">{commit.summary}</span>
                  {commit.parent_oids.length > 1 && (
                    <span className="ml-2 px-1.5 py-0.2 bg-purple-950/60 text-purple-300 border border-purple-800 rounded text-[10px]">
                      Merge
                    </span>
                  )}
                </div>

                {/* Author */}
                <div className="w-36 px-2 truncate flex items-center gap-1.5 text-[11px] text-[#8b949e]">
                  <User className="w-3 h-3 text-[#484f58] shrink-0" />
                  <span className="truncate">{commit.author_name}</span>
                </div>

                {/* Date */}
                <div className="w-28 px-2 flex items-center gap-1 text-[11px] text-[#8b949e]">
                  <Calendar className="w-3 h-3 text-[#484f58] shrink-0" />
                  <span>{dateStr}</span>
                </div>

                {/* Short Hash */}
                <div className="w-20 px-2 text-right">
                  <span className="font-mono text-[11px] bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d] text-blue-400">
                    {commit.short_oid}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Commit Detail Bar */}
      {selectedCommit && (
        <div className="h-16 border-t border-[#30363d] bg-[#161b22] px-4 py-2 flex items-center justify-between text-xs shrink-0 select-text">
          <div className="flex flex-col gap-0.5 overflow-hidden mr-4">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-white truncate text-xs">
                {selectedCommit.summary}
              </span>
              <span className="text-[10px] bg-[#21262d] px-1.5 py-0.2 rounded text-[#8b949e] font-mono">
                {selectedCommit.oid}
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] truncate">
              Por <span className="text-white">{selectedCommit.author_name}</span> ({selectedCommit.author_email})
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-[11px] text-[#8b949e] font-mono">
              <Hash className="w-3.5 h-3.5 text-blue-400" />
              <span>{selectedCommit.parent_oids.length} padres</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

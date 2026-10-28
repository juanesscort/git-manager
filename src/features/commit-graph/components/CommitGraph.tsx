import React from "react";
import { GraphNode, LANE_COLORS } from "../hooks/useCommitGraph";
import { CommitInfo, BranchesSummary } from "../../../types/git";
import { GitCommit, User, Calendar, GitBranch, Cloud, Check } from "lucide-react";

interface CommitGraphProps {
  nodes: GraphNode[];
  selectedCommit: CommitInfo | null;
  loading: boolean;
  branches?: BranchesSummary;
  onSelectCommit: (commit: CommitInfo) => void;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  nodes,
  selectedCommit,
  loading,
  branches,
  onSelectCommit,
}) => {
  if (loading && nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#8b949e] text-xs">
        <span className="animate-pulse">Cargando árbol de commits y ramas...</span>
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

  // Pre-calculate branch map: target_oid -> { local: BranchInfo[], remote: BranchInfo[] }
  const branchMap = new Map<
    string,
    { local: string[]; remote: string[]; isHead: boolean }
  >();

  if (branches) {
    for (const b of branches.local) {
      if (!b.target_oid) continue;
      const entry = branchMap.get(b.target_oid) || { local: [], remote: [], isHead: false };
      entry.local.push(b.name);
      if (b.is_head) entry.isHead = true;
      branchMap.set(b.target_oid, entry);
    }

    for (const b of branches.remote) {
      if (!b.target_oid) continue;
      const entry = branchMap.get(b.target_oid) || { local: [], remote: [], isHead: false };
      entry.remote.push(b.name);
      branchMap.set(b.target_oid, entry);
    }
  }

  // Calculate maximum lane index to size the SVG column
  const maxLane = Math.max(...nodes.map((n) => Math.max(n.lane, ...(n.parentLanes || []))), 0);
  const laneSpacing = 22;
  const svgWidth = Math.max(54, (maxLane + 1) * laneSpacing + 20);
  const rowHeight = 36;
  const cy = rowHeight / 2;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#010409]">
      {/* Table Header */}
      <div className="h-8 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider shrink-0 select-none">
        <div className="w-48 shrink-0 px-2">Ramas / Estado</div>
        <div style={{ width: svgWidth }} className="shrink-0 text-center">
          Grafo
        </div>
        <div className="flex-1 px-3">Mensaje del Commit</div>
        <div className="w-36 px-2">Autor</div>
        <div className="w-28 px-2">Fecha</div>
        <div className="w-20 px-2 text-right">Hash</div>
      </div>

      {/* Virtualized/Scrollable Commit List with GitKraken-styled Graph */}
      <div className="flex-1 overflow-auto relative">
        <div className="flex flex-col">
          {nodes.map((node, idx) => {
            const { commit, lane, color, parentLanes = [], activeLanes = [] } = node;
            const isSelected = selectedCommit?.oid === commit.oid;
            const commitBranches = branchMap.get(commit.oid);
            const isHead = commitBranches?.isHead || false;

            const dateStr = new Date(commit.timestamp * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const cx = 14 + lane * laneSpacing;

            return (
              <div
                key={commit.oid}
                onClick={() => onSelectCommit(commit)}
                style={{ height: rowHeight }}
                className={`flex items-center text-xs cursor-pointer border-b border-[#21262d]/40 transition-colors group ${
                  isSelected
                    ? "bg-[#1f6feb]/20 text-white font-medium border-l-2 border-l-blue-500"
                    : "hover:bg-[#161b22]/70 text-[#c9d1d9]"
                }`}
              >
                {/* 1. Branch Badges Column (GitKraken style) */}
                <div className="w-48 shrink-0 px-2 flex items-center gap-1.5 overflow-hidden">
                  {commitBranches && (
                    <div className="flex items-center gap-1 overflow-hidden truncate">
                      {/* Local Branches pointing to this commit */}
                      {commitBranches.local.map((bName) => (
                        <div
                          key={`local-${bName}`}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 transition-shadow ${
                            bName === "main" || isHead
                              ? "bg-blue-950/60 text-blue-300 border-blue-500/60 shadow-sm"
                              : "bg-emerald-950/50 text-emerald-300 border-emerald-600/50"
                          }`}
                          title={`Rama local: ${bName}${isHead ? " (HEAD actual)" : ""}`}
                        >
                          {isHead ? (
                            <Check className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          ) : (
                            <GitBranch className="w-2.5 h-2.5 shrink-0" />
                          )}
                          <span className="truncate max-w-[90px]">{bName}</span>
                        </div>
                      ))}

                      {/* Remote Branches pointing to this commit */}
                      {commitBranches.remote.map((rName) => (
                        <div
                          key={`remote-${rName}`}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/60 shrink-0"
                          title={`Rama en GitHub (remoto): ${rName}`}
                        >
                          <Cloud className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                          <span className="truncate max-w-[90px]">{rName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. SVG Multi-lane Graph with Bezier Curves */}
                <div
                  style={{ width: svgWidth, height: rowHeight }}
                  className="shrink-0 relative overflow-visible"
                >
                  <svg width={svgWidth} height={rowHeight} className="overflow-visible">
                    {/* Background: Active passing lanes traversing this row */}
                    {activeLanes.map((pLane) => {
                      const lx = 14 + pLane * laneSpacing;
                      const pColor = LANE_COLORS[pLane % LANE_COLORS.length];
                      return (
                        <line
                          key={`pass-${pLane}`}
                          x1={lx}
                          y1={0}
                          x2={lx}
                          y2={rowHeight}
                          stroke={pColor}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          opacity="0.75"
                        />
                      );
                    })}

                    {/* Line in from top if child connects to this commit */}
                    {idx > 0 && (
                      <line
                        x1={cx}
                        y1={0}
                        x2={cx}
                        y2={cy}
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Lines / Bezier Curves down to parents */}
                    {parentLanes.length === 0 ? (
                      // Root commit (no parents)
                      null
                    ) : (
                      parentLanes.map((pLane, pIdx) => {
                        const px = 14 + pLane * laneSpacing;
                        if (px === cx) {
                          // Straight vertical line down
                          return (
                            <line
                              key={`parent-${pIdx}`}
                              x1={cx}
                              y1={cy}
                              x2={cx}
                              y2={rowHeight}
                              stroke={color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          );
                        } else {
                          // Smooth cubic Bezier curve down to parent lane
                          const midY = (cy + rowHeight) / 2;
                          const pathData = `M ${cx} ${cy} C ${cx} ${midY}, ${px} ${midY}, ${px} ${rowHeight}`;
                          return (
                            <path
                              key={`parent-curve-${pIdx}`}
                              d={pathData}
                              stroke={color}
                              strokeWidth="2.5"
                              fill="none"
                              strokeLinecap="round"
                            />
                          );
                        }
                      })
                    )}

                    {/* Commit Node Circle */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHead || isSelected ? 7 : 5.5}
                      fill="#0d1117"
                      stroke={color}
                      strokeWidth="2.5"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHead ? 3.5 : 2.5}
                      fill={isHead ? "#ffffff" : color}
                    />

                    {/* Pulsing ring for HEAD commit */}
                    {isHead && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={9.5}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeDasharray="2,2"
                        opacity="0.8"
                      />
                    )}
                  </svg>
                </div>

                {/* 3. Commit Summary */}
                <div className="flex-1 px-3 truncate font-sans text-xs">
                  <span className="font-mono text-white text-xs">{commit.summary}</span>
                  {commit.parent_oids.length > 1 && (
                    <span className="ml-2 px-1.5 py-0.2 bg-purple-950/60 text-purple-300 border border-purple-800 rounded text-[10px]">
                      Merge
                    </span>
                  )}
                </div>

                {/* 4. Author */}
                <div className="w-36 px-2 truncate flex items-center gap-1.5 text-[11px] text-[#8b949e]">
                  <User className="w-3 h-3 text-[#484f58] shrink-0" />
                  <span className="truncate">{commit.author_name}</span>
                </div>

                {/* 5. Date */}
                <div className="w-28 px-2 flex items-center gap-1 text-[11px] text-[#8b949e]">
                  <Calendar className="w-3 h-3 text-[#484f58] shrink-0" />
                  <span>{dateStr}</span>
                </div>

                {/* 6. Short Hash */}
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
    </div>
  );
};

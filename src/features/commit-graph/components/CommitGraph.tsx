import React, { useState } from "react";
import { GraphNode, LANE_COLORS } from "../hooks/useCommitGraph";
import { CommitInfo, BranchesSummary, BranchInfo, GitTag } from "../../../types/git";
import { GitCommit, Calendar, Cloud, Check, Monitor, Tag as TagIcon } from "lucide-react";

interface CommitGraphProps {
  nodes: GraphNode[];
  selectedCommit: CommitInfo | null;
  loading: boolean;
  branches?: BranchesSummary;
  tags?: GitTag[];
  showCommitBody?: boolean;
  githubAvatarUrl?: string | null;
  githubLogin?: string | null;
  wipChangesCount?: { staged: number; unstaged: number };
  isWipSelected?: boolean;
  onSelectWip?: () => void;
  onSelectCommit: (commit: CommitInfo) => void;
  onCheckoutBranch?: (branchName: string) => void;
  onBranchContextMenu?: (x: number, y: number, branchName: string, isHead: boolean, isRemote: boolean) => void;
  onDropBranch?: (
    sourceBranch: string,
    targetBranch: string,
    sourceIsRemote: boolean,
    targetIsRemote: boolean
  ) => void;
}

interface CombinedBranch {
  id: string;
  name: string;
  displayName: string;
  fullName: string;
  hasLocal: boolean;
  hasRemote: boolean;
  isHead: boolean;
  localName?: string;
  remoteName?: string;
}

function getLaneRowBg(color: string, isSelected: boolean): string {
  if (isSelected) {
    return "rgba(31, 111, 235, 0.22)";
  }
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 56;
  const g = parseInt(hex.substring(2, 4), 16) || 189;
  const b = parseInt(hex.substring(4, 6), 16) || 248;
  return `rgba(${r}, ${g}, ${b}, 0.055)`;
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

export const CommitGraph: React.FC<CommitGraphProps> = ({
  nodes,
  selectedCommit,
  loading,
  branches,
  tags,
  showCommitBody = false,
  githubAvatarUrl,
  githubLogin,
  wipChangesCount,
  isWipSelected = false,
  onSelectWip,
  onSelectCommit,
  onBranchContextMenu,
  onDropBranch,
}) => {
  const [dragOverBadge, setDragOverBadge] = useState<string | null>(null);

  // User adjustable column widths with persistent localStorage
  const [branchColWidth, setBranchColWidth] = useState<number>(() => {
    const saved = localStorage.getItem("gitmanager_col_branch_width");
    return saved ? Math.max(110, Math.min(460, parseInt(saved, 10))) : 210;
  });

  const [graphColWidth, setGraphColWidth] = useState<number>(() => {
    const saved = localStorage.getItem("gitmanager_col_graph_width");
    return saved ? Math.max(60, Math.min(400, parseInt(saved, 10))) : 100;
  });

  const handleBranchResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = branchColWidth;
    const onPointerMove = (ev: PointerEvent) => {
      const newW = Math.max(110, Math.min(460, startW + (ev.clientX - startX)));
      setBranchColWidth(newW);
      localStorage.setItem("gitmanager_col_branch_width", newW.toString());
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleGraphResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = graphColWidth;
    const onPointerMove = (ev: PointerEvent) => {
      const newW = Math.max(60, Math.min(400, startW + (ev.clientX - startX)));
      setGraphColWidth(newW);
      localStorage.setItem("gitmanager_col_graph_width", newW.toString());
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

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

  // Pre-calculate combined branches map (GitKraken style: combines local + remote matching branches)
  const commitBranchesMap = new Map<string, CombinedBranch[]>();

  if (branches) {
    const oidLocal = new Map<string, BranchInfo[]>();
    const oidRemote = new Map<string, BranchInfo[]>();

    for (const b of branches.local) {
      if (!b.target_oid) continue;
      const list = oidLocal.get(b.target_oid) || [];
      list.push(b);
      oidLocal.set(b.target_oid, list);
    }

    for (const b of branches.remote) {
      if (!b.target_oid) continue;
      const list = oidRemote.get(b.target_oid) || [];
      list.push(b);
      oidRemote.set(b.target_oid, list);
    }

    const allOids = new Set([...oidLocal.keys(), ...oidRemote.keys()]);

    for (const oid of allOids) {
      const locals = oidLocal.get(oid) || [];
      const remotes = [...(oidRemote.get(oid) || [])];
      const combined: CombinedBranch[] = [];

      for (const loc of locals) {
        const rIdx = remotes.findIndex((r) => {
          const cleanRemote = r.name.replace(/^[^\/]+\//, "");
          return cleanRemote === loc.name;
        });

        let matchedRemote: BranchInfo | null = null;
        if (rIdx !== -1) {
          matchedRemote = remotes[rIdx];
          remotes.splice(rIdx, 1);
        }

        const shortName = loc.name.length > 15 ? loc.name.substring(0, 13) + "..." : loc.name;

        combined.push({
          id: `branch-local-${loc.name}`,
          name: loc.name,
          displayName: shortName,
          fullName: loc.name,
          hasLocal: true,
          hasRemote: matchedRemote !== null,
          isHead: loc.is_head,
          localName: loc.name,
          remoteName: matchedRemote?.name,
        });
      }

      for (const rem of remotes) {
        const cleanRemote = rem.name.replace(/^[^\/]+\//, "");
        const shortName = cleanRemote.length > 15 ? cleanRemote.substring(0, 13) + "..." : cleanRemote;

        combined.push({
          id: `branch-remote-${rem.name}`,
          name: cleanRemote,
          displayName: shortName,
          fullName: rem.name,
          hasLocal: false,
          hasRemote: true,
          isHead: false,
          remoteName: rem.name,
        });
      }

      commitBranchesMap.set(oid, combined);
    }
  }

  // Pre-calculate tags map by target_commit_id
  const commitTagsMap = new Map<string, GitTag[]>();
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const list = commitTagsMap.get(tag.target_commit_id) || [];
      list.push(tag);
      commitTagsMap.set(tag.target_commit_id, list);
    }
  }

  // WIP (Working Copy / Uncommitted Changes) node state (GitKraken / Gitnuro style)
  const hasWipChanges = Boolean(
    wipChangesCount && (wipChangesCount.staged > 0 || wipChangesCount.unstaged > 0)
  );

  // Graph geometry
  const maxLane = Math.max(...nodes.map((n) => Math.max(n.lane, ...(n.parentLanes || []))), 0);
  const laneSpacing = 20;
  const minSvgWidth = Math.max(38, (maxLane + 1) * laneSpacing + 10);
  const finalGraphWidth = Math.max(graphColWidth, minSvgWidth);
  const rowHeight = showCommitBody ? 42 : 28;
  const cy = rowHeight / 2;
  const nodeRadius = 9; // 18px diameter avatar

  const headNode =
    nodes.find((n) => commitBranchesMap.get(n.commit.oid)?.some((b) => b.isHead)) || nodes[0];
  const wipLane = headNode ? headNode.lane : 0;
  const wipColor = headNode ? headNode.color : (LANE_COLORS[0] || "#38bdf8");
  const wipCx = 12 + wipLane * laneSpacing;
  const wipCy = rowHeight / 2;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#010409]">
      {/* Table Header - Centered & in Spanish with Resizable Column Handles (Flechas 1 y 2) */}
      <div className="h-7 border-b border-[#30363d] bg-[#161b22] flex items-center text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider shrink-0 select-none">
        {/* 1. RAMA / ETIQUETA */}
        <div
          style={{ width: branchColWidth }}
          className="shrink-0 text-center font-bold px-1 truncate"
        >
          RAMA / ETIQUETA
        </div>

        {/* Resizer 1 between RAMA / ETIQUETA and GRAFO */}
        <div
          onPointerDown={handleBranchResizeStart}
          style={{ cursor: "ew-resize" }}
          className="w-2 h-full -mx-1 cursor-ew-resize hover:bg-blue-500/60 active:bg-blue-500 shrink-0 z-20 flex items-center justify-center transition-colors group"
          title="Arrastra para redimensionar la columna de Ramas / Etiquetas"
        >
          <div className="w-[1px] h-3 bg-[#30363d] group-hover:bg-blue-300 transition-colors pointer-events-none" />
        </div>

        {/* 2. GRAFO */}
        <div
          style={{ width: finalGraphWidth }}
          className="shrink-0 text-center font-bold px-1 truncate"
        >
          GRAFO
        </div>

        {/* Resizer 2 between GRAFO and MENSAJE DE COMMIT */}
        <div
          onPointerDown={handleGraphResizeStart}
          style={{ cursor: "ew-resize" }}
          className="w-2 h-full -mx-1 cursor-ew-resize hover:bg-blue-500/60 active:bg-blue-500 shrink-0 z-20 flex items-center justify-center transition-colors group"
          title="Arrastra para redimensionar la columna del Grafo"
        >
          <div className="w-[1px] h-3 bg-[#30363d] group-hover:bg-blue-300 transition-colors pointer-events-none" />
        </div>

        {/* 3. MENSAJE DE COMMIT */}
        <div className="flex-1 text-center font-bold px-3 truncate">
          MENSAJE DE COMMIT
        </div>

        {/* 4. AUTOR */}
        <div className="w-32 shrink-0 text-center font-bold px-2 truncate">
          AUTOR
        </div>

        {/* 5. FECHA */}
        <div className="w-24 shrink-0 text-center font-bold px-2 truncate">
          FECHA
        </div>

        {/* 6. HASH */}
        <div className="w-20 shrink-0 text-center font-bold px-2 truncate">
          HASH
        </div>
      </div>

      {/* Commit List with GitKraken-styled Graph and Lane Backgrounds */}
      <div className="flex-1 overflow-auto relative">
        <div className="flex flex-col">
          {/* WIP Row (GitKraken / Gitnuro style) - Rendered only when there are pending changes */}
          {hasWipChanges && (
            <div
              onClick={() => onSelectWip && onSelectWip()}
              style={{
                height: rowHeight,
                backgroundColor: isWipSelected
                  ? "rgba(245, 158, 11, 0.22)"
                  : "rgba(245, 158, 11, 0.06)",
              }}
              className={`flex items-center text-xs cursor-pointer border-b border-amber-500/20 transition-colors group select-none ${
                isWipSelected
                  ? "text-white font-medium"
                  : "hover:bg-amber-500/[0.10] text-[#c9d1d9]"
              }`}
            >
              {/* 1. BRANCH / TAG Column with seamless horizontal connector line */}
              <div
                style={{ width: branchColWidth }}
                className="shrink-0 h-full flex items-center justify-end pl-2 pr-0 overflow-hidden select-none"
              >
                <div className="flex items-center w-full justify-end">
                  <div className="flex items-center gap-1 shrink-0 max-w-[calc(100%-6px)] overflow-hidden">
                    <div
                      className="flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-mono border shrink-0 bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-xs select-none"
                      title="Cambios en curso en el espacio de trabajo (WIP / Uncommitted Changes)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <span className="font-semibold">// WIP</span>
                    </div>
                  </div>

                  {/* Horizontal connector line */}
                  <div
                    className="flex-1 h-[2px] min-w-[6px]"
                    style={{ backgroundColor: wipColor, opacity: 0.85 }}
                  />
                </div>
              </div>

              {/* 2. GRAPH Column with Dashed WIP Node and Connector */}
              <div
                style={{ width: finalGraphWidth, height: rowHeight }}
                className="shrink-0 relative overflow-visible"
              >
                <svg width={finalGraphWidth} height={rowHeight} className="overflow-visible">
                  {/* Passing lanes */}
                  {nodes[0]?.activeLanes?.map((pLane) => {
                    if (pLane === wipLane) return null;
                    const lx = 12 + pLane * laneSpacing;
                    const pColor = LANE_COLORS[pLane % LANE_COLORS.length];
                    return (
                      <line
                        key={`wip-pass-${pLane}`}
                        x1={lx}
                        y1={0}
                        x2={lx}
                        y2={rowHeight}
                        stroke={pColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        opacity="0.65"
                      />
                    );
                  })}

                  {/* Horizontal branch line from column boundary to WIP node */}
                  <line
                    x1={0}
                    y1={wipCy}
                    x2={wipCx - nodeRadius}
                    y2={wipCy}
                    stroke={wipColor}
                    strokeWidth="2"
                    opacity="0.85"
                  />

                  {/* Line down to latest commit */}
                  <line
                    x1={wipCx}
                    y1={wipCy}
                    x2={wipCx}
                    y2={rowHeight}
                    stroke={wipColor}
                    strokeWidth="2.5"
                    strokeDasharray="3,2"
                    strokeLinecap="round"
                  />

                  {/* WIP Node: Dashed outer circle with pulsing core */}
                  <circle
                    cx={wipCx}
                    cy={wipCy}
                    r={nodeRadius}
                    fill="#161b22"
                    stroke={wipColor}
                    strokeWidth="2"
                    strokeDasharray="3,2"
                  />
                  <circle
                    cx={wipCx}
                    cy={wipCy}
                    r={3.5}
                    fill={wipColor}
                    className="animate-pulse"
                  />
                </svg>
              </div>

              {/* 3. COMMIT MESSAGE Column with amber accent */}
              <div
                className="flex items-center flex-1 px-3 min-w-0 border-l-2 h-full overflow-hidden"
                style={{ borderLeftColor: wipColor }}
              >
                <div className="flex flex-col justify-center min-w-0 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-300 font-semibold text-xs truncate">
                      // WIP: Cambios en el espacio de trabajo
                    </span>
                    {wipChangesCount && (
                      <span className="px-1.5 py-0.2 bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded text-[9px] shrink-0 font-sans">
                        {wipChangesCount.staged > 0 && `${wipChangesCount.staged} preparado(s)`}
                        {wipChangesCount.staged > 0 && wipChangesCount.unstaged > 0 && " • "}
                        {wipChangesCount.unstaged > 0 && `${wipChangesCount.unstaged} sin preparar`}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8b949e] font-sans truncate mt-0.5">
                    Haz clic para inspeccionar diferencias o preparar cambios
                  </p>
                </div>
              </div>

              {/* 4. AUTHOR Column */}
              <div className="w-32 shrink-0 px-2 truncate flex items-center justify-center gap-1.5 text-[11px] text-[#8b949e]">
                <span className="truncate italic font-mono text-[10px] text-amber-300/80">
                  Tú (en curso)
                </span>
              </div>

              {/* 5. DATE Column */}
              <div className="w-24 shrink-0 px-2 flex items-center justify-center gap-1 text-[11px] text-amber-300/80 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="truncate font-mono text-[10px]">Ahora</span>
              </div>

              {/* 6. HASH Column */}
              <div className="w-20 shrink-0 px-2 text-center">
                <span className="font-mono text-[10px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-dashed border-amber-500/50 text-amber-300 font-semibold select-none">
                  WIP
                </span>
              </div>
            </div>
          )}

          {nodes.map((node, idx) => {
            const { commit, lane, color, parentLanes = [], activeLanes = [] } = node;
            const isSelected = selectedCommit?.oid === commit.oid;
            const commitBadges = commitBranchesMap.get(commit.oid) || [];
            const commitTags = commitTagsMap.get(commit.oid) || [];
            const hasBadgesOrTags = commitBadges.length > 0 || commitTags.length > 0;
            const isHead = commitBadges.some((b) => b.isHead);

            const commitBody =
              commit.message.length > commit.summary.length
                ? commit.message.substring(commit.summary.length).trim()
                : "";

            const dateStr = new Date(commit.timestamp * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const cx = 12 + lane * laneSpacing;
            const authorAvatar = getAuthorAvatarUrl(
              commit.author_name,
              commit.author_email,
              githubAvatarUrl,
              githubLogin
            );

            return (
              <div
                key={commit.oid}
                onClick={() => onSelectCommit(commit)}
                style={{
                  height: rowHeight,
                  backgroundColor: getLaneRowBg(color, isSelected),
                }}
                className={`flex items-center text-xs cursor-pointer border-b border-[#21262d]/25 transition-colors group ${
                  isSelected
                    ? "text-white font-medium"
                    : "hover:bg-white/[0.04] text-[#c9d1d9]"
                }`}
              >
                {/* 1. BRANCH / TAG Column with seamless horizontal connector line (Flecha 3) */}
                <div
                  style={{ width: branchColWidth }}
                  className="shrink-0 h-full flex items-center justify-end pl-2 pr-0 overflow-hidden select-none"
                >
                  {hasBadgesOrTags && (
                    <div className="flex items-center w-full justify-end">
                      <div className="flex items-center gap-1 shrink-0 max-w-[calc(100%-6px)] overflow-hidden">
                        {/* Branch Badges */}
                        {commitBadges.map((b) => {
                          const isBadgeDragTarget = dragOverBadge === b.name;

                          return (
                            <div
                              key={b.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                const dragName = b.localName || b.remoteName || b.name;
                                const isRemote = !b.hasLocal && b.hasRemote;
                                e.dataTransfer.setData("application/git-branch", dragName);
                                e.dataTransfer.setData("application/is-remote", isRemote ? "true" : "false");
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragOver={(e) => {
                                if (e.dataTransfer.types.includes("application/git-branch")) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = "move";
                                  if (dragOverBadge !== b.name) setDragOverBadge(b.name);
                                }
                              }}
                              onDragLeave={(e) => {
                                e.stopPropagation();
                                if (dragOverBadge === b.name) setDragOverBadge(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverBadge(null);
                                const source = e.dataTransfer.getData("application/git-branch");
                                const sourceIsRemote = e.dataTransfer.getData("application/is-remote") === "true";
                                const targetName = b.localName || b.name;
                                const targetIsRemote = !b.hasLocal && b.hasRemote;
                                if (source && source !== targetName && onDropBranch) {
                                  onDropBranch(source, targetName, sourceIsRemote, targetIsRemote);
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onBranchContextMenu) {
                                  if (b.hasLocal && b.localName) {
                                    onBranchContextMenu(e.clientX, e.clientY, b.localName, b.isHead, false);
                                  } else if (b.remoteName) {
                                    onBranchContextMenu(e.clientX, e.clientY, b.remoteName, false, true);
                                  }
                                }
                              }}
                              className={`flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-mono border shrink-0 transition-all select-none ${
                                isBadgeDragTarget
                                  ? "bg-blue-600/40 border-2 border-blue-400 text-white scale-105"
                                  : b.isHead
                                  ? "bg-[#0c2d48] text-cyan-200 border-cyan-500/70 shadow-xs"
                                  : b.hasLocal
                                  ? "bg-[#132338] text-blue-200 border-blue-500/40"
                                  : "bg-[#24123a] text-purple-200 border-purple-500/40"
                              }`}
                              title={`Rama: ${b.fullName}${b.isHead ? " (HEAD activo)" : ""} (Clic derecho para opciones, arrastra para merge/pull)`}
                            >
                              {/* Checkmark for current checked out HEAD */}
                              {b.isHead && <Check className="w-2.5 h-2.5 text-cyan-400 shrink-0" />}

                              {/* Branch Name */}
                              <span className="truncate max-w-[85px]">{b.displayName}</span>

                              {/* Local computer/monitor icon */}
                              {b.hasLocal && <Monitor className="w-2.5 h-2.5 text-[#8b949e] shrink-0" />}

                              {/* Remote user avatar or cloud icon */}
                              {b.hasRemote && (
                                githubAvatarUrl ? (
                                  <img
                                    src={githubAvatarUrl}
                                    alt="Remote"
                                    className="w-3 h-3 rounded-full border border-purple-400/80 shrink-0 object-cover"
                                  />
                                ) : (
                                  <Cloud className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                                )
                              )}
                            </div>
                          );
                        })}

                        {/* Git Tags Badges */}
                        {commitTags.map((tag) => (
                          <div
                            key={`tag-${tag.name}`}
                            className="flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-mono border shrink-0 bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-xs select-none"
                            title={`Etiqueta: ${tag.name}${tag.message ? ` - ${tag.message}` : ""}`}
                          >
                            <TagIcon className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[85px]">{tag.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Seamless horizontal connector line meeting the exact boundary */}
                      <div
                        className="flex-1 h-[2px] min-w-[6px]"
                        style={{ backgroundColor: color, opacity: 0.85 }}
                      />
                    </div>
                  )}
                </div>

                {/* 2. GRAPH Column with Bezier Curves & Profile Picture Avatars */}
                <div
                  style={{ width: finalGraphWidth, height: rowHeight }}
                  className="shrink-0 relative overflow-visible"
                >
                  <svg width={finalGraphWidth} height={rowHeight} className="overflow-visible">
                    <defs>
                      <clipPath id={`avatar-clip-${commit.oid}`}>
                        <circle cx={cx} cy={cy} r={nodeRadius} />
                      </clipPath>
                    </defs>

                    {/* Background: Active passing lanes traversing this row */}
                    {activeLanes.map((pLane) => {
                      const lx = 12 + pLane * laneSpacing;
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
                          opacity="0.65"
                        />
                      );
                    })}

                    {/* Line in from top child or WIP (GitKraken style) */}
                    {(idx > 0 || hasWipChanges) && (
                      <line
                        x1={cx}
                        y1={0}
                        x2={cx}
                        y2={cy}
                        stroke={color}
                        strokeWidth="2.5"
                        strokeDasharray={idx === 0 && hasWipChanges ? "3,2" : undefined}
                        strokeLinecap="round"
                      />
                    )}

                    {/* Lines / Bezier Curves down to parents */}
                    {parentLanes.length > 0 &&
                      parentLanes.map((pLane, pIdx) => {
                        const px = 12 + pLane * laneSpacing;
                        if (px === cx) {
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
                      })}

                    {/* Horizontal branch connector line from column boundary to commit node */}
                    {hasBadgesOrTags && (
                      <line
                        x1={0}
                        y1={cy}
                        x2={cx - nodeRadius}
                        y2={cy}
                        stroke={color}
                        strokeWidth="2"
                        opacity="0.85"
                      />
                    )}

                    {/* Commit Node Avatar with Profile Picture */}
                    <circle cx={cx} cy={cy} r={nodeRadius} fill="#161b22" />
                    <image
                      href={authorAvatar}
                      x={cx - nodeRadius}
                      y={cy - nodeRadius}
                      width={nodeRadius * 2}
                      height={nodeRadius * 2}
                      clipPath={`url(#avatar-clip-${commit.oid})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={nodeRadius}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSelected || isHead ? 2.5 : 2}
                    />

                    {/* Pulsing ring for HEAD commit */}
                    {isHead && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={nodeRadius + 2.5}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.2"
                        strokeDasharray="2,2"
                        opacity="0.9"
                      />
                    )}
                  </svg>
                </div>

                {/* 3. COMMIT MESSAGE Column with left color accent line & Optional Description (Flecha 5) */}
                <div
                  className="flex items-center flex-1 px-3 min-w-0 border-l-2 h-full overflow-hidden"
                  style={{ borderLeftColor: color }}
                >
                  <div className="flex flex-col justify-center min-w-0 py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white text-xs truncate">
                        {commit.summary}
                      </span>
                      {commit.parent_oids.length > 1 && (
                        <span className="px-1.5 py-0.2 bg-purple-950/60 text-purple-300 border border-purple-800 rounded text-[9px] shrink-0 font-sans">
                          Merge
                        </span>
                      )}
                    </div>

                    {showCommitBody && commitBody && (
                      <p
                        className="text-[11px] text-[#8b949e] font-sans truncate max-w-2xl opacity-75 mt-0.5"
                        title={commitBody}
                      >
                        {commitBody}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. AUTHOR Column */}
                <div className="w-32 shrink-0 px-2 truncate flex items-center justify-center gap-1.5 text-[11px] text-[#8b949e]">
                  <span className="truncate">{commit.author_name}</span>
                </div>

                {/* 5. DATE Column */}
                <div className="w-24 shrink-0 px-2 flex items-center justify-center gap-1 text-[11px] text-[#8b949e] truncate">
                  <Calendar className="w-3 h-3 text-[#484f58] shrink-0" />
                  <span className="truncate">{dateStr}</span>
                </div>

                {/* 6. HASH Column */}
                <div className="w-20 shrink-0 px-2 text-center">
                  <span className="font-mono text-[10px] bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d] text-blue-400">
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

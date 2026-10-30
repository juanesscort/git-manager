import React, { useState, useEffect, useMemo } from "react";
import {
  GitPullRequest,
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  GitMerge,
  ArrowRight,
  MessageSquare,
  FileCode,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { usePullRequests } from "../../hooks/usePullRequests";
import { GitHubUser, PullRequestItem } from "../../../../types/git";
import { Button } from "../../../../components/ui/Button";

interface PullRequestHubModalProps {
  isOpen: boolean;
  repoPath: string;
  remoteUrl?: string | null;
  currentUser: GitHubUser | null;
  onClose: () => void;
}

export const PullRequestHubModal: React.FC<PullRequestHubModalProps> = ({
  isOpen,
  remoteUrl,
  currentUser,
  onClose,
}) => {
  const {
    permissions,
    loadingPermissions,
    pullRequests,
    loadingPrs,
    selectedPr,
    loadingDetails,
    checks,
    loadingChecks,
    aiReviewSummary,
    aiReviewing,
    actionLoading,
    error,
    successMessage,
    fetchPermissions,
    fetchPullRequests,
    selectPullRequest,
    generateAiReview,
    submitReview,
    mergePullRequest,
    clearMessages,
  } = usePullRequests();

  const [filterState, setFilterState] = useState<"open" | "closed">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "checks" | "ai">("summary");
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("merge");
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewModal, setShowReviewModal] = useState<"APPROVE" | "REQUEST_CHANGES" | null>(null);

  // Extract owner/repo slug
  const repoSlug = useMemo(() => {
    if (!remoteUrl) return "";
    let clean = remoteUrl.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "");
    } else if (clean.startsWith("https://github.com/")) {
      clean = clean.replace("https://github.com/", "");
    }
    return clean.replace(/\.git$/, "");
  }, [remoteUrl]);

  // Initial load when opened
  useEffect(() => {
    if (isOpen && repoSlug) {
      clearMessages();
      fetchPermissions(repoSlug);
      fetchPullRequests(repoSlug, filterState);
    }
  }, [isOpen, repoSlug, filterState, fetchPermissions, fetchPullRequests, clearMessages]);

  // Filtered PR list
  const filteredPrs = useMemo(() => {
    return pullRequests.filter((pr: PullRequestItem) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        pr.title.toLowerCase().includes(q) ||
        pr.user.login.toLowerCase().includes(q) ||
        pr.number.toString().includes(q) ||
        pr.head_ref.toLowerCase().includes(q) ||
        pr.base_ref.toLowerCase().includes(q)
      );
    });
  }, [pullRequests, searchQuery]);

  if (!isOpen) return null;

  const isAuthor =
    Boolean(currentUser && selectedPr && currentUser.login.toLowerCase() === selectedPr.user.login.toLowerCase());
  const canMerge = Boolean(permissions && (permissions.admin || permissions.push));
  const canReview = Boolean(permissions && (permissions.admin || permissions.push || permissions.pull) && !isAuthor);

  const handleRefresh = () => {
    if (repoSlug) {
      fetchPermissions(repoSlug);
      fetchPullRequests(repoSlug, filterState);
      if (selectedPr) {
        selectPullRequest(repoSlug, selectedPr.number, selectedPr.head_sha);
      }
    }
  };

  const handleOpenBrowser = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleConfirmMerge = async () => {
    if (!repoSlug || !selectedPr) return;
    await mergePullRequest(
      repoSlug,
      selectedPr.number,
      mergeMethod,
      `Merge pull request #${selectedPr.number} from ${selectedPr.head_ref}`,
      selectedPr.title
    );
  };

  const handleConfirmReview = async (event: "APPROVE" | "REQUEST_CHANGES") => {
    if (!repoSlug || !selectedPr) return;
    await submitReview(repoSlug, selectedPr.number, event, reviewComment);
    setShowReviewModal(null);
    setReviewComment("");
    // Refresh details
    selectPullRequest(repoSlug, selectedPr.number, selectedPr.head_sha);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-6xl h-[88vh] bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">Hub de Pull Requests</h2>
                <span className="text-xs font-mono text-[#8b949e]">({repoSlug})</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {loadingPermissions ? (
                  <span className="text-[10px] text-[#8b949e]">Verificando permisos...</span>
                ) : permissions ? (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-[#8b949e]">Tu nivel de acceso:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono border ${
                        permissions.admin
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : permissions.push
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                      }`}
                    >
                      {permissions.admin ? "Administrador" : permissions.push ? "Escritura" : "Solo Lectura"}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loadingPrs}
              className="p-1.5 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
              title="Actualizar Pull Requests desde GitHub"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPrs ? "animate-spin text-blue-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="px-5 py-2.5 bg-rose-950/40 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button onClick={clearMessages} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={clearMessages} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Workspace Body: Split Screen */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: PR List & Filters */}
          <div className="w-80 md:w-96 border-r border-[#30363d] flex flex-col bg-[#0d1117] shrink-0">
            {/* Filter Controls */}
            <div className="p-3 border-b border-[#30363d] flex flex-col gap-2.5">
              <div className="flex items-center bg-[#161b22] p-0.5 rounded-lg border border-[#30363d]">
                <button
                  onClick={() => setFilterState("open")}
                  className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterState === "open"
                      ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                      : "text-[#8b949e] hover:text-white"
                  }`}
                >
                  Abiertos
                </button>
                <button
                  onClick={() => setFilterState("closed")}
                  className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterState === "closed"
                      ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                      : "text-[#8b949e] hover:text-white"
                  }`}
                >
                  Cerrados / Merged
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por título, autor o #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* PR List Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#30363d]/50">
              {loadingPrs ? (
                <div className="p-8 flex flex-col items-center justify-center text-center gap-2 text-[#8b949e]">
                  <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                  <span className="text-xs">Cargando Pull Requests...</span>
                </div>
              ) : filteredPrs.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center gap-2 text-[#8b949e]">
                  <GitPullRequest className="w-8 h-8 text-[#484f58]" />
                  <span className="text-xs font-medium text-[#c9d1d9]">No hay Pull Requests</span>
                  <p className="text-[11px] text-[#484f58]">
                    {filterState === "open"
                      ? "No existen solicitudes de extracción abiertas actualmente."
                      : "No se encontraron solicitudes cerradas."}
                  </p>
                </div>
              ) : (
                filteredPrs.map((pr: PullRequestItem) => {
                  const isSelected = selectedPr?.number === pr.number;
                  return (
                    <div
                      key={pr.id}
                      onClick={() => selectPullRequest(repoSlug, pr.number, pr.head_sha)}
                      className={`p-3.5 cursor-pointer transition-colors flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-purple-950/20 border-l-2 border-purple-500"
                          : "hover:bg-[#161b22]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-mono font-bold text-purple-400">#{pr.number}</span>
                        <div className="flex items-center gap-1.5 text-[#8b949e]">
                          {pr.user.avatar_url && (
                            <img
                              src={pr.user.avatar_url}
                              alt={pr.user.login}
                              className="w-3.5 h-3.5 rounded-full"
                            />
                          )}
                          <span className="font-mono text-[10px] truncate max-w-[90px]">@{pr.user.login}</span>
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                        {pr.title}
                      </h4>

                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#8b949e] pt-1">
                        <div className="flex items-center gap-1 truncate max-w-[190px]">
                          <span className="text-cyan-400 truncate">{pr.head_ref}</span>
                          <ArrowRight className="w-2.5 h-2.5 shrink-0 text-[#484f58]" />
                          <span className="text-purple-400 truncate">{pr.base_ref}</span>
                        </div>
                        {pr.comments_count > 0 && (
                          <div className="flex items-center gap-0.5 text-[#8b949e] shrink-0">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{pr.comments_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Detail View & Executive Actions */}
          <div className="flex-1 flex flex-col bg-[#161b22] overflow-hidden">
            {loadingDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-[#8b949e]">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                <span className="text-xs">Cargando detalles y checks de CI/CD...</span>
              </div>
            ) : !selectedPr ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-[#484f58]">
                  <GitPullRequest className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">Selecciona un Pull Request</h3>
                <p className="text-xs text-[#8b949e] max-w-sm">
                  Haz clic en cualquier Pull Request del listado izquierdo para revisar su código, estado de CI,
                  generar resumen con IA o aprobar la fusión.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* PR Header Banner */}
                <div className="p-4 border-b border-[#30363d] bg-[#0d1117]/50 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-purple-400">#{selectedPr.number}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${
                            selectedPr.state === "open"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          }`}
                        >
                          {selectedPr.state}
                        </span>
                        {selectedPr.draft && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">
                            Borrador
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white leading-snug break-words">
                        {selectedPr.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleOpenBrowser(selectedPr.html_url)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-white text-xs transition-colors cursor-pointer"
                      title="Ver en GitHub web"
                    >
                      <span>Abrir en GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Branches & Diff Stats Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-[#30363d]/50">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-cyan-400">{selectedPr.head_ref}</span>
                      <ArrowRight className="w-3 h-3 text-[#6e7681]" />
                      <span className="text-purple-400">{selectedPr.base_ref}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-[#8b949e]">
                        <FileCode className="w-3 h-3 inline mr-1 text-[#8b949e]" />
                        {selectedPr.changed_files} archivos
                      </span>
                      <span className="text-emerald-400">+{selectedPr.additions}</span>
                      <span className="text-rose-400">-{selectedPr.deletions}</span>
                      {selectedPr.mergeable !== null && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            selectedPr.mergeable
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {selectedPr.mergeable ? "Sin conflictos" : "Con conflictos"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab Navigation for Details */}
                <div className="px-4 border-b border-[#30363d] flex items-center gap-2 bg-[#0d1117]/30 text-xs">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`py-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeTab === "summary"
                        ? "border-purple-500 text-white"
                        : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
                    }`}
                  >
                    Resumen y Descripción
                  </button>
                  <button
                    onClick={() => setActiveTab("checks")}
                    className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "checks"
                        ? "border-purple-500 text-white"
                        : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
                    }`}
                  >
                    <span>Checks CI/CD</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#21262d] font-mono">
                      {checks.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("ai")}
                    className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "ai"
                        ? "border-amber-500 text-amber-300"
                        : "border-transparent text-[#8b949e] hover:text-amber-200"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Revisión con IA</span>
                  </button>
                </div>

                {/* Tab Body */}
                <div className="flex-1 p-5 overflow-y-auto">
                  {activeTab === "summary" && (
                    <div className="prose prose-invert max-w-none text-xs text-[#c9d1d9] font-sans leading-relaxed whitespace-pre-wrap bg-[#0d1117] p-4 rounded-xl border border-[#30363d]/80">
                      {selectedPr.body ? selectedPr.body : "El autor no suministró una descripción para este Pull Request."}
                    </div>
                  )}

                  {activeTab === "checks" && (
                    <div className="flex flex-col gap-2">
                      {loadingChecks ? (
                        <div className="p-6 text-center text-xs text-[#8b949e]">Consultando estado de checks...</div>
                      ) : checks.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#8b949e]">
                          No se encontraron suites de CI/CD ejecutadas para este commit.
                        </div>
                      ) : (
                        checks.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              {c.conclusion === "success" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : c.conclusion === "failure" ? (
                                <XCircle className="w-4 h-4 text-rose-400" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                              )}
                              <span className="font-semibold text-white">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[#8b949e] uppercase">
                                {c.conclusion || c.status}
                              </span>
                              {c.html_url && (
                                <button
                                  onClick={() => handleOpenBrowser(c.html_url!)}
                                  className="text-[#58a6ff] hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "ai" && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span className="text-[#c9d1d9]">
                            Genera una evaluación técnica y análisis de riesgos bajo demanda con IA.
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            generateAiReview({
                              title: selectedPr.title,
                              description: selectedPr.body || "",
                              head_branch: selectedPr.head_ref,
                              base_branch: selectedPr.base_ref,
                              additions: selectedPr.additions,
                              deletions: selectedPr.deletions,
                              changed_files: selectedPr.changed_files,
                              commits_summary: [],
                            })
                          }
                          disabled={aiReviewing}
                          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40"
                        >
                          {aiReviewing ? "Analizando cambios..." : "Generar Revisión con IA"}
                        </Button>
                      </div>

                      {aiReviewSummary ? (
                        <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white leading-relaxed whitespace-pre-wrap font-sans">
                          {aiReviewSummary}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-[#8b949e]">
                          Pulsa «Generar Revisión con IA» para obtener un dictamen técnico sin emojis.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Bar with Permissions Logic */}
                <div className="p-4 border-t border-[#30363d] bg-[#0d1117] flex flex-wrap items-center justify-between gap-3">
                  {/* Status / Role Guidance */}
                  <div className="text-xs text-[#8b949e] max-w-md">
                    {isAuthor && permissions?.admin ? (
                      <span className="text-purple-300 font-medium">
                        Eres el autor de este PR. Como Administrador, puedes fusionarlo directamente sin auto-aprobación.
                      </span>
                    ) : isAuthor ? (
                      <span className="text-amber-300/90 font-medium">
                        Eres el autor de este PR. La norma de GitHub requiere que un revisor apruebe los cambios.
                      </span>
                    ) : !canMerge && !canReview ? (
                      <span className="text-zinc-400">
                        Tu cuenta tiene rol de solo lectura. Se requieren permisos de colaborador para aprobar o fusionar.
                      </span>
                    ) : (
                      <span>Revisa las modificaciones y ejecuta la acción correspondiente.</span>
                    )}
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center gap-2.5">
                    {/* Review Modal Trigger (For non-authors) */}
                    {canReview && selectedPr.state === "open" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowReviewModal("REQUEST_CHANGES")}
                          disabled={actionLoading}
                          className="text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-950/20"
                        >
                          Solicitar Cambios
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowReviewModal("APPROVE")}
                          disabled={actionLoading}
                          className="text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:bg-emerald-950/20"
                        >
                          Aprobar
                        </Button>
                      </div>
                    )}

                    {/* Merge Button (Available for Admin & Push collaborators) */}
                    {canMerge && selectedPr.state === "open" && (
                      <div className="flex items-center gap-2">
                        <select
                          value={mergeMethod}
                          onChange={(e) => setMergeMethod(e.target.value as "merge" | "squash" | "rebase")}
                          className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none cursor-pointer"
                        >
                          <option value="merge">Merge commit</option>
                          <option value="squash">Squash and merge</option>
                          <option value="rebase">Rebase and merge</option>
                        </select>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleConfirmMerge}
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>Fusionar Pull Request</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal Dialog */}
      {showReviewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white">
              {showReviewModal === "APPROVE" ? "Aprobar Pull Request" : "Solicitar Cambios"}
            </h4>
            <p className="text-xs text-[#8b949e]">
              {showReviewModal === "APPROVE"
                ? "Envía tu aprobación formal de revisión a GitHub para este Pull Request."
                : "Describe las modificaciones requeridas antes de poder aprobar este Pull Request."}
            </p>
            <textarea
              rows={4}
              placeholder="Comentario opcional para el autor..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white focus:border-purple-500 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowReviewModal(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleConfirmReview(showReviewModal)}
                disabled={actionLoading}
                className={
                  showReviewModal === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }
              >
                {showReviewModal === "APPROVE" ? "Enviar Aprobación" : "Enviar Solicitud"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from "react";
import {
  PlayCircle,
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  GitBranch,
  ExternalLink,
  Layers,
  StopCircle,
  Play,
  FileCode,
  Tag,
  Check,
  Terminal,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { WorkflowRun, WorkflowJob } from "../../../../types/git";
import { useGitHubActions } from "../../hooks/useGitHubActions";
import { JobLogsViewer } from "./JobLogsViewer";

interface ActionsHubModalProps {
  isOpen: boolean;
  remoteUrl?: string | null;
  onClose: () => void;
}

export const ActionsHubModal: React.FC<ActionsHubModalProps> = ({
  isOpen,
  remoteUrl,
  onClose,
}) => {
  // Extract owner/repo
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

  const {
    runs,
    workflows,
    loadingRuns,
    actionLoading,
    selectedRun,
    setSelectedRun,
    jobs,
    loadingJobs,
    selectedJobLogs,
    setSelectedJobLogs,
    loadingLogs,
    autoRefresh,
    setAutoRefresh,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    fetchRuns,
    fetchRunJobs,
    fetchJobLogs,
    cancelRun,
    rerunRun,
    dispatchWorkflow,
  } = useGitHubActions(repoSlug);

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeJobForLogs, setActiveJobForLogs] = useState<WorkflowJob | null>(null);
  const [dispatchBranch, setDispatchBranch] = useState("main");
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Load runs on filter change
  useEffect(() => {
    if (isOpen && repoSlug) {
      fetchRuns(
        selectedWorkflowId ?? undefined,
        undefined,
        statusFilter === "all" ? undefined : statusFilter
      );
    }
  }, [isOpen, repoSlug, selectedWorkflowId, statusFilter, fetchRuns]);

  // Load jobs when selectedRun changes
  useEffect(() => {
    if (selectedRun) {
      fetchRunJobs(selectedRun.id);
      setActiveJobForLogs(null);
      setSelectedJobLogs(null);
    }
  }, [selectedRun, fetchRunJobs, setSelectedJobLogs]);

  if (!isOpen) return null;

  // Filter runs by search query
  const filteredRuns = runs.filter((run) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = run.display_title?.toLowerCase().includes(q);
    const nameMatch = run.name?.toLowerCase().includes(q);
    const branchMatch = run.head_branch?.toLowerCase().includes(q);
    const shaMatch = run.head_sha.toLowerCase().includes(q);
    const actorMatch = run.actor?.login.toLowerCase().includes(q);
    return titleMatch || nameMatch || branchMatch || shaMatch || actorMatch;
  });

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSecs < 60) return "hace un momento";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `hace ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      return `hace ${diffDays} d`;
    } catch {
      return isoString;
    }
  };

  const getRunDuration = (run: WorkflowRun) => {
    if (!run.run_started_at) return null;
    const start = new Date(run.run_started_at).getTime();
    const end = run.status === "completed" ? new Date(run.updated_at).getTime() : Date.now();
    const totalSecs = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-6xl h-[88vh] bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-wide">
                  GitHub Actions
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                  {repoSlug || "Sin repositorio remoto"}
                </span>
              </div>
              <p className="text-[11px] text-[#8b949e]">
                Monitorea pipelines, ejecuciones de CI/CD y logs de compilación en tiempo real.
              </p>
            </div>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2.5">
            {/* Auto-refresh indicator */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                autoRefresh
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-[#21262d] border-[#30363d] text-[#8b949e]"
              }`}
              title="Alternar actualización automática cada 30 segundos"
            >
              <RotateCw className={`w-3 h-3 ${autoRefresh ? "animate-spin" : ""}`} />
              <span>Auto-refresh: 30s</span>
            </button>

            {/* Manual refresh button */}
            <button
              onClick={() => {
                fetchRuns(
                  selectedWorkflowId ?? undefined,
                  undefined,
                  statusFilter === "all" ? undefined : statusFilter
                );
              }}
              disabled={loadingRuns}
              className="p-1.5 rounded-lg border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Actualizar ejecuciones ahora"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRuns ? "animate-spin" : ""}`} />
            </button>

            {/* Run Workflow button */}
            <button
              onClick={() => setShowDispatchModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ejecutar Workflow</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="bg-emerald-950/70 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/70 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Layout: Sidebar & Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Workflows list */}
          <div className="w-64 bg-[#161b22]/50 border-r border-[#30363d] flex flex-col shrink-0">
            <div className="p-3 border-b border-[#30363d] text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Flujos de Trabajo</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button
                onClick={() => setSelectedWorkflowId(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  selectedWorkflowId === null
                    ? "bg-[#21262d] text-white font-semibold shadow-xs"
                    : "text-[#8b949e] hover:bg-[#21262d]/50 hover:text-white"
                }`}
              >
                <span>Todos los workflows</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0d1117] text-[#8b949e]">
                  {runs.length}
                </span>
              </button>

              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => setSelectedWorkflowId(wf.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                    selectedWorkflowId === wf.id
                      ? "bg-[#21262d] text-white font-semibold shadow-xs"
                      : "text-[#8b949e] hover:bg-[#21262d]/50 hover:text-white"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{wf.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Center / Right: Runs List & Details */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="p-3 bg-[#161b22]/30 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar ejecuciones, commits, ramas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#484f58] focus:outline-hidden focus:border-cyan-500 font-sans"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#8b949e] text-[11px]">Estado:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completados</option>
                  <option value="success">Exitosos</option>
                  <option value="failure">Fallidos</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>
            </div>

            {/* Split View: Left Run List, Right Run Detail / Logs */}
            <div className="flex-1 flex overflow-hidden">
              {/* Runs List */}
              <div
                className={`${
                  selectedRun ? "w-1/2 border-r border-[#30363d]" : "w-full"
                } overflow-y-auto divide-y divide-[#30363d]/50 bg-[#0d1117]`}
              >
                {loadingRuns && runs.length === 0 ? (
                  <div className="flex items-center justify-center p-12 text-[#8b949e] gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-xs">Cargando ejecuciones de GitHub Actions...</span>
                  </div>
                ) : filteredRuns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-[#8b949e] gap-2">
                    <PlayCircle className="w-8 h-8 text-[#484f58]" />
                    <span className="text-xs font-medium">No se encontraron ejecuciones de workflows.</span>
                    <span className="text-[11px] text-[#484f58]">
                      Prueba a cambiar los filtros o dispara un workflow con el botón superior.
                    </span>
                  </div>
                ) : (
                  filteredRuns.map((run) => {
                    const isRunning =
                      run.status === "in_progress" || run.status === "queued";
                    const isSuccess = run.conclusion === "success";
                    const isFailure =
                      run.conclusion === "failure" || run.conclusion === "timed_out";
                    const isCancelled = run.conclusion === "cancelled";
                    const isSelected = selectedRun?.id === run.id;
                    const duration = getRunDuration(run);

                    return (
                      <div
                        key={run.id}
                        onClick={() => setSelectedRun(run)}
                        className={`p-3.5 hover:bg-[#161b22] transition-colors cursor-pointer group flex items-start gap-3 relative ${
                          isSelected
                            ? "bg-[#161b22] border-l-2 border-purple-500 shadow-inner"
                            : ""
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="pt-0.5 shrink-0">
                          {isRunning ? (
                            <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
                          ) : isSuccess ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isFailure ? (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          ) : isCancelled ? (
                            <StopCircle className="w-4 h-4 text-[#8b949e]" />
                          ) : (
                            <Clock className="w-4 h-4 text-[#8b949e]" />
                          )}
                        </div>

                        {/* Middle info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                              {run.display_title || run.name || "Ejecución sin título"}
                            </span>

                            {/* Branch or Tag Badge */}
                            {run.head_branch && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                                  run.head_branch.startsWith("v")
                                    ? "bg-sky-950/40 border-sky-500/40 text-sky-300"
                                    : "bg-purple-950/40 border-purple-500/40 text-purple-300"
                                }`}
                              >
                                {run.head_branch.startsWith("v") ? (
                                  <Tag className="w-2.5 h-2.5" />
                                ) : (
                                  <GitBranch className="w-2.5 h-2.5" />
                                )}
                                {run.head_branch}
                              </span>
                            )}
                          </div>

                          {/* Subtitle details */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#8b949e] mt-1 font-sans">
                            <span className="font-semibold text-[#c9d1d9]">
                              {run.name} #{run.run_number}:
                            </span>
                            <span>Commit</span>
                            <span className="font-mono text-cyan-400">
                              {run.head_sha.substring(0, 7)}
                            </span>
                            {run.actor && (
                              <span className="flex items-center gap-1">
                                {run.actor.avatar_url && (
                                  <img
                                    src={run.actor.avatar_url}
                                    alt={run.actor.login}
                                    className="w-3.5 h-3.5 rounded-full inline"
                                  />
                                )}
                                {run.actor.login}
                              </span>
                            )}
                            <span className="text-[#484f58]">•</span>
                            <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-[#21262d]">
                              {run.event}
                            </span>
                          </div>
                        </div>

                        {/* Right: Time and actions */}
                        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                          <span className="text-[10px] text-[#8b949e]">
                            {formatRelativeTime(run.created_at)}
                          </span>
                          {duration && (
                            <span
                              className={`text-[10px] font-mono ${
                                isRunning ? "text-amber-400 font-semibold" : "text-[#8b949e]"
                              }`}
                            >
                              {isRunning ? `En curso (${duration})` : duration}
                            </span>
                          )}

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            {isRunning ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelRun(run.id);
                                }}
                                title="Cancelar ejecución en curso"
                                className="p-1 rounded hover:bg-rose-950/40 text-[#8b949e] hover:text-rose-400"
                              >
                                <StopCircle className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rerunRun(run.id);
                                }}
                                title="Reintentar este workflow"
                                className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openUrl(run.html_url);
                              }}
                              title="Abrir en GitHub"
                              className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Run Details / Logs Panel */}
              {selectedRun && (
                <div className="w-1/2 flex flex-col bg-[#05080f] overflow-hidden">
                  {activeJobForLogs ? (
                    <div className="flex-1 p-3 flex flex-col overflow-hidden">
                      <JobLogsViewer
                        job={activeJobForLogs}
                        logs={selectedJobLogs}
                        loading={loadingLogs}
                        onClose={() => {
                          setActiveJobForLogs(null);
                          setSelectedJobLogs(null);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Detail Header */}
                      <div className="p-4 border-b border-[#30363d] bg-[#161b22]/50 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">
                              {selectedRun.name} #{selectedRun.run_number}
                            </span>
                            <span className="text-[10px] font-mono text-[#8b949e]">
                              (ID: {selectedRun.id})
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8b949e] mt-0.5 font-mono truncate max-w-sm">
                            Commit {selectedRun.head_sha}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedRun.status === "in_progress" ? (
                            <button
                              onClick={() => cancelRun(selectedRun.id)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/40 text-xs transition-colors cursor-pointer"
                            >
                              <StopCircle className="w-3.5 h-3.5" />
                              <span>Cancelar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => rerunRun(selectedRun.id)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-white hover:bg-[#30363d] text-xs transition-colors cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Re-ejecutar</span>
                            </button>
                          )}

                          <button
                            onClick={() => openUrl(selectedRun.html_url)}
                            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                            title="Ver en GitHub"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSelectedRun(null)}
                            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                            title="Cerrar detalles"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Jobs and Steps List */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                          Trabajos ({jobs.length})
                        </div>

                        {loadingJobs ? (
                          <div className="flex items-center justify-center p-8 text-[#8b949e] gap-2">
                            <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                            <span className="text-xs">Cargando pasos del trabajo...</span>
                          </div>
                        ) : jobs.length === 0 ? (
                          <p className="text-xs text-[#484f58] italic">
                            No hay trabajos registrados aún para esta ejecución.
                          </p>
                        ) : (
                          jobs.map((job) => (
                            <div
                              key={job.id}
                              className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-xs"
                            >
                              <div className="p-3 flex items-center justify-between bg-[#21262d]/50 border-b border-[#30363d]">
                                <div className="flex items-center gap-2">
                                  {job.status === "in_progress" ? (
                                    <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
                                  ) : job.conclusion === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : job.conclusion === "failure" ? (
                                    <AlertCircle className="w-4 h-4 text-rose-400" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-[#8b949e]" />
                                  )}
                                  <span className="text-xs font-semibold text-white">
                                    {job.name}
                                  </span>
                                </div>

                                <button
                                  onClick={() => {
                                    setActiveJobForLogs(job);
                                    fetchJobLogs(job.id);
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40 text-xs font-mono transition-colors cursor-pointer"
                                >
                                  <Terminal className="w-3.5 h-3.5" />
                                  <span>Ver Logs</span>
                                </button>
                              </div>

                              {/* Steps */}
                              <div className="p-2 space-y-1 divide-y divide-[#30363d]/30 text-xs">
                                {job.steps.map((step) => (
                                  <div
                                    key={step.number}
                                    className="pt-1 flex items-center justify-between text-[#c9d1d9] px-2 py-0.5"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 mr-2">
                                      {step.status === "in_progress" ? (
                                        <RotateCw className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                                      ) : step.conclusion === "success" ? (
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                      ) : step.conclusion === "failure" ? (
                                        <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                      ) : (
                                        <Clock className="w-3 h-3 text-[#484f58] shrink-0" />
                                      )}
                                      <span className="truncate text-[11px]">
                                        {step.name}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-[#8b949e] shrink-0">
                                      {step.conclusion || step.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Workflow Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Ejecutar Flujo de Trabajo (workflow_dispatch)</span>
            </h3>
            <p className="text-xs text-[#8b949e] mb-4">
              Selecciona la rama en la que se disparará la ejecución del pipeline:
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  Rama de ejecución:
                </label>
                <input
                  type="text"
                  value={dispatchBranch}
                  onChange={(e) => setDispatchBranch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-white font-mono focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  Workflow a disparar:
                </label>
                <select
                  id="dispatch-wf-select"
                  className="w-full px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-white font-sans focus:outline-hidden focus:border-cyan-500"
                >
                  {workflows.map((w) => (
                    <option key={w.id} value={w.path.split("/").pop()}>
                      {w.name} ({w.path})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#30363d] text-xs text-[#8b949e] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const select = document.getElementById(
                    "dispatch-wf-select"
                  ) as HTMLSelectElement | null;
                  const wfFile = select ? select.value : "release.yml";
                  dispatchWorkflow(wfFile, dispatchBranch);
                  setShowDispatchModal(false);
                }}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {actionLoading ? "Disparando..." : "Ejecutar Ahora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

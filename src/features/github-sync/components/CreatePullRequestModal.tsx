import React, { useState, useEffect, useCallback } from "react";
import {
  GitPullRequest,
  X,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GitBranch,
  ArrowLeftRight,
  RefreshCw,
  GitCommit,
  Copy,
  Check,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "../../../components/ui/Button";
import { BranchDiffCheckResult, BranchInfo } from "../../../types/git";

interface CreatePullRequestModalProps {
  isOpen: boolean;
  repoPath: string;
  remoteUrl?: string | null;
  branches: { local: BranchInfo[]; remote: BranchInfo[] };
  initialHeadBranch?: string;
  initialBaseBranch?: string;
  onClose: () => void;
}

interface CreatedPrResult {
  id: number;
  number: number;
  html_url: string;
  state: string;
  title: string;
}

interface AiPrResponse {
  title: string;
  description: string;
}

export const CreatePullRequestModal: React.FC<CreatePullRequestModalProps> = ({
  isOpen,
  repoPath,
  remoteUrl,
  branches,
  initialHeadBranch,
  initialBaseBranch = "main",
  onClose,
}) => {
  const [headBranch, setHeadBranch] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPr, setCreatedPr] = useState<CreatedPrResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Branch diff validation state (Flecha 1)
  const [diffCheck, setDiffCheck] = useState<BranchDiffCheckResult | null>(null);
  const [checkingDiff, setCheckingDiff] = useState(false);

  // Extract owner/repo from remote URL (e.g. "https://github.com/owner/repo.git")
  const repoSlug = React.useMemo(() => {
    if (!remoteUrl) return "repositorio/desconocido";
    let clean = remoteUrl.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "");
    } else if (clean.startsWith("https://github.com/")) {
      clean = clean.replace("https://github.com/", "");
    }
    clean = clean.replace(/\.git$/, "");
    return clean;
  }, [remoteUrl]);

  // Available branch list (unique names stripped of origin/)
  const availableBranches = React.useMemo(() => {
    const set = new Set<string>();
    for (const b of branches.local) set.add(b.name);
    for (const b of branches.remote) set.add(b.name.replace(/^origin\//, ""));
    if (initialHeadBranch) set.add(initialHeadBranch.replace(/^origin\//, ""));
    if (initialBaseBranch) set.add(initialBaseBranch.replace(/^origin\//, ""));
    return Array.from(set);
  }, [branches, initialHeadBranch, initialBaseBranch]);

  // Reactive verification of changes between branches
  const checkBranchDiff = useCallback(
    async (head: string, base: string) => {
      if (!head || !base || head === base) {
        setDiffCheck({
          has_changes: false,
          commits_count: 0,
          commits_summary: [],
          stat_summary: "",
          is_up_to_date: true,
        });
        return;
      }

      setCheckingDiff(true);
      try {
        const result = await invoke<BranchDiffCheckResult>("check_branch_diff_cmd", {
          repoPath,
          base,
          head,
        });
        setDiffCheck(result);
      } catch (err) {
        console.warn("Fallo verificando diferencias de ramas:", err);
        // Fallback: permissive in case of network/git error
        setDiffCheck({
          has_changes: true,
          commits_count: 1,
          commits_summary: [],
          stat_summary: "",
          is_up_to_date: false,
        });
      } finally {
        setCheckingDiff(false);
      }
    },
    [repoPath]
  );

  useEffect(() => {
    if (isOpen) {
      setCreatedPr(null);
      setError(null);

      // Clean head branch
      const cleanHead = initialHeadBranch?.replace(/^origin\//, "") || "dev";
      setHeadBranch(cleanHead);

      // Base branch: prefer initialBaseBranch, but if equal to cleanHead, choose an alternative
      let cleanBase = initialBaseBranch?.replace(/^origin\//, "") || "main";
      if (cleanBase === cleanHead) {
        if (cleanHead === "main" || cleanHead === "master") {
          cleanBase = availableBranches.find((b) => b !== cleanHead) || "dev";
        } else {
          cleanBase = availableBranches.includes("main")
            ? "main"
            : availableBranches.includes("master")
            ? "master"
            : availableBranches.find((b) => b !== cleanHead) || "main";
        }
      }
      setBaseBranch(cleanBase);
      setTitle("");
      setDescription("");

      checkBranchDiff(cleanHead, cleanBase);
    }
  }, [isOpen, initialHeadBranch, initialBaseBranch, availableBranches, checkBranchDiff]);

  // Check diff whenever branches change
  const handleHeadBranchChange = (newHead: string) => {
    setHeadBranch(newHead);
    setTitle("");
    setDescription("");
    setError(null);
    checkBranchDiff(newHead, baseBranch);
  };

  const handleBaseBranchChange = (newBase: string) => {
    setBaseBranch(newBase);
    setTitle("");
    setDescription("");
    setError(null);
    checkBranchDiff(headBranch, newBase);
  };

  const handleSwapBranches = () => {
    const oldHead = headBranch;
    const oldBase = baseBranch;
    setHeadBranch(oldBase);
    setBaseBranch(oldHead);
    setTitle("");
    setDescription("");
    setError(null);
    checkBranchDiff(oldBase, oldHead);
  };

  if (!isOpen) return null;

  // AI Generation of PR title and description
  const handleGenerateAiPr = async () => {
    if (!headBranch || !baseBranch || !diffCheck?.has_changes) return;
    setAiGenerating(true);
    setError(null);
    try {
      const res = await invoke<AiPrResponse>("generate_ai_pull_request", {
        repoPath,
        base: baseBranch,
        head: headBranch,
      });
      if (res.title) setTitle(res.title);
      if (res.description) setDescription(res.description);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw || "No se pudo generar con IA. Verifica tu configuración.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Submit PR to GitHub API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !diffCheck?.has_changes) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await invoke<CreatedPrResult>("create_pull_request_cmd", {
        ownerRepo: repoSlug,
        title: title.trim(),
        head: headBranch,
        base: baseBranch,
        body: description.trim() ? description.trim() : null,
        draft: isDraft,
      });
      setCreatedPr(result);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw);
    } finally {
      setSubmitting(false);
    }
  };

  // Fallback / Direct open in browser
  const handleOpenInBrowser = async () => {
    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(description);
    const url = `https://github.com/${repoSlug}/compare/${baseBranch}...${headBranch}?expand=1&title=${encodedTitle}&body=${encodedBody}`;
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
    onClose();
  };

  const handleOpenCreatedPr = async () => {
    if (createdPr?.html_url) {
      try {
        await openUrl(createdPr.html_url);
      } catch {
        window.open(createdPr.html_url, "_blank");
      }
    }
  };

  const handleCopyUrl = async () => {
    if (!createdPr?.html_url) return;
    try {
      await navigator.clipboard.writeText(createdPr.html_url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // fallback
    }
  };

  const isFormValid = Boolean(title.trim()) && Boolean(diffCheck?.has_changes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Crear Pull Request</h2>
              <p className="text-[10px] text-[#8b949e]">
                Fusiona tus ramas remotas en GitHub con revisión y asistencia de IA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success View */}
        {createdPr ? (
          <div className="p-6 flex flex-col items-center text-center gap-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">¡Pull Request Creado Exitosamente!</h3>
              <p className="text-xs text-[#8b949e]">
                Se ha publicado en GitHub como el Pull Request{" "}
                <span className="text-emerald-300 font-mono font-bold">#{createdPr.number}</span>
              </p>
            </div>

            {/* Detailed PR Card without artificial truncation */}
            <div className="w-full p-4 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col gap-3 text-left">
              <div className="flex items-center justify-between gap-2 border-b border-[#30363d]/60 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
                  <span className="text-cyan-400 font-semibold">{headBranch}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6e7681]" />
                  <span className="text-purple-400 font-semibold">{baseBranch}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider font-mono">
                  {createdPr.state}
                </span>
              </div>

              {/* Full Title (no truncation) */}
              <div>
                <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider block mb-1">
                  Título
                </span>
                <h4 className="text-sm font-medium text-white break-words leading-relaxed font-sans">
                  {createdPr.title}
                </h4>
              </div>

              {/* URL and Copy Link row */}
              <div className="pt-2 border-t border-[#30363d]/60 flex items-center justify-between gap-3 text-xs">
                <span className="text-[#58a6ff] font-mono text-[11px] truncate flex-1 select-all">
                  {createdPr.html_url}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-white transition-colors cursor-pointer text-[11px]"
                  title="Copiar enlace al portapapeles"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar enlace</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1 w-full justify-end">
              <Button size="sm" variant="secondary" onClick={onClose} className="px-4">
                Cerrar
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleOpenCreatedPr}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer px-4"
              >
                <span>Revisar y Aprobar en GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          /* Main Form View */
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed flex-1">
                  <span>{error}</span>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleOpenInBrowser}
                      className="text-xs font-semibold underline text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Intentar publicar directamente en el navegador GitHub ↗</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Repository & Branch Comparison Matrix (Flecha 1 y 4) */}
            <div className="flex flex-col gap-2 p-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs">
              <div className="flex items-center gap-2.5">
                {/* Origin Branch (Head) */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <label className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1 truncate">
                    <GitBranch className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">Origen (Head)</span>
                  </label>
                  <select
                    value={headBranch}
                    onChange={(e) => handleHeadBranchChange(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none cursor-pointer truncate"
                  >
                    {availableBranches.map((b) => (
                      <option key={`head-${b}`} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] text-[#8b949e] truncate font-mono">
                    {repoSlug}:{headBranch}
                  </span>
                </div>

                {/* Swap Branches Button in the center */}
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={handleSwapBranches}
                    title="Invertir dirección de fusión (intercambiar origen y destino)"
                    className="p-1.5 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Destination Branch (Base) */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <label className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1 truncate">
                    <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="truncate">Destino (Base)</span>
                  </label>
                  <select
                    value={baseBranch}
                    onChange={(e) => handleBaseBranchChange(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none cursor-pointer truncate"
                  >
                    {availableBranches.map((b) => (
                      <option key={`base-${b}`} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] text-[#8b949e] truncate font-mono">
                    {repoSlug}:{baseBranch}
                  </span>
                </div>
              </div>

              {/* Status Indicator Bar */}
              {checkingDiff ? (
                <div className="flex items-center gap-2 text-xs text-[#8b949e] pt-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                  <span>Comprobando diferencias y commits entre ramas...</span>
                </div>
              ) : diffCheck?.has_changes ? (
                <div className="flex items-center justify-between pt-1 border-t border-[#30363d]/60 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>
                      {diffCheck.commits_count}{" "}
                      {diffCheck.commits_count === 1
                        ? "commit pendiente por fusionar"
                        : "commits pendientes por fusionar"}
                    </span>
                  </div>
                  {diffCheck.stat_summary && (
                    <span className="text-[11px] text-[#8b949e] font-mono">
                      {diffCheck.stat_summary}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Empty State when Up to Date (Flecha 1) */}
            {!checkingDiff && diffCheck && !diffCheck.has_changes ? (
              <div className="p-8 flex flex-col items-center text-center gap-3 bg-[#0d1117] border border-[#30363d] rounded-2xl animate-in fade-in duration-150 my-1">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ramas al día: No hay cambios pendientes</h3>
                  <p className="text-xs text-[#8b949e] mt-1 max-w-md leading-relaxed">
                    La rama destino <span className="text-purple-300 font-mono font-medium">{baseBranch}</span>{" "}
                    ya contiene todos los commits de <span className="text-cyan-300 font-mono font-medium">{headBranch}</span>.
                    No existen modificaciones para crear un Pull Request.
                  </p>
                </div>
                <p className="text-[11px] text-[#484f58]">
                  Puedes seleccionar otra rama o pulsar el botón de invertir ⇄ arriba para comparar en la dirección contraria.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="secondary" onClick={onClose} type="button">
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : (
              /* Editable Form Fields when changes exist */
              <>
                {/* Title with AI Generation Button (Flecha 2) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                      Título del Pull Request *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateAiPr}
                      disabled={aiGenerating || !diffCheck?.has_changes}
                      className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                      title={aiGenerating ? "Analizando cambios con IA..." : "Generar título y descripción con IA"}
                      aria-label="Generar título y descripción con IA"
                    >
                      <Sparkles
                        className={`w-3.5 h-3.5 text-amber-300 ${aiGenerating ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={`ej. feat: fusionar ${headBranch || "dev"} en ${baseBranch || "main"}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-none font-sans"
                  />
                </div>

                {/* Description (Markdown) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                    Descripción (Markdown)
                  </label>
                  <textarea
                    rows={6}
                    placeholder={`## Resumen de Cambios\nDetalla el propósito técnico de la fusión...\n\n## Novedades y Mejoras\n- Lista de modificaciones clave...`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-none font-mono resize-none leading-relaxed"
                  />
                </div>

                {/* Draft Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDraft}
                    onChange={(e) => setIsDraft(e.target.checked)}
                    className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-[#c9d1d9]">Crear como borrador (Draft Pull Request)</span>
                </label>

                {/* Actions Bar (Flecha 3) */}
                <div className="flex items-center justify-between pt-3 border-t border-[#30363d] mt-1">
                  <button
                    type="button"
                    onClick={handleOpenInBrowser}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Continuar editando en GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={onClose} type="button">
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      type="submit"
                      disabled={submitting || !isFormValid}
                      className={`flex items-center gap-1.5 font-semibold transition-all shadow-sm ${
                        isFormValid
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          : "bg-emerald-950/60 text-[#8b949e] border border-emerald-900/40 opacity-50 cursor-not-allowed"
                      }`}
                      title={!isFormValid ? "Ingresa un título para publicar el Pull Request" : undefined}
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>{submitting ? "Publicando en GitHub..." : "Crear Pull Request"}</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  GitPullRequest,
  X,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GitBranch,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "../../../components/ui/Button";
import { BranchInfo } from "../../../types/git";

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
    return Array.from(set);
  }, [branches]);

  useEffect(() => {
    if (isOpen) {
      setCreatedPr(null);
      setError(null);

      // Clean head branch
      const cleanHead = initialHeadBranch?.replace(/^origin\//, "") || "dev";
      setHeadBranch(cleanHead);

      // Base branch: prefer main or master, or first branch that isn't head
      const cleanBase = initialBaseBranch?.replace(/^origin\//, "") || "main";
      setBaseBranch(cleanBase);

      setTitle(`feat: fusionar ${cleanHead} en ${cleanBase}`);
      setDescription(
        `## 📌 Resumen de Cambios\nIntegración de los cambios desarrollados en la rama \`${cleanHead}\`.\n\n## 🚀 Novedades y Mejoras\n- Implementación y pruebas de nuevas funcionalidades.\n\n## 🧪 Pruebas Realizadas\n- Verificación de código y pruebas de integración superadas.`
      );
    }
  }, [isOpen, initialHeadBranch, initialBaseBranch]);

  if (!isOpen) return null;

  // AI Generation of PR title and description
  const handleGenerateAiPr = async () => {
    if (!headBranch || !baseBranch) return;
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
      console.warn("Fallo en generación IA de PR:", err);
      setError(
        typeof err === "string" ? err : "No se pudo generar con IA. Verifica tu configuración de API."
      );
    } finally {
      setAiGenerating(false);
    }
  };

  // Submit PR to GitHub API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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
          <div className="p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">¡Pull Request Creado Exitosamente!</h3>
              <p className="text-xs text-[#8b949e] mt-1">
                Se ha publicado en GitHub como el Pull Request{" "}
                <span className="text-emerald-300 font-mono font-bold">#{createdPr.number}</span>
              </p>
            </div>

            <div className="w-full max-w-md p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col gap-2 text-left font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
                <span>Título:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                  {createdPr.state}
                </span>
              </div>
              <div className="text-white font-medium truncate">{createdPr.title}</div>
              <div className="text-[11px] text-[#58a6ff] truncate">{createdPr.html_url}</div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <Button size="sm" variant="secondary" onClick={onClose} className="px-4">
                Cerrar
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleOpenCreatedPr}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30"
              >
                <span>Revisar y Aprobar en GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          /* Form View */
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

            {/* Provider Tabs (GitHub active) */}
            <div className="flex items-center gap-2 border-b border-[#30363d] pb-2 text-xs">
              <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mr-2">
                Proveedor:
              </span>
              <button
                type="button"
                className="px-3 py-1 rounded-md bg-[#21262d] text-white border border-blue-500/40 font-semibold flex items-center gap-1.5"
              >
                <span>GitHub</span>
              </button>
              <button
                type="button"
                disabled
                className="px-3 py-1 rounded-md text-[#484f58] opacity-50 cursor-not-allowed"
              >
                GitLab
              </button>
              <button
                type="button"
                disabled
                className="px-3 py-1 rounded-md text-[#484f58] opacity-50 cursor-not-allowed"
              >
                Bitbucket
              </button>
            </div>

            {/* Repository & Branch Comparison Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs">
              {/* Origin Branch (Head) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-cyan-400" />
                  <span>Rama Origen (Head)</span>
                </label>
                <select
                  value={headBranch}
                  onChange={(e) => setHeadBranch(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  {availableBranches.map((b) => (
                    <option key={`head-${b}`} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#8b949e] truncate font-mono">
                  {repoSlug}:{headBranch}
                </span>
              </div>

              {/* Destination Branch (Base) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-purple-400" />
                  <span>Rama Destino (Base)</span>
                </label>
                <select
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  {availableBranches.map((b) => (
                    <option key={`base-${b}`} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#8b949e] truncate font-mono">
                  {repoSlug}:{baseBranch}
                </span>
              </div>
            </div>

            {/* Title with AI Generation Button */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                  Título del Pull Request *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAiPr}
                  disabled={aiGenerating}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[11px] font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Analiza las diferencias entre ramas y genera título y descripción con IA"
                >
                  <Sparkles
                    className={`w-3.5 h-3.5 text-amber-300 ${aiGenerating ? "animate-spin" : ""}`}
                  />
                  <span>
                    {aiGenerating ? "Analizando cambios con IA..." : "Generar título y descripción con IA"}
                  </span>
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="ej. feat(auth): implementar inicio de sesión con OAuth2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Description (Markdown) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                Descripción (Markdown)
              </label>
              <textarea
                rows={6}
                placeholder="Explica detalladamente las modificaciones, tickets relacionados y cómo probarlas..."
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

            {/* Actions Bar */}
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
                  disabled={submitting || !title.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>{submitting ? "Publicando en GitHub..." : "Crear Pull Request"}</span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

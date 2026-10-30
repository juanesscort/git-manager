import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  PullRequestItem,
  PullRequestDetail,
  CheckRunItem,
  RepoPermissions,
  ReviewPullRequestRequest,
} from "../../../types/git";

export function usePullRequests() {
  const [permissions, setPermissions] = useState<RepoPermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const [pullRequests, setPullRequests] = useState<PullRequestItem[]>([]);
  const [loadingPrs, setLoadingPrs] = useState(false);

  const [selectedPr, setSelectedPr] = useState<PullRequestDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [checks, setChecks] = useState<CheckRunItem[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(false);

  const [aiReviewSummary, setAiReviewSummary] = useState<string | null>(null);
  const [aiReviewing, setAiReviewing] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  // Fetch repository permissions
  const fetchPermissions = useCallback(async (ownerRepo: string) => {
    if (!ownerRepo || ownerRepo.includes("desconocido")) return;
    setLoadingPermissions(true);
    try {
      const res = await invoke<RepoPermissions>("get_repo_permissions_cmd", {
        ownerRepo,
      });
      setPermissions(res);
    } catch {
      // Si no tiene permisos explícitos o falla, asumir lectura básica
      setPermissions({
        admin: false,
        maintain: false,
        push: false,
        triage: false,
        pull: true,
        role_name: "read",
      });
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  // Fetch list of pull requests
  const fetchPullRequests = useCallback(
    async (ownerRepo: string, state: string = "open") => {
      if (!ownerRepo || ownerRepo.includes("desconocido")) return;
      setLoadingPrs(true);
      setError(null);
      try {
        const res = await invoke<PullRequestItem[]>("list_pull_requests_cmd", {
          ownerRepo,
          state,
        });
        setPullRequests(res);
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        setError(raw);
        setPullRequests([]);
      } finally {
        setLoadingPrs(false);
      }
    },
    []
  );

  // Select a pull request and load details + checks
  const selectPullRequest = useCallback(
    async (ownerRepo: string, prNumber: number, headSha?: string) => {
      setLoadingDetails(true);
      setError(null);
      setAiReviewSummary(null);
      try {
        const detail = await invoke<PullRequestDetail>(
          "get_pull_request_details_cmd",
          { ownerRepo, pullNumber: prNumber }
        );
        setSelectedPr(detail);

        const sha = headSha || detail.head_sha;
        if (sha) {
          setLoadingChecks(true);
          try {
            const checkRuns = await invoke<CheckRunItem[]>(
              "get_pull_request_checks_cmd",
              { ownerRepo, headSha: sha }
            );
            setChecks(checkRuns);
          } catch {
            setChecks([]);
          } finally {
            setLoadingChecks(false);
          }
        }
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        setError(raw);
      } finally {
        setLoadingDetails(false);
      }
    },
    []
  );

  // Review with AI (strictly on demand)
  const generateAiReview = useCallback(
    async (req: ReviewPullRequestRequest) => {
      setAiReviewing(true);
      setError(null);
      try {
        const summary = await invoke<string>("review_pull_request_with_ai", {
          req,
        });
        setAiReviewSummary(summary);
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        setError(`Error al generar revisión con IA: ${raw}`);
      } finally {
        setAiReviewing(false);
      }
    },
    []
  );

  // Submit formal review (APPROVE, REQUEST_CHANGES, COMMENT)
  const submitReview = useCallback(
    async (
      ownerRepo: string,
      pullNumber: number,
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
      body?: string
    ) => {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        await invoke("submit_pull_request_review_cmd", {
          ownerRepo,
          pullNumber,
          event,
          body: body?.trim() ? body.trim() : null,
        });
        const msg =
          event === "APPROVE"
            ? "¡Pull Request aprobado exitosamente!"
            : event === "REQUEST_CHANGES"
            ? "Se enviaron solicitudes de cambio para este Pull Request."
            : "Comentario de revisión enviado.";
        setSuccessMessage(msg);
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        setError(raw);
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  // Merge pull request
  const mergePullRequest = useCallback(
    async (
      ownerRepo: string,
      pullNumber: number,
      mergeMethod: "merge" | "squash" | "rebase",
      commitTitle?: string,
      commitMessage?: string
    ) => {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        await invoke("merge_pull_request_cmd", {
          ownerRepo,
          pullNumber,
          mergeMethod,
          commitTitle: commitTitle?.trim() ? commitTitle.trim() : null,
          commitMessage: commitMessage?.trim() ? commitMessage.trim() : null,
        });
        setSuccessMessage(`¡Pull Request #${pullNumber} fusionado con éxito en GitHub!`);
        // Refresh details and list
        await fetchPullRequests(ownerRepo, "open");
        if (selectedPr && selectedPr.number === pullNumber) {
          setSelectedPr({ ...selectedPr, state: "closed" });
        }
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        setError(raw);
      } finally {
        setActionLoading(false);
      }
    },
    [fetchPullRequests, selectedPr]
  );

  return {
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
    setSelectedPr,
  };
}

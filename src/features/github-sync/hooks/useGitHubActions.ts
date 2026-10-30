import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WorkflowRun, WorkflowItem, WorkflowJob } from "../../../types/git";

export function useGitHubActions(repoSlug: string | null) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [selectedJobLogs, setSelectedJobLogs] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    if (!repoSlug) {
      setWorkflows([]);
      return;
    }
    setLoadingWorkflows(true);
    try {
      const data = await invoke<WorkflowItem[]>("list_repository_workflows_cmd", {
        ownerRepo: repoSlug,
      });
      setWorkflows(data);
    } catch (err: unknown) {
      console.warn("Error cargando workflows de Actions:", err);
    } finally {
      setLoadingWorkflows(false);
    }
  }, [repoSlug]);

  const fetchRuns = useCallback(
    async (workflowId?: number, branch?: string, status?: string) => {
      if (!repoSlug) {
        setRuns([]);
        return;
      }
      setLoadingRuns(true);
      try {
        const data = await invoke<WorkflowRun[]>("list_workflow_runs_cmd", {
          ownerRepo: repoSlug,
          workflowId: workflowId ?? null,
          branch: branch?.trim() ? branch.trim() : null,
          status: status?.trim() ? status.trim() : null,
          perPage: 30,
        });
        setRuns(data);
      } catch (err: unknown) {
        console.warn("Error cargando ejecuciones de GitHub Actions:", err);
        setError(typeof err === "string" ? err : JSON.stringify(err));
      } finally {
        setLoadingRuns(false);
      }
    },
    [repoSlug]
  );

  const fetchRunJobs = useCallback(
    async (runId: number) => {
      if (!repoSlug) return;
      setLoadingJobs(true);
      try {
        const data = await invoke<WorkflowJob[]>("list_workflow_run_jobs_cmd", {
          ownerRepo: repoSlug,
          runId,
        });
        setJobs(data);
      } catch (err: unknown) {
        console.error(`Error cargando jobs del run #${runId}:`, err);
        setError(typeof err === "string" ? err : JSON.stringify(err));
      } finally {
        setLoadingJobs(false);
      }
    },
    [repoSlug]
  );

  const fetchJobLogs = useCallback(
    async (jobId: number) => {
      if (!repoSlug) return;
      setLoadingLogs(true);
      setSelectedJobLogs(null);
      try {
        const logs = await invoke<string>("get_workflow_job_logs_cmd", {
          ownerRepo: repoSlug,
          jobId,
        });
        setSelectedJobLogs(logs);
      } catch (err: unknown) {
        console.error(`Error cargando logs del job #${jobId}:`, err);
        setError(typeof err === "string" ? err : JSON.stringify(err));
      } finally {
        setLoadingLogs(false);
      }
    },
    [repoSlug]
  );

  const cancelRun = useCallback(
    async (runId: number) => {
      if (!repoSlug) return;
      setActionLoading(true);
      setError(null);
      try {
        await invoke("cancel_workflow_run_cmd", {
          ownerRepo: repoSlug,
          runId,
        });
        setSuccessMessage(`Ejecución #${runId} cancelada exitosamente.`);
        await fetchRuns();
      } catch (err: unknown) {
        console.error(`Error cancelando ejecución #${runId}:`, err);
        setError(typeof err === "string" ? err : JSON.stringify(err));
      } finally {
        setActionLoading(false);
      }
    },
    [repoSlug, fetchRuns]
  );

  const rerunRun = useCallback(
    async (runId: number, failedOnly = false) => {
      if (!repoSlug) return;
      setActionLoading(true);
      setError(null);
      try {
        await invoke("rerun_workflow_run_cmd", {
          ownerRepo: repoSlug,
          runId,
          failedOnly,
        });
        setSuccessMessage(
          failedOnly
            ? `Trabajos fallidos del run #${runId} puestos en cola para reintentar.`
            : `Ejecución #${runId} reintentada exitosamente.`
        );
        await fetchRuns();
      } catch (err: unknown) {
        console.error(`Error reintentando ejecución #${runId}:`, err);
        setError(typeof err === "string" ? err : JSON.stringify(err));
      } finally {
        setActionLoading(false);
      }
    },
    [repoSlug, fetchRuns]
  );

  const dispatchWorkflow = useCallback(
    async (workflowIdOrFile: string, branchRef: string) => {
      if (!repoSlug) return;
      setActionLoading(true);
      setError(null);
      try {
        await invoke("dispatch_workflow_cmd", {
          ownerRepo: repoSlug,
          workflowIdOrFile,
          branchRef,
        });
        setSuccessMessage(`Workflow '${workflowIdOrFile}' disparado con éxito en '${branchRef}'.`);
        setTimeout(() => {
          fetchRuns();
        }, 1500);
      } catch (err: unknown) {
        console.error(`Error disparando workflow ${workflowIdOrFile}:`, err);
        setError(typeof err === "string" ? err : JSON.stringify(err));
      } finally {
        setActionLoading(false);
      }
    },
    [repoSlug, fetchRuns]
  );

  // Auto-refresh interval (30s)
  useEffect(() => {
    if (!autoRefresh || !repoSlug) return;
    const interval = setInterval(() => {
      fetchRuns();
      if (selectedRun) {
        fetchRunJobs(selectedRun.id);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, repoSlug, fetchRuns, selectedRun, fetchRunJobs]);

  // Initial load
  useEffect(() => {
    if (repoSlug) {
      fetchRuns();
      fetchWorkflows();
    }
  }, [repoSlug, fetchRuns, fetchWorkflows]);

  const activeRunsCount = useMemo(() => {
    return runs.filter(
      (r) => r.status === "in_progress" || r.status === "queued" || r.status === "waiting"
    ).length;
  }, [runs]);

  const latestRun = useMemo(() => {
    return runs.length > 0 ? runs[0] : null;
  }, [runs]);

  const latestRunStatus = useMemo(() => {
    if (!latestRun) return null;
    if (latestRun.status === "in_progress" || latestRun.status === "queued") {
      return "in_progress";
    }
    return latestRun.conclusion || latestRun.status;
  }, [latestRun]);

  return {
    runs,
    workflows,
    loadingRuns,
    loadingWorkflows,
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
    fetchWorkflows,
    fetchRunJobs,
    fetchJobLogs,
    cancelRun,
    rerunRun,
    dispatchWorkflow,
    activeRunsCount,
    latestRun,
    latestRunStatus,
  };
}

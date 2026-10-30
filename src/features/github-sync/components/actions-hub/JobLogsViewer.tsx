import React, { useState, useMemo } from "react";
import { Terminal, Copy, Check, Download, Search, X, Loader2 } from "lucide-react";
import { WorkflowJob } from "../../../../types/git";

interface JobLogsViewerProps {
  job: WorkflowJob;
  logs: string | null;
  loading: boolean;
  onClose: () => void;
}

export const JobLogsViewer: React.FC<JobLogsViewerProps> = ({
  job,
  logs,
  loading,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const cleanLogs = useMemo(() => {
    if (!logs) return [];
    // Remove ANSI escape sequences
    const sanitized = logs.replace(/\x1b\[[0-9;]*[mGKH]/g, "");
    return sanitized.split("\n");
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return cleanLogs;
    const term = searchTerm.toLowerCase();
    return cleanLogs.filter((line) => line.toLowerCase().includes(term));
  }, [cleanLogs, searchTerm]);

  const handleCopy = () => {
    if (!logs) return;
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (!logs) return;
    const blob = new Blob([logs], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-${job.id}-${job.name.replace(/[^a-z0-9]/gi, "_")}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden select-text shadow-2xl">
      {/* Console Header */}
      <div className="h-10 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0 mr-2">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-mono text-xs font-semibold text-white truncate">
            {job.name} (Job #{job.id})
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#21262d] text-[#8b949e]">
            {cleanLogs.length} líneas
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-36 sm:w-48 pl-7 pr-2 py-1 text-[11px] bg-[#0d1117] border border-[#30363d] rounded text-white placeholder-[#484f58] focus:outline-hidden focus:border-cyan-500 font-mono"
            />
          </div>

          <button
            onClick={handleCopy}
            disabled={!logs || loading}
            title="Copiar contenido de los logs"
            className="p-1.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={!logs || loading}
            title="Descargar archivo de logs (.log)"
            className="p-1.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            title="Cerrar visor de logs"
            className="p-1.5 rounded hover:bg-rose-950/40 hover:text-rose-300 text-[#8b949e] transition-colors cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed bg-[#05080f] text-[#c9d1d9]">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-[#8b949e] select-none">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Descargando logs del servidor de GitHub...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#484f58] select-none italic">
            {searchTerm ? "No se encontraron coincidencias en los logs." : "No hay logs disponibles para este trabajo."}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map((line, idx) => (
              <div key={idx} className="flex items-start hover:bg-[#161b22]/60 px-1 rounded">
                <span className="w-12 shrink-0 select-none text-[#484f58] text-right pr-3 font-mono text-[10px]">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-all">{line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

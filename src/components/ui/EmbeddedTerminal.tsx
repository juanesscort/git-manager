import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Terminal, Plus, X, Maximize2, Minimize2, Trash2 } from "lucide-react";

interface TerminalExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  user: string;
  hostname: string;
}

interface TerminalPromptInfo {
  user: string;
  hostname: string;
}

interface CommandEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
  time: string;
}

interface EmbeddedTerminalProps {
  repoPath: string;
  isOpen: boolean;
  onClose: () => void;
}

export const EmbeddedTerminal: React.FC<EmbeddedTerminalProps> = ({
  repoPath,
  isOpen,
  onClose,
}) => {
  const [entries, setEntries] = useState<CommandEntry[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [executing, setExecuting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [promptInfo, setPromptInfo] = useState<TerminalPromptInfo>({
    user: "user",
    hostname: "linux",
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fetch prompt info on mount
  useEffect(() => {
    invoke<TerminalPromptInfo>("get_terminal_prompt_info")
      .then((info) => setPromptInfo(info))
      .catch(() => {});
  }, []);

  // Auto scroll down when entries change
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [entries, isOpen]);

  if (!isOpen) return null;

  const cleanDisplayPath = repoPath.replace(/^\/home\/[^/]+/, "~");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;

    if (cmd === "clear") {
      setEntries([]);
      setInputVal("");
      setHistory((prev) => [cmd, ...prev.filter((h) => h !== cmd)].slice(0, 50));
      setHistoryIdx(-1);
      return;
    }

    setExecuting(true);
    setInputVal("");
    setHistory((prev) => [cmd, ...prev.filter((h) => h !== cmd)].slice(0, 50));
    setHistoryIdx(-1);

    const now = new Date().toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    try {
      const res = await invoke<TerminalExecResult>("exec_terminal_cmd", {
        cwd: repoPath,
        command: cmd,
      });

      setEntries((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}`,
          command: cmd,
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exit_code,
          cwd: cleanDisplayPath,
          time: now,
        },
      ]);
    } catch (err: unknown) {
      setEntries((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}`,
          command: cmd,
          stdout: "",
          stderr: String(err),
          exitCode: 1,
          cwd: cleanDisplayPath,
          time: now,
        },
      ]);
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal("");
      }
    }
  };

  return (
    <div
      style={{ height: isMaximized ? "450px" : "210px" }}
      className="shrink-0 flex flex-col bg-[#090d13] border-t border-[#30363d] select-text transition-all duration-150 z-20"
    >
      {/* Terminal Title Bar */}
      <div className="h-7 bg-[#161b22] border-b border-[#30363d] px-2 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-1">
          {/* Active Terminal Tab */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-t text-xs font-mono bg-[#090d13] border-t-2 border-t-cyan-500 border-x border-[#30363d] text-white">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>bash</span>
            <span className="text-[10px] text-[#8b949e] font-sans">({cleanDisplayPath})</span>
          </div>

          <button
            onClick={() => setEntries([])}
            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors ml-1"
            title="Nueva sesión"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEntries([])}
            className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors"
            title="Limpiar salida (clear)"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors"
            title={isMaximized ? "Restaurar tamaño" : "Maximizar terminal"}
          >
            {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>

          <button
            onClick={onClose}
            className="p-1 text-[#8b949e] hover:text-rose-400 rounded hover:bg-[#21262d] transition-colors"
            title="Cerrar terminal"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Output Stream */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto p-2.5 font-mono text-xs flex flex-col gap-1 text-[#c9d1d9] cursor-text"
      >
        <div className="text-[11px] text-[#484f58] mb-1">
          Git-Manager Terminal v0.1 • bash en {repoPath} • escribe 'clear' para limpiar
        </div>

        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-0.5">
            {/* Prompt + Command Header */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-emerald-400 font-semibold">
                {promptInfo.user}@{promptInfo.hostname}
              </span>
              <span className="text-white">:</span>
              <span className="text-blue-400 font-semibold">{entry.cwd}</span>
              <span className="text-white">$</span>
              <span className="text-white font-bold ml-1">{entry.command}</span>
            </div>

            {/* Standard Output */}
            {entry.stdout && (
              <pre className="text-[#c9d1d9] whitespace-pre-wrap leading-relaxed overflow-x-auto pl-1">
                {entry.stdout}
              </pre>
            )}

            {/* Standard Error */}
            {entry.stderr && (
              <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed overflow-x-auto pl-1">
                {entry.stderr}
              </pre>
            )}
          </div>
        ))}

        {/* Current Active Input Prompt */}
        <form onSubmit={handleSubmit} className="flex items-center gap-1 mt-0.5">
          <span className="text-emerald-400 font-semibold shrink-0">
            {promptInfo.user}@{promptInfo.hostname}
          </span>
          <span className="text-white shrink-0">:</span>
          <span className="text-blue-400 font-semibold shrink-0">{cleanDisplayPath}</span>
          <span className="text-white shrink-0">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executing}
            className="flex-1 bg-transparent text-white focus:outline-none ml-1 caret-cyan-400 font-mono text-xs"
            placeholder={executing ? "Ejecutando..." : ""}
            autoFocus
          />
        </form>

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

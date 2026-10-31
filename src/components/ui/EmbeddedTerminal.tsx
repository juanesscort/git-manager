import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  Terminal as TerminalIcon,
  X,
  Maximize2,
  Minimize2,
  BrushCleaning,
  Copy,
  ClipboardPaste,
  CheckSquare,
} from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const sessionIdRef = useRef<string>(Math.random().toString(36).substring(2, 10));

  const [isMaximized, setIsMaximized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    hasSelection: boolean;
  } | null>(null);

  const cleanDisplayPath = repoPath.replace(/^\/home\/[^/]+/, "~");

  const startPtySession = useCallback(async () => {
    if (!containerRef.current) return;

    // Clean up previous session if any
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    if (sessionIdRef.current) {
      invoke("pty_close_session_cmd", { sessionId: sessionIdRef.current }).catch(() => { });
    }

    // New session ID
    const newSessionId = `gm-pty-${Math.random().toString(36).substring(2, 10)}`;
    sessionIdRef.current = newSessionId;

    // Initialize xterm.js instance
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace, sans-serif",
      fontSize: 12,
      lineHeight: 1.25,
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "rgba(56, 139, 253, 0.4)",
        black: "#484f58",
        red: "#ff7b72",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#b1bac4",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Render into DOM container
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    let lastPasteTime = 0;
    let lastPasteText = "";

    // Intercept keyboard shortcuts for Copy (Ctrl+C), Paste (Ctrl+V), etc.
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.type !== "keydown") {
        return true;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // 1. Copy: Ctrl+C / Cmd+C (when text is selected) or Ctrl+Shift+C
      if (isCtrlOrCmd && !event.altKey && (event.key === "c" || event.key === "C")) {
        if (event.shiftKey || term.hasSelection()) {
          const selection = term.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection).catch((err) => {
              console.error("Error al copiar texto al portapapeles:", err);
            });
          }
          return false; // Intercept: don't send \x03 (SIGINT) to bash
        }
        // No selection: let xterm send SIGINT (\x03) to bash
        return true;
      }

      // 2. Paste: Ctrl+V / Cmd+V / Ctrl+Shift+V / Shift+Insert
      const isPaste =
        (isCtrlOrCmd && !event.altKey && (event.key === "v" || event.key === "V")) ||
        (event.shiftKey && event.key === "Insert");

      if (isPaste) {
        navigator.clipboard
          .readText()
          .then((text) => {
            if (!text) return;
            const now = Date.now();
            if (now - lastPasteTime < 250 && text === lastPasteText) {
              return;
            }
            lastPasteTime = now;
            lastPasteText = text;
            term.paste(text);
          })
          .catch((err) => {
            console.warn("Error leyendo portapapeles con navigator:", err);
          });
        return false; // Intercept: don't send \x16 to bash
      }

      return true;
    });

    // Send user keystrokes directly into PTY master
    term.onData((data) => {
      invoke("pty_write_cmd", {
        sessionId: newSessionId,
        data,
      }).catch((err) => console.error("Error enviando datos a PTY:", err));
    });

    // Listen for incoming PTY output streaming from Rust
    const unlisten = await listen<string>(`pty-data-${newSessionId}`, (event) => {
      term.write(event.payload);
    });
    unlistenRef.current = unlisten;

    // Spawn native Linux PTY session in Rust
    try {
      await invoke("pty_open_session_cmd", {
        sessionId: newSessionId,
        cwd: repoPath,
        cols: term.cols || 80,
        rows: term.rows || 24,
      });
    } catch (err) {
      term.write(`\r\n\x1b[31mError al iniciar la terminal PTY nativa: ${err}\x1b[0m\r\n`);
    }

    term.focus();
  }, [repoPath]);

  // Start session when terminal opens or repository path changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startPtySession();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (sessionIdRef.current) {
        invoke("pty_close_session_cmd", { sessionId: sessionIdRef.current }).catch(() => { });
      }
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    }
  }, [isOpen, repoPath, startPtySession]);

  // Window resize observer to update PTY dimensions
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current && sessionIdRef.current) {
        try {
          fitAddonRef.current.fit();
          const { cols, rows } = xtermRef.current;
          if (cols > 0 && rows > 0) {
            invoke("pty_resize_cmd", {
              sessionId: sessionIdRef.current,
              cols,
              rows,
            }).catch(() => { });
          }
        } catch { }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen, isMaximized]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write("\x1b[2J\x1b[H");
    }
    if (sessionIdRef.current) {
      invoke("pty_write_cmd", {
        sessionId: sessionIdRef.current,
        data: "\x0c",
      }).catch(() => {});
    }
    xtermRef.current?.focus();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const hasSelection = Boolean(xtermRef.current?.hasSelection());
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      hasSelection,
    });
  };

  const handleCopySelection = () => {
    const selection = xtermRef.current?.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection).catch(() => {});
    }
    setContextMenu(null);
    xtermRef.current?.focus();
  };

  const handlePasteClipboard = async () => {
    setContextMenu(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text && xtermRef.current) {
        xtermRef.current.paste(text);
      }
    } catch (err) {
      console.warn("Error pegando del portapapeles:", err);
    }
    xtermRef.current?.focus();
  };

  const handleSelectAll = () => {
    xtermRef.current?.selectAll();
    setContextMenu(null);
    xtermRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`border-t border-[#30363d] bg-[#0d1117] flex flex-col z-30 transition-all ${isMaximized
          ? "fixed inset-0 z-50 h-screen w-screen"
          : "h-64 shrink-0 shadow-inner"
        }`}
    >
      {/* Terminal Title Bar */}
      <div className="h-8 bg-[#161b22] border-b border-[#30363d] px-3 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-mono font-semibold text-white">
            bash
          </span>
          <span className="text-[10px] text-[#8b949e] font-mono truncate max-w-sm">
            ({cleanDisplayPath})
          </span>
        </div>

        <div className="flex items-center gap-1 text-[#8b949e]">
          {/* Clear Terminal with brush-cleaning */}
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-[#21262d] hover:text-white transition-colors cursor-pointer"
            title="Limpiar terminal (Ctrl+L)"
          >
            <BrushCleaning className="w-3.5 h-3.5" />
          </button>

          {/* Maximize/Minimize Toggle */}
          <button
            onClick={() => {
              setIsMaximized(!isMaximized);
              setTimeout(() => fitAddonRef.current?.fit(), 100);
            }}
            className="p-1 rounded hover:bg-[#21262d] hover:text-white transition-colors cursor-pointer"
            title={isMaximized ? "Restaurar tamaño" : "Maximizar"}
          >
            {isMaximized ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </button>

          {/* Close Terminal */}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-rose-950/40 hover:text-rose-400 transition-colors cursor-pointer ml-1"
            title="Cerrar terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* xterm.js DOM Viewport */}
      <div
        ref={containerRef}
        onClick={() => xtermRef.current?.focus()}
        onContextMenu={handleContextMenu}
        className="flex-1 w-full h-full p-2 overflow-hidden bg-[#0d1117] select-text cursor-text font-mono text-xs relative"
      />

      {/* Floating Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl py-1 w-44 text-xs select-none backdrop-blur-md animate-in fade-in duration-100"
        >
          <button
            onClick={handleCopySelection}
            disabled={!contextMenu.hasSelection}
            className="w-full px-3 py-1.5 flex items-center justify-between text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5" /> Copiar
            </span>
            <span className="text-[10px] text-[#8b949e] font-mono">Ctrl+C</span>
          </button>

          <button
            onClick={handlePasteClipboard}
            className="w-full px-3 py-1.5 flex items-center justify-between text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ClipboardPaste className="w-3.5 h-3.5" /> Pegar
            </span>
            <span className="text-[10px] text-[#8b949e] font-mono">Ctrl+V</span>
          </button>

          <div className="h-px bg-[#30363d] my-1" />

          <button
            onClick={handleSelectAll}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition-colors cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Seleccionar todo
          </button>

          <button
            onClick={() => {
              handleClear();
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 flex items-center justify-between text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <BrushCleaning className="w-3.5 h-3.5" /> Limpiar terminal
            </span>
            <span className="text-[10px] text-[#8b949e] font-mono">Ctrl+L</span>
          </button>
        </div>
      )}
    </div>
  );
};

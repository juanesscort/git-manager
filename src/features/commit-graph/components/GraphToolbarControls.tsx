import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  Columns3,
  Settings,
  RotateCcw,
} from "lucide-react";

export type GraphViewMode = "compact" | "normal" | "modern";

export interface VisibleColumns {
  author: boolean;
  date: boolean;
  hash: boolean;
}

interface GraphToolbarControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchesCount: number;
  totalCount: number;
  visibleColumns: VisibleColumns;
  onToggleColumn: (column: keyof VisibleColumns) => void;
  viewMode: GraphViewMode;
  onChangeViewMode: (mode: GraphViewMode) => void;
  showCommitBody: boolean;
  onToggleShowCommitBody: (show: boolean) => void;
  onResetColumnWidths: () => void;
}

export const GraphToolbarControls: React.FC<GraphToolbarControlsProps> = ({
  searchQuery,
  onSearchChange,
  matchesCount,
  totalCount,
  visibleColumns,
  onToggleColumn,
  viewMode,
  onChangeViewMode,
  showCommitBody,
  onToggleShowCommitBody,
  onResetColumnWidths,
}) => {
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const columnsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setColumnsMenuOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setColumnsMenuOpen(false);
        setSettingsMenuOpen(false);
      }
      // Quick shortcut Ctrl+F to focus commit search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        if (document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 shrink-0 select-none">
      {/* 1. Commit Search Input */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar commits (Ctrl+F)..."
          className="h-7 w-44 md:w-56 pl-7 pr-7 text-xs bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-md text-white placeholder-[#8b949e] outline-hidden transition-all shadow-inner"
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              searchInputRef.current?.focus();
            }}
            className="absolute right-1.5 p-0.5 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors cursor-pointer"
            title="Limpiar búsqueda (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        ) : null}

        {searchQuery.trim() && (
          <div className="absolute -bottom-5 right-1 text-[9px] font-mono text-cyan-400 font-semibold pointer-events-none">
            {matchesCount} de {totalCount}
          </div>
        )}
      </div>

      {/* 2. Column Visibility Filter Popover */}
      <div className="relative" ref={columnsRef}>
        <button
          type="button"
          onClick={() => {
            setColumnsMenuOpen(!columnsMenuOpen);
            setSettingsMenuOpen(false);
          }}
          className={`flex items-center justify-center p-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
            columnsMenuOpen
              ? "bg-[#21262d] text-white border-blue-500/50 shadow-xs"
              : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
          title="Seleccionar columnas visibles del grafo"
        >
          <Columns3 className="w-3.5 h-3.5 text-blue-400" />
        </button>

        {columnsMenuOpen && (
          <div className="absolute right-0 top-8 z-50 w-44 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-2 flex flex-col gap-1 text-xs text-[#c9d1d9] animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8b949e] border-b border-[#30363d] mb-1">
              Columnas Visibles
            </div>

            {/* Author */}
            <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#21262d] cursor-pointer transition-colors">
              <span className="font-medium">Autor</span>
              <input
                type="checkbox"
                checked={visibleColumns.author}
                onChange={() => onToggleColumn("author")}
                className="w-3.5 h-3.5 rounded bg-[#0d1117] border-[#30363d] text-blue-600 focus:ring-0 cursor-pointer"
              />
            </label>

            {/* Date */}
            <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#21262d] cursor-pointer transition-colors">
              <span className="font-medium">Fecha</span>
              <input
                type="checkbox"
                checked={visibleColumns.date}
                onChange={() => onToggleColumn("date")}
                className="w-3.5 h-3.5 rounded bg-[#0d1117] border-[#30363d] text-blue-600 focus:ring-0 cursor-pointer"
              />
            </label>

            {/* Hash */}
            <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#21262d] cursor-pointer transition-colors">
              <span className="font-medium">Hash</span>
              <input
                type="checkbox"
                checked={visibleColumns.hash}
                onChange={() => onToggleColumn("hash")}
                className="w-3.5 h-3.5 rounded bg-[#0d1117] border-[#30363d] text-blue-600 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* 3. Graph View Settings Popover */}
      <div className="relative" ref={settingsRef}>
        <button
          type="button"
          onClick={() => {
            setSettingsMenuOpen(!settingsMenuOpen);
            setColumnsMenuOpen(false);
          }}
          className={`flex items-center justify-center p-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
            settingsMenuOpen
              ? "bg-[#21262d] text-white border-blue-500/50 shadow-xs"
              : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
          title="Ajustes de vista y densidad del grafo"
        >
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {settingsMenuOpen && (
          <div className="absolute right-0 top-8 z-50 w-64 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-3 flex flex-col gap-3 text-xs text-[#c9d1d9] animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e] border-b border-[#30363d] pb-1.5 flex items-center justify-between">
              <span>Ajustes del Grafo</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950/70 text-blue-300 border border-blue-500/30">
                Visualización
              </span>
            </div>

            {/* Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-white">
                Tipo de Vista:
              </span>
              <div className="grid grid-cols-3 gap-1 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
                <button
                  type="button"
                  onClick={() => onChangeViewMode("compact")}
                  className={`py-1 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === "compact"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                  }`}
                  title="Compacto: filas delgadas, descripción inline y puntos de color en lugar de fotos"
                >
                  Compacto
                </button>

                <button
                  type="button"
                  onClick={() => onChangeViewMode("normal")}
                  className={`py-1 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === "normal"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                  }`}
                  title="Normal: vista equilibrada original con avatares estándar"
                >
                  Normal
                </button>

                <button
                  type="button"
                  onClick={() => onChangeViewMode("modern")}
                  className={`py-1 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === "modern"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                  }`}
                  title="Moderno: títulos completos en multilínea sin cortes, avatares más grandes e iconos ampliados"
                >
                  Moderno
                </button>
              </div>

              <div className="text-[10px] text-[#8b949e] leading-snug">
                {viewMode === "compact" && (
                  <span>🔹 Filas ultra compactas, descripción inline y nodos simples coloreados.</span>
                )}
                {viewMode === "normal" && (
                  <span>🔹 Espaciado estándar equilibrado con avatares circulares de 18px.</span>
                )}
                {viewMode === "modern" && (
                  <span>🔹 Títulos con salto de línea (sin elipsis '...'), avatares de 24px y máxima legibilidad.</span>
                )}
              </div>
            </div>

            {/* Toggle Show Commit Descriptions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-white">
                  Descripción de Commits
                </span>
                <span className="text-[10px] text-[#8b949e]">
                  {viewMode === "compact" ? "Mostrar en la misma línea" : "Mostrar debajo del título"}
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showCommitBody}
                  onChange={(e) => onToggleShowCommitBody(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-[#21262d] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
              </label>
            </div>

            {/* Reset column widths button */}
            <div className="pt-2 border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => {
                  onResetColumnWidths();
                  setSettingsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-white transition-colors cursor-pointer"
                title="Restablecer el ancho de las columnas a los valores predeterminados"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Restablecer anchos de columna</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

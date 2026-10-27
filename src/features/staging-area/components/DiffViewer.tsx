import React from "react";
import { DiffDelta } from "../../../types/git";
import { FileText, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface DiffViewerProps {
  diff: DiffDelta | null;
  loading: boolean;
  onClose: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, loading, onClose }) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d1117] text-[#8b949e] text-xs">
        <span className="animate-pulse">Cargando diferencias del archivo...</span>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117] text-[#8b949e] p-6 text-center text-xs">
        <FileText className="w-10 h-10 mb-2 opacity-30" />
        <p>Selecciona un archivo modificado o preparado para inspeccionar su diff.</p>
      </div>
    );
  }

  const lines = diff.patch.split("\n");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] border-t border-[#30363d] overflow-hidden">
      {/* Diff Header */}
      <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs font-mono font-medium text-white truncate">{diff.path}</span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono ml-2">
            {diff.lines_added > 0 && (
              <span className="text-emerald-400">+{diff.lines_added}</span>
            )}
            {diff.lines_deleted > 0 && (
              <span className="text-rose-400">-{diff.lines_deleted}</span>
            )}
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={onClose} className="p-1 h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto font-mono text-xs select-text p-2">
        {lines.length === 0 || (lines.length === 1 && lines[0] === "") ? (
          <div className="p-4 text-[#8b949e] italic text-center">
            Archivo vacío o cambios binarios sin vista previa de texto.
          </div>
        ) : (
          <div className="flex flex-col">
            {lines.map((line, idx) => {
              let rowStyle = "text-[#c9d1d9] hover:bg-[#161b22]";
              let prefixStyle = "text-[#484f58]";

              if (line.startsWith("+")) {
                rowStyle = "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50";
                prefixStyle = "text-emerald-500 font-bold";
              } else if (line.startsWith("-")) {
                rowStyle = "bg-rose-950/30 text-rose-300 hover:bg-rose-950/50";
                prefixStyle = "text-rose-500 font-bold";
              } else if (line.startsWith("@")) {
                rowStyle = "bg-blue-950/30 text-blue-400 font-semibold my-1 py-0.5";
                prefixStyle = "text-blue-500";
              }

              return (
                <div key={idx} className={`flex items-start px-2 py-0.5 leading-5 ${rowStyle}`}>
                  <span className="w-10 text-right pr-3 select-none text-[10px] text-[#484f58] shrink-0">
                    {idx + 1}
                  </span>
                  <span className={`w-4 select-none shrink-0 text-center ${prefixStyle}`}>
                    {line.length > 0 ? line[0] : " "}
                  </span>
                  <span className="whitespace-pre-wrap break-all flex-1">
                    {line.length > 0 ? line.slice(1) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

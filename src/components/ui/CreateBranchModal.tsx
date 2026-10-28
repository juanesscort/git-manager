import React, { useState, useEffect } from "react";
import { GitBranch, X, Layers } from "lucide-react";
import { Button } from "./Button";
import { BranchesSummary } from "../../types/git";

interface CreateBranchModalProps {
  isOpen: boolean;
  branches?: BranchesSummary;
  currentBranch?: string | null;
  onClose: () => void;
  onCreate: (name: string, baseBranch?: string) => void;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  isOpen,
  branches,
  currentBranch,
  onClose,
  onCreate,
}) => {
  const [branchName, setBranchName] = useState("");
  const [baseBranch, setBaseBranch] = useState(currentBranch || "main");

  useEffect(() => {
    if (currentBranch) {
      setBaseBranch(currentBranch);
    }
  }, [currentBranch]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    onCreate(branchName.trim(), baseBranch);
    setBranchName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <GitBranch className="w-4 h-4 text-blue-400" />
            <span>Crear Nueva Rama Local</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {/* Base Branch Selection */}
          <div>
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Nacer a partir de (Rama Base):</span>
            </label>
            <select
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              <optgroup label="Ramas Locales">
                {branches?.local.map((b) => (
                  <option key={`base-local-${b.name}`} value={b.name}>
                    {b.name} {b.is_head || b.name === currentBranch ? " (HEAD actual)" : ""}
                  </option>
                ))}
              </optgroup>
              {branches?.remote && branches.remote.length > 0 && (
                <optgroup label="Ramas Remotas (GitHub)">
                  {branches.remote.map((b) => (
                    <option key={`base-remote-${b.name}`} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-[11px] text-[#8b949e] mt-1.5 leading-relaxed">
              La nueva rama heredará todos los commits, historial y estado actual de{" "}
              <span className="text-white font-mono font-medium">{baseBranch}</span>.
            </p>
          </div>

          {/* New Branch Name */}
          <div>
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
              <span>Nombre de la nueva rama:</span>
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="ej. feature/autenticacion o refactor/ia"
              autoFocus
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-[#8b949e] mt-1.5">
              Puedes usar barras <code className="text-blue-300">/</code> para agrupar en carpetas (ej.{" "}
              <span className="font-mono text-white">feature/mi-tarea</span>).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#30363d]/60">
            <Button size="sm" variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="primary"
              type="submit"
              disabled={!branchName.trim()}
              icon={<GitBranch className="w-3.5 h-3.5" />}
            >
              Crear Rama
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

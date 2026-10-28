import React, { useState } from "react";
import { GitBranch, X } from "lucide-react";
import { Button } from "./Button";

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [branchName, setBranchName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    onCreate(branchName.trim());
    setBranchName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
          <div>
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
              Nombre de la rama:
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="feature/mi-funcionalidad"
              autoFocus
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-[#8b949e] mt-1.5">
              Se creará apuntando al commit actual (HEAD).
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

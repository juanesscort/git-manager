import React, { useState } from "react";
import { RemoteRepo, GitHubUser } from "../../../types/git";
import { Lock, Globe, Search, X, GitFork, Copy, Check } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";

interface RemoteReposModalProps {
  isOpen: boolean;
  user: GitHubUser | null;
  repos: RemoteRepo[];
  loading: boolean;
  onClose: () => void;
}

export const RemoteReposModal: React.FC<RemoteReposModalProps> = ({
  isOpen,
  user,
  repos,
  loading,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyClone = (id: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117] shrink-0">
          <div className="flex items-center gap-3">
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-7 h-7 rounded-full border border-[#30363d]"
              />
            )}
            <div>
              <h2 className="text-sm font-semibold text-white">Tus Repositorios de GitHub</h2>
              <p className="text-[11px] text-[#8b949e]">
                {repos.length} repositorios encontrados (públicos y privados)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#30363d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[#30363d] bg-[#161b22] flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-[#8b949e] shrink-0" />
          <input
            type="text"
            placeholder="Filtrar por nombre de repositorio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-none flex-1 font-mono"
          />
        </div>

        {/* Repositories List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#21262d] p-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#8b949e] animate-pulse">
              Cargando tus repositorios desde la API de GitHub...
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8b949e]">
              No se encontraron repositorios coincidentes.
            </div>
          ) : (
            filteredRepos.map((repo) => {
              const updatedStr = new Date(repo.updated_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={repo.id}
                  className="p-3 hover:bg-[#0d1117]/60 rounded-lg transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white hover:text-blue-400 cursor-pointer truncate font-mono">
                        {repo.name}
                      </span>

                      {repo.private ? (
                        <Badge
                          label="Privado"
                          variant="yellow"
                          icon={<Lock className="w-3 h-3 text-amber-400" />}
                        />
                      ) : (
                        <Badge
                          label="Público"
                          variant="blue"
                          icon={<Globe className="w-3 h-3 text-blue-400" />}
                        />
                      )}

                      <span className="text-[11px] text-[#8b949e] flex items-center gap-1 font-mono">
                        <GitFork className="w-3 h-3" />
                        {repo.default_branch}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="text-xs text-[#8b949e] truncate">{repo.description}</p>
                    )}

                    <p className="text-[10px] text-[#484f58]">Actualizado el {updatedStr}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyClone(repo.id, repo.clone_url)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors"
                      title="Copiar URL para clonar"
                    >
                      {copiedId === repo.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#8b949e]" />
                          <span>Copiar URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

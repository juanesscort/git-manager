import React, { useState } from "react";
import { DeviceAuthResponse, GitHubUser } from "../../../types/git";
import { Copy, Check, ExternalLink, X, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { openUrl } from "@tauri-apps/plugin-opener";

interface GitHubAuthModalProps {
  isOpen: boolean;
  deviceAuth: DeviceAuthResponse | null;
  user: GitHubUser | null;
  onClose: () => void;
}

export const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({
  isOpen,
  deviceAuth,
  user,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (deviceAuth?.user_code) {
      navigator.clipboard.writeText(deviceAuth.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenBrowser = async () => {
    if (deviceAuth?.verification_uri) {
      handleCopyCode();
      try {
        await openUrl(deviceAuth.verification_uri);
      } catch {
        window.open(deviceAuth.verification_uri, "_blank");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="font-semibold text-white text-sm">Vincular con GitHub</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#30363d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          {user ? (
            /* Success State */
            <div className="flex flex-col items-center gap-3 py-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-white">¡Conexión Exitosa!</h3>
              <p className="text-xs text-[#8b949e]">
                Iniciaste sesión como <span className="text-white font-medium">@{user.login}</span>. Tus credenciales han sido guardadas de forma segura.
              </p>
            </div>
          ) : deviceAuth ? (
            /* Pending Code State */
            <div className="flex flex-col items-center w-full gap-4">
              <p className="text-xs text-[#8b949e] max-w-xs leading-relaxed">
                Ingresa el siguiente código de autorización en GitHub para vincular tu cuenta:
              </p>

              {/* Code Box */}
              <div
                onClick={handleCopyCode}
                className="w-full py-4 px-6 bg-[#0d1117] border-2 border-dashed border-[#388bfd] rounded-lg flex items-center justify-center gap-3 cursor-pointer group hover:bg-[#161b22] transition-colors"
                title="Hacer clic para copiar"
              >
                <span className="font-mono text-2xl font-bold tracking-widest text-[#58a6ff]">
                  {deviceAuth.user_code}
                </span>
                <button className="text-[#8b949e] group-hover:text-white transition-colors">
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {copied && (
                <span className="text-[11px] text-emerald-400 font-medium">
                  ¡Código copiado al portapapeles!
                </span>
              )}

              <Button
                variant="primary"
                onClick={handleOpenBrowser}
                icon={<ExternalLink className="w-4 h-4" />}
                className="w-full mt-2"
              >
                Abrir GitHub en Navegador
              </Button>

              {/* Live Polling Indicator */}
              <div className="flex items-center gap-2 text-xs text-[#8b949e] mt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Esperando confirmación en el navegador...</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-xs text-[#8b949e]">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mr-2" />
              <span>Solicitando código a GitHub...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

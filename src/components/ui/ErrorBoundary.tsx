import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="w-full max-w-md p-6 bg-[#161b22] border border-rose-500/40 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Se produjo un error inesperado</h1>
              <p className="text-xs text-[#8b949e] mt-1">
                La aplicación detectó una excepción y evitó un fallo del sistema.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-left text-rose-300 font-mono text-[11px] overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3 py-1.5 rounded-lg border border-[#30363d] hover:bg-[#21262d] text-xs text-[#c9d1d9] font-medium transition-colors cursor-pointer"
              >
                Ignorar y Continuar
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recargar Aplicación</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

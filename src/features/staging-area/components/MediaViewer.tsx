import React, { useState, useEffect } from "react";
import { FileMediaPreview } from "../../../types/git";
import {
  ZoomIn,
  ZoomOut,
  Columns,
  Layers,
  Play,
  Pause,
  Code,
  Volume2,
} from "lucide-react";

interface MediaViewerProps {
  media: FileMediaPreview;
  onViewTextDiff?: () => void;
  hasTextDiff?: boolean;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  media,
  onViewTextDiff,
  hasTextDiff = false,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"current" | "side-by-side" | "onion" | "old">("current");
  const [onionOpacity, setOnionOpacity] = useState<number>(0.5);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [oldDimensions, setOldDimensions] = useState<{ width: number; height: number } | null>(null);

  // Lottie animation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [lottieData, setLottieData] = useState<any | null>(null);

  const hasOldVersion = Boolean(media.old_data_base64);

  // Format bytes to KB / MB
  const formatBytes = (bytes?: number | null) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Inspect image dimensions on load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const handleOldImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setOldDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // Parse Lottie json if applicable
  useEffect(() => {
    if (media.is_lottie && media.data_base64) {
      try {
        const decoded = atob(media.data_base64);
        const parsed = JSON.parse(decoded);
        setLottieData(parsed);
      } catch {
        setLottieData(null);
      }
    }
  }, [media]);

  const currentDataUri = `data:${media.mime_type};base64,${media.data_base64}`;
  const oldDataUri = media.old_data_base64
    ? `data:${media.mime_type};base64,${media.old_data_base64}`
    : null;

  const checkerboardStyle: React.CSSProperties = {
    backgroundImage: `
      linear-gradient(45deg, #1c2128 25%, transparent 25%),
      linear-gradient(-45deg, #1c2128 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #1c2128 75%),
      linear-gradient(-45deg, transparent 75%, #1c2128 75%)
    `,
    backgroundSize: "24px 24px",
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
    backgroundColor: "#0d1117",
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden select-none">
      {/* Media Toolbar */}
      <div className="h-10 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0 text-xs">
        {/* Left: Metadata */}
        <div className="flex items-center gap-3 text-[#8b949e]">
          <span className="font-mono text-white font-medium truncate max-w-xs">{media.path}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#c9d1d9] font-mono">
            {media.mime_type}
          </span>
          {dimensions && (
            <span className="text-[11px] font-mono text-[#c9d1d9]">
              {dimensions.width} × {dimensions.height} px
            </span>
          )}
          <span className="text-[11px] font-mono text-emerald-400">
            {formatBytes(media.size_bytes)}
          </span>
          {hasOldVersion && media.old_size_bytes && (
            <span className="text-[10px] text-[#8b949e] font-mono">
              (anterior: {formatBytes(media.old_size_bytes)})
            </span>
          )}
        </div>

        {/* Center: Comparison Mode toggles (if modified) */}
        {hasOldVersion && media.is_image && (
          <div className="flex items-center gap-1 bg-[#21262d] p-0.5 rounded border border-[#30363d]">
            <button
              onClick={() => setViewMode("current")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                viewMode === "current" ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"
              }`}
              title="Ver versión modificada"
            >
              Nuevo
            </button>
            <button
              onClick={() => setViewMode("side-by-side")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === "side-by-side"
                  ? "bg-[#1f6feb] text-white"
                  : "text-[#8b949e] hover:text-white"
              }`}
              title="Comparación lado a lado (2-Up)"
            >
              <Columns className="w-3 h-3" />
              <span>2-Up</span>
            </button>
            <button
              onClick={() => setViewMode("onion")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === "onion" ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"
              }`}
              title="Superposición tipo piel de cebolla"
            >
              <Layers className="w-3 h-3" />
              <span>Cebolla</span>
            </button>
            <button
              onClick={() => setViewMode("old")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                viewMode === "old" ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"
              }`}
              title="Ver versión original antes del cambio"
            >
              Original
            </button>
          </div>
        )}

        {/* Right: Zoom & SVG Source controls */}
        <div className="flex items-center gap-1.5">
          {media.is_svg && hasTextDiff && onViewTextDiff && (
            <button
              onClick={onViewTextDiff}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] transition-colors text-[11px]"
              title="Ver diff del código fuente SVG"
            >
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver Código SVG</span>
            </button>
          )}

          {media.is_image && (
            <div className="flex items-center gap-1 text-[#8b949e] bg-[#21262d]/70 px-1 py-0.5 rounded border border-[#30363d]">
              <button
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                className="p-1 hover:text-white rounded"
                title="Alejar"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] w-10 text-center text-white">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="p-1 hover:text-white rounded"
                title="Acercar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="px-1.5 py-0.5 text-[10px] hover:text-white hover:bg-[#30363d] rounded"
                title="Restablecer tamaño original (100%)"
              >
                100%
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Onion skin opacity slider bar */}
      {viewMode === "onion" && hasOldVersion && (
        <div className="h-8 px-4 bg-[#161b22]/90 border-b border-[#30363d] flex items-center justify-center gap-3 shrink-0 text-xs">
          <span className="text-[#8b949e] text-[11px]">Original</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={onionOpacity}
            onChange={(e) => setOnionOpacity(parseFloat(e.target.value))}
            className="w-56 accent-blue-500 cursor-pointer"
          />
          <span className="text-[#8b949e] text-[11px]">Nuevo ({Math.round(onionOpacity * 100)}%)</span>
        </div>
      )}

      {/* Viewport Canvas with Checkerboard Background */}
      <div
        style={checkerboardStyle}
        className="flex-1 overflow-auto flex items-center justify-center p-6 relative"
      >
        {/* Case 1: Lottie Animation File */}
        {media.is_lottie ? (
          <div className="flex flex-col items-center gap-4 bg-[#161b22]/90 p-6 rounded-xl border border-[#30363d] shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between w-full border-b border-[#30363d] pb-2 text-xs">
              <span className="font-semibold text-white">Animación Lottie</span>
              {lottieData && (
                <span className="text-[#8b949e] font-mono text-[11px]">
                  v{lottieData.v} • {lottieData.fr} FPS • {lottieData.op - lottieData.ip} frames
                </span>
              )}
            </div>

            {/* Lottie SVG / Frame preview */}
            <div className="w-48 h-48 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center p-4">
              <div className="text-center">
                <Play className="w-12 h-12 text-blue-400 mx-auto animate-pulse mb-2" />
                <p className="text-xs text-[#c9d1d9] font-mono truncate">{media.path}</p>
                <p className="text-[10px] text-[#8b949e] mt-1">
                  {lottieData?.layers?.length || 0} capas de vectores
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full justify-center">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] flex items-center gap-1.5 text-xs transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pausar" : "Reproducir"}</span>
              </button>
            </div>
          </div>
        ) : media.mime_type.startsWith("video/") ? (
          /* Case 2: Video Media */
          <div className="max-w-3xl max-h-[80%] flex flex-col items-center bg-[#161b22] p-2 rounded-lg border border-[#30363d] shadow-2xl">
            <video src={currentDataUri} controls className="max-h-[70vh] rounded" />
          </div>
        ) : media.mime_type.startsWith("audio/") ? (
          /* Case 3: Audio Media */
          <div className="flex flex-col items-center gap-3 bg-[#161b22] p-6 rounded-xl border border-[#30363d] shadow-2xl max-w-md w-full">
            <Volume2 className="w-10 h-10 text-emerald-400" />
            <span className="font-mono text-xs text-white">{media.path}</span>
            <audio src={currentDataUri} controls className="w-full mt-2" />
          </div>
        ) : viewMode === "side-by-side" && oldDataUri ? (
          /* Case 4: Side-by-Side (2-Up) Image Comparison */
          <div className="flex items-stretch gap-6 max-w-full">
            {/* Old Image */}
            <div className="flex flex-col items-center bg-[#161b22]/90 p-3 rounded-lg border border-[#30363d] shadow-xl">
              <div className="flex items-center justify-between w-full mb-2 text-xs">
                <span className="text-rose-400 font-semibold font-mono">Original (Anterior)</span>
                {oldDimensions && (
                  <span className="text-[#8b949e] font-mono text-[10px]">
                    {oldDimensions.width} × {oldDimensions.height} px
                  </span>
                )}
              </div>
              <div className="p-2 rounded bg-black/20 flex items-center justify-center min-w-[140px] min-h-[140px]">
                <img
                  src={oldDataUri}
                  alt="Original"
                  onLoad={handleOldImageLoad}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                  className="max-h-[60vh] max-w-[40vw] object-contain transition-transform"
                />
              </div>
            </div>

            {/* New Image */}
            <div className="flex flex-col items-center bg-[#161b22]/90 p-3 rounded-lg border border-emerald-500/30 shadow-xl">
              <div className="flex items-center justify-between w-full mb-2 text-xs">
                <span className="text-emerald-400 font-semibold font-mono">Modificado (Nuevo)</span>
                {dimensions && (
                  <span className="text-[#8b949e] font-mono text-[10px]">
                    {dimensions.width} × {dimensions.height} px
                  </span>
                )}
              </div>
              <div className="p-2 rounded bg-black/20 flex items-center justify-center min-w-[140px] min-h-[140px]">
                <img
                  src={currentDataUri}
                  alt="Nuevo"
                  onLoad={handleImageLoad}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                  className="max-h-[60vh] max-w-[40vw] object-contain transition-transform"
                />
              </div>
            </div>
          </div>
        ) : viewMode === "onion" && oldDataUri ? (
          /* Case 5: Onion Skin Layered Overlay */
          <div className="relative flex items-center justify-center p-4 bg-[#161b22]/60 rounded-lg border border-[#30363d] shadow-xl">
            <img
              src={oldDataUri}
              alt="Original"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              className="max-h-[70vh] max-w-[80vw] object-contain"
            />
            <img
              src={currentDataUri}
              alt="Nuevo"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center",
                opacity: onionOpacity,
              }}
              className="absolute max-h-[70vh] max-w-[80vw] object-contain transition-opacity"
            />
          </div>
        ) : viewMode === "old" && oldDataUri ? (
          /* Case 6: Old image only */
          <div className="flex flex-col items-center bg-[#161b22]/80 p-3 rounded-lg border border-rose-500/30 shadow-xl">
            <span className="text-rose-400 font-mono text-xs mb-2">Versión Original (Anterior)</span>
            <img
              src={oldDataUri}
              alt="Original"
              onLoad={handleOldImageLoad}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              className="max-h-[70vh] max-w-[80vw] object-contain transition-transform"
            />
          </div>
        ) : (
          /* Case 7: Default Current Image / SVG Preview */
          <div className="flex flex-col items-center bg-[#161b22]/80 p-3 rounded-lg border border-[#30363d] shadow-xl">
            <img
              src={currentDataUri}
              alt={media.path}
              onLoad={handleImageLoad}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              className="max-h-[70vh] max-w-[80vw] object-contain transition-transform"
            />
          </div>
        )}
      </div>
    </div>
  );
};

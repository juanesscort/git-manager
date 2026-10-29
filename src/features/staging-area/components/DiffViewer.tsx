import React, { useState, useEffect } from "react";
import { DiffDelta, FileMediaPreview } from "../../../types/git";
import {
  FileText,
  X,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { MediaViewer } from "./MediaViewer";
import { invoke } from "@tauri-apps/api/core";

const MEDIA_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "bmp",
  "avif",
  "svg",
  "lottie",
  "mp4",
  "webm",
  "mp3",
  "wav",
  "pdf",
]);

interface DiffViewerProps {
  diff: DiffDelta | null;
  loading: boolean;
  onClose: () => void;
  repoPath?: string;
  commitOid?: string;
  staged?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  loading,
  onClose,
  repoPath,
  commitOid,
  staged,
}) => {
  const [mediaPreview, setMediaPreview] = useState<FileMediaPreview | null>(null);
  const [mediaLoading, setMediaLoading] = useState<boolean>(false);
  const [svgViewMode, setSvgViewMode] = useState<"visual" | "code">("visual");

  // Contingency plan for heavy files: progressive chunk rendering (1,000 lines per step)
  const CHUNK_SIZE = 1000;
  const [renderedLineCount, setRenderedLineCount] = useState<number>(CHUNK_SIZE);

  // Determine if current file is a media file
  const ext = diff?.path.split(".").pop()?.toLowerCase() || "";
  const isPotentialMedia = MEDIA_EXTENSIONS.has(ext);

  // Load media binary data when file is an image / vector / animation
  useEffect(() => {
    let isCancelled = false;

    if (diff && repoPath && isPotentialMedia) {
      setMediaLoading(true);
      invoke<FileMediaPreview>("get_file_media_cmd", {
        path: repoPath,
        relativePath: diff.path,
        commitOid: commitOid || null,
        staged: Boolean(staged),
      })
        .then((res) => {
          if (!isCancelled) {
            setMediaPreview(res);
            setMediaLoading(false);
          }
        })
        .catch((err) => {
          console.warn("No se pudo cargar vista previa multimedia:", err);
          if (!isCancelled) {
            setMediaPreview(null);
            setMediaLoading(false);
          }
        });
    } else {
      setMediaPreview(null);
      setMediaLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [diff?.path, repoPath, commitOid, staged, isPotentialMedia]);

  // Reset rendered lines when diff changes
  useEffect(() => {
    setRenderedLineCount(CHUNK_SIZE);
    setSvgViewMode("visual");
  }, [diff?.path]);

  if (loading || mediaLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117] text-[#8b949e] text-xs gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
        <span className="animate-pulse">Cargando contenido y diferencias del archivo...</span>
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

  // Render Visual Media Viewer for images, svg, lottie, gif, audio/video
  if (mediaPreview && (mediaPreview.is_image || mediaPreview.is_lottie || !mediaPreview.mime_type.startsWith("text/"))) {
    if (!mediaPreview.is_svg || svgViewMode === "visual") {
      return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <MediaViewer
            media={mediaPreview}
            hasTextDiff={Boolean(diff.patch && diff.patch.trim().length > 0)}
            onViewTextDiff={() => setSvgViewMode("code")}
          />
        </div>
      );
    }
  }

  // Code / Text Diff Viewer with Large File Protection
  const lines = diff.patch.split("\n");
  const totalLines = lines.length;
  const isHeavyFile = totalLines > CHUNK_SIZE;
  const displayedLines = isHeavyFile ? lines.slice(0, renderedLineCount) : lines;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] border-t border-[#30363d] overflow-hidden">
      {/* Diff Header */}
      <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0 select-none">
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

        <div className="flex items-center gap-2">
          {/* If it's an SVG and we are currently viewing code, allow switching back to visual */}
          {mediaPreview?.is_svg && svgViewMode === "code" && (
            <button
              onClick={() => setSvgViewMode("visual")}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-[11px] transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver Vista Gráfica</span>
            </button>
          )}

          <Button size="sm" variant="ghost" onClick={onClose} className="p-1 h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contingency Banner for Heavy Files */}
      {isHeavyFile && (
        <div className="bg-amber-950/80 border-b border-amber-600/40 text-amber-200 px-3 py-1.5 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Archivo extenso:</strong> Mostrando las primeras{" "}
              {Math.min(renderedLineCount, totalLines).toLocaleString()} de{" "}
              {totalLines.toLocaleString()} líneas para garantizar máxima fluidez a 60 FPS.
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {renderedLineCount < totalLines && (
              <button
                onClick={() => setRenderedLineCount((prev) => Math.min(prev + CHUNK_SIZE, totalLines))}
                className="px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-[11px] font-medium transition-colors"
              >
                Cargar 1,000 más
              </button>
            )}
            {renderedLineCount < totalLines && (
              <button
                onClick={() => setRenderedLineCount(totalLines)}
                className="px-2 py-0.5 rounded bg-amber-600/40 hover:bg-amber-600/60 text-amber-100 border border-amber-500/50 text-[11px] font-medium transition-colors"
              >
                Cargar todo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Diff Content */}
      <div className="flex-1 overflow-auto font-mono text-xs select-text p-2">
        {lines.length === 0 || (lines.length === 1 && lines[0] === "") ? (
          <div className="p-8 text-[#8b949e] italic text-center flex flex-col items-center justify-center">
            <FileText className="w-8 h-8 opacity-40 mb-2" />
            <span>Archivo sin cambios de texto o cambios binarios no editables.</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {displayedLines.map((line, idx) => {
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

            {/* Bottom Progressive Load Button for Heavy Files */}
            {isHeavyFile && renderedLineCount < totalLines && (
              <div className="p-4 my-3 rounded-lg border border-dashed border-[#30363d] bg-[#161b22]/70 text-center flex flex-col items-center gap-2">
                <span className="text-[#8b949e] text-xs">
                  Quedan {(totalLines - renderedLineCount).toLocaleString()} líneas por mostrar.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setRenderedLineCount((prev) => Math.min(prev + CHUNK_SIZE, totalLines))
                    }
                    className="px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-xs font-medium"
                  >
                    Cargar siguientes 1,000 líneas
                  </button>
                  <button
                    onClick={() => setRenderedLineCount(totalLines)}
                    className="px-3 py-1.5 rounded bg-amber-600/40 hover:bg-amber-600/60 text-amber-100 border border-amber-500/50 text-xs font-medium"
                  >
                    Cargar todas ({totalLines.toLocaleString()} líneas)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

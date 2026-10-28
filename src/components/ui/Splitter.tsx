import React, { useState, useEffect, useCallback } from "react";

interface SplitterProps {
  direction?: "vertical" | "horizontal";
  onDrag: (e: MouseEvent) => void;
  className?: string;
  title?: string;
}

export const Splitter: React.FC<SplitterProps> = ({
  direction = "vertical",
  onDrag,
  className = "",
  title = "Arrastra para redimensionar el panel",
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      onDrag(e);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = direction === "vertical" ? "ew-resize" : "ns-resize";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, onDrag, direction]);

  if (direction === "horizontal") {
    return (
      <div
        onMouseDown={handleMouseDown}
        title={title}
        style={{ cursor: "ns-resize" }}
        className={`h-2 w-full bg-[#30363d] hover:bg-blue-500 cursor-ns-resize transition-colors shrink-0 z-20 flex items-center justify-center group ${
          isDragging ? "bg-blue-500 shadow-md" : ""
        } ${className}`}
      >
        <div className="w-8 h-0.5 rounded bg-transparent group-hover:bg-blue-300 pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      title={title}
      style={{ cursor: "ew-resize" }}
      className={`w-2 h-full bg-[#30363d] hover:bg-blue-500 cursor-ew-resize transition-colors shrink-0 z-20 flex items-center justify-center group ${
        isDragging ? "bg-blue-500 shadow-md" : ""
      } ${className}`}
    >
      <div className="h-8 w-0.5 rounded bg-transparent group-hover:bg-blue-300 pointer-events-none" />
    </div>
  );
};

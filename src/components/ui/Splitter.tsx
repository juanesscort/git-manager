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
    document.body.style.cursor = direction === "vertical" ? "col-resize" : "row-resize";

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
        className={`h-1.5 w-full bg-[#30363d] hover:bg-blue-500 cursor-row-resize transition-colors shrink-0 z-20 flex items-center justify-center group ${
          isDragging ? "bg-blue-500 shadow-md" : ""
        } ${className}`}
      >
        <div className="w-8 h-0.5 rounded bg-transparent group-hover:bg-blue-300" />
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      title={title}
      className={`w-1.5 h-full bg-[#30363d] hover:bg-blue-500 cursor-col-resize transition-colors shrink-0 z-20 flex items-center justify-center group ${
        isDragging ? "bg-blue-500 shadow-md" : ""
      } ${className}`}
    >
      <div className="h-8 w-0.5 rounded bg-transparent group-hover:bg-blue-300" />
    </div>
  );
};

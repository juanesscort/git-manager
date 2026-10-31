import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface AccordionSectionProps {
  title: string;
  count?: number;
  badgeClassName?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  count,
  badgeClassName,
  icon,
  action,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col border-b border-[#30363d]/50 pb-2">
      <div className="flex items-center justify-between py-1 px-1 group select-none">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-left flex-1 min-w-0 cursor-pointer text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#484f58] group-hover:text-[#8b949e] shrink-0 transition-transform" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#484f58] group-hover:text-[#8b949e] shrink-0 transition-transform" />
          )}

          {icon}

          <span className="text-[10px] font-bold uppercase tracking-wider truncate flex-1">
            {title}
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {action && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {action}
            </div>
          )}

          {typeof count === "number" && (
            <span
              className={
                badgeClassName ||
                "min-w-5 h-5 px-1.5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center bg-[#21262d] border border-[#30363d] text-[#c9d1d9] shadow-xs"
              }
            >
              {count}
            </span>
          )}
        </div>
      </div>

      {isOpen && <div className="mt-1 pl-1 flex flex-col gap-0.5">{children}</div>}
    </div>
  );
};

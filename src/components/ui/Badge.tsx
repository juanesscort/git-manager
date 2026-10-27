import React from "react";

export interface BadgeProps {
  label: string;
  variant?: "blue" | "green" | "purple" | "yellow" | "gray";
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = "blue", icon }) => {
  const variantStyles = {
    blue: "bg-blue-900/40 text-blue-300 border-blue-800",
    green: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
    purple: "bg-purple-900/40 text-purple-300 border-purple-800",
    yellow: "bg-amber-900/40 text-amber-300 border-amber-800",
    gray: "bg-zinc-800 text-zinc-300 border-zinc-700",
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${variantStyles}`}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
};

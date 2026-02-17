"use client";

interface SpamRiskBadgeProps {
  level: "low" | "medium" | "high";
}

export default function SpamRiskBadge({ level }: SpamRiskBadgeProps) {
  const config = {
    low: {
      bg: "bg-green-100 text-green-800 border-green-200",
      label: "Low Risk",
      icon: "\u2705",
    },
    medium: {
      bg: "bg-yellow-100 text-yellow-800 border-yellow-200",
      label: "Med Risk",
      icon: "\u26A0\uFE0F",
    },
    high: {
      bg: "bg-red-100 text-red-800 border-red-200",
      label: "High Risk",
      icon: "\uD83D\uDED1",
    },
  };

  const { bg, label, icon } = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${bg}`}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
}

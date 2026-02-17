"use client";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function ScoreBadge({
  score,
  label,
  size = "md",
}: ScoreBadgeProps) {
  const getColor = () => {
    if (score >= 8.5) return "bg-emerald-500 text-white";
    if (score >= 7.5) return "bg-green-500 text-white";
    if (score >= 7) return "bg-yellow-500 text-white";
    return "bg-orange-500 text-white";
  };

  const getSize = () => {
    switch (size) {
      case "sm":
        return "text-xs px-1.5 py-0.5";
      case "lg":
        return "text-lg px-3 py-1.5 font-bold";
      default:
        return "text-sm px-2 py-1 font-semibold";
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full ${getColor()} ${getSize()}`}
    >
      {label && <span className="mr-1 opacity-80">{label}</span>}
      {score.toFixed(1)}
    </span>
  );
}

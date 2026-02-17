"use client";

interface StatsBarProps {
  totalFetched: number;
  totalFiltered: number;
  totalScored: number;
}

export default function StatsBar({
  totalFetched,
  totalFiltered,
  totalScored,
}: StatsBarProps) {
  const stats = [
    {
      label: "Posts Scanned",
      value: totalFetched,
      icon: "📊",
      color: "text-blue-400",
    },
    {
      label: "Passed Filters",
      value: totalFiltered,
      icon: "🔍",
      color: "text-yellow-400",
    },
    {
      label: "Opportunities",
      value: totalScored,
      icon: "🎯",
      color: "text-green-400",
    },
  ];

  return (
    <div className="bg-slate-800/50 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center gap-8 sm:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <span className="text-lg">{stat.icon}</span>
              <div>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

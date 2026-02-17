"use client";

interface EmptyStateProps {
  hasData: boolean;
}

export default function EmptyState({ hasData }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="text-6xl mb-4">{hasData ? "🔍" : "📡"}</div>
      <h2 className="text-xl font-semibold text-slate-300 mb-2">
        {hasData
          ? "No posts match your filters"
          : "No scan results yet"}
      </h2>
      <p className="text-sm text-slate-400 text-center max-w-md">
        {hasData
          ? "Try adjusting your filters to see more results. You can change the subreddit, pain type, or minimum score."
          : "Click \"Rescan Now\" to run the first scan, or wait for the daily cron job to trigger at 8AM UTC."}
      </p>
    </div>
  );
}

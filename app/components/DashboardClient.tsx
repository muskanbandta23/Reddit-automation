"use client";

import { useState, useMemo } from "react";
import { ScoredPost, DailyScanResult } from "@/app/lib/types";
import Header from "./Header";
import StatsBar from "./StatsBar";
import FilterBar from "./FilterBar";
import PostCard from "./PostCard";
import EmptyState from "./EmptyState";

interface DashboardClientProps {
  initialData: DailyScanResult | null;
}

export default function DashboardClient({
  initialData,
}: DashboardClientProps) {
  const [data, setData] = useState<DailyScanResult | null>(initialData);
  const [selectedSubreddit, setSelectedSubreddit] = useState("all");
  const [selectedPainType, setSelectedPainType] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedSpamRisk, setSelectedSpamRisk] = useState("all");
  const [minScore, setMinScore] = useState(7);

  // Extract unique subreddits and pain types for filter dropdowns
  const subreddits = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.posts.map((p) => p.subreddit))].sort();
  }, [data]);

  const painTypes = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.posts.map((p) => p.painType))].sort();
  }, [data]);

  // Apply filters
  const filteredPosts = useMemo(() => {
    if (!data) return [];

    return data.posts.filter((post: ScoredPost) => {
      if (
        selectedSubreddit !== "all" &&
        post.subreddit !== selectedSubreddit
      )
        return false;
      if (
        selectedPainType !== "all" &&
        post.painType !== selectedPainType
      )
        return false;
      if (
        selectedProduct !== "all" &&
        post.relevantProduct !== selectedProduct
      )
        return false;
      if (
        selectedSpamRisk !== "all" &&
        post.spamRiskLevel !== selectedSpamRisk
      )
        return false;
      if (post.overallScore < minScore) return false;
      return true;
    });
  }, [
    data,
    selectedSubreddit,
    selectedPainType,
    selectedProduct,
    selectedSpamRisk,
    minScore,
  ]);

  const handleRescan = async () => {
    const secret = prompt("Enter your CRON_SECRET to trigger a rescan:");
    if (!secret) return;

    try {
      const response = await fetch("/api/rescan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(`Rescan failed: ${err.error || "Unknown error"}`);
        return;
      }

      // Refresh data
      const postsResponse = await fetch("/api/posts");
      if (postsResponse.ok) {
        const newData = await postsResponse.json();
        setData(newData);
      }

      alert("Rescan complete! Results updated.");
    } catch (error) {
      alert(`Rescan error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header
        lastScan={data?.scanTimestamp || null}
        onRescan={handleRescan}
      />

      {data && (
        <StatsBar
          totalFetched={data.totalFetched}
          totalFiltered={data.totalPassedFilter}
          totalScored={data.totalScored}
        />
      )}

      {data && data.posts.length > 0 && (
        <FilterBar
          subreddits={subreddits}
          painTypes={painTypes}
          selectedSubreddit={selectedSubreddit}
          selectedPainType={selectedPainType}
          selectedProduct={selectedProduct}
          selectedSpamRisk={selectedSpamRisk}
          minScore={minScore}
          onSubredditChange={setSelectedSubreddit}
          onPainTypeChange={setSelectedPainType}
          onProductChange={setSelectedProduct}
          onSpamRiskChange={setSelectedSpamRisk}
          onMinScoreChange={setMinScore}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPosts.map((post: ScoredPost, index: number) => (
              <PostCard key={post.id} post={post} rank={index + 1} />
            ))}
          </div>
        ) : (
          <EmptyState hasData={!!data && data.posts.length > 0} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-4 text-center">
        <p className="text-xs text-slate-500">
          Reddit Scout by ZopDev &mdash; Powered by OpenAI &amp; Vercel
        </p>
      </footer>
    </div>
  );
}

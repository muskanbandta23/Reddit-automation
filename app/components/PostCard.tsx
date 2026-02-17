"use client";

import { useState } from "react";
import { ScoredPost } from "@/app/lib/types";
import ScoreBadge from "./ScoreBadge";
import SpamRiskBadge from "./SpamRiskBadge";

interface PostCardProps {
  post: ScoredPost;
  rank: number;
}

const SUBREDDIT_COLORS: Record<string, string> = {
  aws: "bg-orange-600",
  devops: "bg-blue-600",
  cloudcomputing: "bg-cyan-600",
  sysadmin: "bg-red-600",
  kubernetes: "bg-indigo-600",
  startups: "bg-emerald-600",
  SaaS: "bg-purple-600",
  FinOps: "bg-teal-600",
  cscareerquestions: "bg-pink-600",
  ITManagers: "bg-amber-600",
  Entrepreneur: "bg-lime-600",
  selfhosted: "bg-slate-600",
};

export default function PostCard({ post, rank }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  const subredditColor =
    SUBREDDIT_COLORS[post.subreddit] || "bg-slate-600";

  const formatAge = (hours: number) => {
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const productBadge = (product: string) => {
    switch (product) {
      case "ZopNight":
        return "bg-violet-100 text-violet-800 border-violet-200";
      case "ZopDay":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "Both":
        return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden">
      {/* Top bar with rank and meta */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">
            #{rank}
          </span>
          <span
            className={`${subredditColor} text-white text-xs font-medium px-2 py-0.5 rounded-full`}
          >
            r/{post.subreddit}
          </span>
          <span className="text-xs text-slate-400">
            {formatAge(post.ageHours)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SpamRiskBadge level={post.spamRiskLevel} />
          <ScoreBadge score={post.overallScore} size="md" />
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-2">
        <a
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-semibold text-slate-900 hover:text-orange-600 transition-colors line-clamp-2"
        >
          {post.title}
        </a>
      </div>

      {/* Metrics row */}
      <div className="px-4 pb-2 flex items-center gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
          {post.upvotes}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {post.commentsCount}
        </span>
        <span
          className={`inline-flex items-center border rounded-full px-2 py-0.5 text-xs font-medium ${productBadge(post.relevantProduct)}`}
        >
          {post.relevantProduct}
        </span>
      </div>

      {/* Pain type + keywords */}
      <div className="px-4 pb-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 text-xs font-medium">
          {post.painType}
        </span>
        {post.matchedKeywords.slice(0, 4).map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 text-xs"
          >
            {kw}
          </span>
        ))}
        {post.matchedKeywords.length > 4 && (
          <span className="text-xs text-slate-400">
            +{post.matchedKeywords.length - 4} more
          </span>
        )}
      </div>

      {/* Why good opportunity */}
      <div className="px-4 pb-2">
        <p className="text-sm text-slate-600">{post.whyGoodOpportunity}</p>
      </div>

      {/* Score breakdown + suggested angle (expandable) */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          {expanded ? "Hide details" : "Show angle & scores"}
        </button>

        {expanded && (
          <div className="mt-2 space-y-2">
            {/* Score breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between bg-slate-50 rounded px-2 py-1">
                <span className="text-slate-500">Cost Pain</span>
                <span className="font-medium">
                  {post.scores.costPainIntensity}/10
                </span>
              </div>
              <div className="flex justify-between bg-slate-50 rounded px-2 py-1">
                <span className="text-slate-500">Relevance</span>
                <span className="font-medium">
                  {post.scores.relevanceToAutomation}/10
                </span>
              </div>
              <div className="flex justify-between bg-slate-50 rounded px-2 py-1">
                <span className="text-slate-500">Opportunity</span>
                <span className="font-medium">
                  {post.scores.commentOpportunityStrength}/10
                </span>
              </div>
              <div className="flex justify-between bg-slate-50 rounded px-2 py-1">
                <span className="text-slate-500">Promo Risk</span>
                <span className="font-medium">
                  {post.scores.riskOfSoundingPromotional}/10
                </span>
              </div>
            </div>

            {/* Suggested angle */}
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
              <p className="text-xs font-medium text-orange-800 mb-1">
                Suggested Comment Angle:
              </p>
              <p className="text-sm text-orange-700">
                {post.suggestedCommentAngle}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
        <span className="text-xs text-slate-400">
          by u/{post.author}
        </span>
        <a
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-orange-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors"
        >
          View on Reddit
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}

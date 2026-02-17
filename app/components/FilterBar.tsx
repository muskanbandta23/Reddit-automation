"use client";

interface FilterBarProps {
  subreddits: string[];
  painTypes: string[];
  selectedSubreddit: string;
  selectedPainType: string;
  selectedProduct: string;
  selectedSpamRisk: string;
  minScore: number;
  onSubredditChange: (value: string) => void;
  onPainTypeChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onSpamRiskChange: (value: string) => void;
  onMinScoreChange: (value: number) => void;
}

export default function FilterBar({
  subreddits,
  painTypes,
  selectedSubreddit,
  selectedPainType,
  selectedProduct,
  selectedSpamRisk,
  minScore,
  onSubredditChange,
  onPainTypeChange,
  onProductChange,
  onSpamRiskChange,
  onMinScoreChange,
}: FilterBarProps) {
  const selectStyle =
    "bg-slate-700 text-slate-200 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent";

  return (
    <div className="bg-slate-800/30 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Filters:
          </span>

          {/* Subreddit filter */}
          <select
            value={selectedSubreddit}
            onChange={(e) => onSubredditChange(e.target.value)}
            className={selectStyle}
          >
            <option value="all">All Subreddits</option>
            {subreddits.map((sub) => (
              <option key={sub} value={sub}>
                r/{sub}
              </option>
            ))}
          </select>

          {/* Pain type filter */}
          <select
            value={selectedPainType}
            onChange={(e) => onPainTypeChange(e.target.value)}
            className={selectStyle}
          >
            <option value="all">All Pain Types</option>
            {painTypes.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>

          {/* Product filter */}
          <select
            value={selectedProduct}
            onChange={(e) => onProductChange(e.target.value)}
            className={selectStyle}
          >
            <option value="all">All Products</option>
            <option value="ZopNight">ZopNight</option>
            <option value="ZopDay">ZopDay</option>
            <option value="Both">Both</option>
          </select>

          {/* Spam risk filter */}
          <select
            value={selectedSpamRisk}
            onChange={(e) => onSpamRiskChange(e.target.value)}
            className={selectStyle}
          >
            <option value="all">All Spam Risk</option>
            <option value="low">Low Risk Only</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>

          {/* Min score slider */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">
              Min Score: {minScore}
            </label>
            <input
              type="range"
              min={5}
              max={10}
              step={0.5}
              value={minScore}
              onChange={(e) => onMinScoreChange(parseFloat(e.target.value))}
              className="w-24 accent-orange-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

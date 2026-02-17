"use client";

import { useState } from "react";

interface HeaderProps {
  lastScan: number | null;
  onRescan: () => Promise<void>;
}

export default function Header({ lastScan, onRescan }: HeaderProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleRescan = async () => {
    setIsScanning(true);
    try {
      await onRescan();
    } finally {
      setIsScanning(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-xl">
              <span role="img" aria-label="radar">
                📡
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Reddit Scout</h1>
              <p className="text-xs text-slate-400">
                ZopNight & ZopDay Engagement Opportunities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastScan && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400">Last scan</p>
                <p className="text-sm text-slate-300">
                  {formatTime(lastScan)}
                </p>
              </div>
            )}
            <button
              onClick={handleRescan}
              disabled={isScanning}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isScanning
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                  : "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700"
              }`}
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Scanning...
                </span>
              ) : (
                "Rescan Now"
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

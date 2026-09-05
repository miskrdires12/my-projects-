"use client";

import { useState } from "react";
import {
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ArrowDownRight,
  Check,
  X,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { toTiny } from "@/lib/tiny-text";

// Inline brand SVGs for pixel-perfect logos
function SpotifyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.436-5.308-1.76-8.792-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.503 9.72 1.113.295.18.388.563.208.857zm1.226-2.723c-.226.367-.707.483-1.074.257-2.69-1.653-6.79-2.133-9.972-1.168-.413.125-.852-.11-.977-.523-.125-.413.11-.852.523-.977 3.633-1.103 8.147-.568 11.243 1.337.367.226.483.707.257 1.074zm.106-2.835C14.692 8.95 9.227 8.77 6.05 9.734c-.494.15-1.02-.128-1.17-.622-.15-.494.128-1.02.622-1.17 3.649-1.108 9.69-.904 13.43 1.315.443.263.587.84.324 1.283-.262.443-.84.587-1.283.324z" />
    </svg>
  );
}

function AmazonIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.62 16.5c-2.73 1.95-6.68 2.97-10.08 1.4-.48-.22-.09-.78.33-.94 3.09-1.14 6.78-.96 9.38-2.39.38-.22.75.46.37.93zm1.18-.87c-.35-.45-2.31-.22-3.19-.11-.27.03-.31-.21-.07-.38 1.55-1.09 4.1-.78 4.41-.39.31.4-0.17 3.02-1.63 4.21-.23.18-.45.09-.35-.15.33-.8 1.18-2.73.83-3.18zM15.48 4.2c-1.42.27-3.41 1.48-3.41 3.42 0 1.25.77 2.07 1.83 2.07 1.45 0 2.21-1.08 2.21-2.42V5.13c-.2-.04-.42-.07-.63-.93zm2.59 7.72c-.17.15-.4.18-.62.06-.82-.47-.97-.93-.97-1.87v-4.8c0-2.32-1.42-3.66-3.8-3.66-2.07 0-3.62.99-4.18 2.65-.11.31.06.49.33.52l1.64.18c.24.03.41-.12.51-.35.32-.77.94-1.26 1.9-1.26 1.12 0 1.76.62 1.76 1.7v.45c-2.9.15-5.32 1.05-5.32 3.63 0 1.89 1.25 3.02 3.07 3.02 1.63 0 2.65-.63 3.32-1.7.25.77.82 1.25 1.76 1.25.72 0 1.34-.3 1.76-.71.18-.18.15-.36-.01-.52l-.95-.97z" />
    </svg>
  );
}

function MicrosoftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 2h9.5v9.5H2V2zm10.5 0H22v9.5h-9.5V2zM2 12.5h9.5V22H2v-9.5zm10.5 0H22V22h-9.5v-9.5z" />
    </svg>
  );
}

function NvidiaIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.94 8.75c-.32 0-.6.18-.75.46-.22.42-.09.93.31 1.21 1.48 1.02 2.76 2.45 2.76 4.67 0 3.02-2.38 5.48-5.34 5.48-1.58 0-3.03-.71-4.04-1.84l-.88 1.43c1.29 1.47 3.19 2.41 5.32 2.41 4.54 0 8.23-3.69 8.23-8.24 0-2.88-1.46-5.42-3.69-6.9-.53-.35-1.25-.44-1.92-.28zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-2.12.83-4.04 2.19-5.47l.95 1.55C6.18 9.17 5.6 10.52 5.6 12c0 3.53 2.87 6.4 6.4 6.4 1.84 0 3.49-.78 4.67-2.02l.96 1.55C16.14 19.23 14.19 20 12 20z" />
    </svg>
  );
}

function AppleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.68-.9 2.7.99.08 2.01-.5 2.58-1.19z" />
    </svg>
  );
}

export function HeliosPortfolioView() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [watchlistTab, setWatchlistTab] = useState<"MOST_VIEWED" | "GAIN" | "LOSE">("MOST_VIEWED");
  const [activeTimeframe, setActiveTimeframe] = useState<string>("1Y");
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number>(5); // June (index 5)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("6M");

  // Spline data points for 12 months
  const chartPoints = [
    { month: "Jan", val: 195, dollar: "$ 19,500", delta: "+8%" },
    { month: "Feb", val: 165, dollar: "$ 16,500", delta: "-12%" },
    { month: "Mar", val: 140, dollar: "$ 14,000", delta: "+5%" },
    { month: "Apr", val: 135, dollar: "$ 13,500", delta: "+3%" },
    { month: "May", val: 155, dollar: "$ 15,500", delta: "+15%" },
    { month: "Jun", val: 165, dollar: "$ 16,500", delta: "+25%" },
    { month: "Jul", val: 180, dollar: "$ 18,000", delta: "+10%" },
    { month: "Aug", val: 150, dollar: "$ 15,000", delta: "-8%" },
    { month: "Sep", val: 125, dollar: "$ 12,500", delta: "-6%" },
    { month: "Oct", val: 135, dollar: "$ 13,500", delta: "+7%" },
    { month: "Nov", val: 115, dollar: "$ 11,500", delta: "+4%" },
    { month: "Dec", val: 128, dollar: "$ 12,800", delta: "+18%" },
  ];

  // Watchlist datasets
  const watchlistData = {
    MOST_VIEWED: [
      { name: "Spotify", ticker: "NYSE: SPOT", price: "$11,770.3", change: "+16.31%", icon: SpotifyIcon, isGain: true },
      { name: "Amazon", ticker: "NYSE: AMZN", price: "$10,280.8", change: "+8.11%", icon: AmazonIcon, isGain: true },
      { name: "MSFT", ticker: "NYSE: MSFT", price: "$8,510.2", change: "+4.89%", icon: MicrosoftIcon, isGain: true },
      { name: "NVDA", ticker: "NYSE: NVDA", price: "$2,110.2", change: "+2.12%", icon: NvidiaIcon, isGain: true },
    ],
    GAIN: [
      { name: "NVDA", ticker: "NYSE: NVDA", price: "$2,110.2", change: "+24.80%", icon: NvidiaIcon, isGain: true },
      { name: "Spotify", ticker: "NYSE: SPOT", price: "$11,770.3", change: "+16.31%", icon: SpotifyIcon, isGain: true },
      { name: "Amazon", ticker: "NYSE: AMZN", price: "$10,280.8", change: "+8.11%", icon: AmazonIcon, isGain: true },
      { name: "Apple", ticker: "NASDAQ: AAPL", price: "$1,721.3", change: "+7.45%", icon: AppleIcon, isGain: true },
    ],
    LOSE: [
      { name: "Tesla", ticker: "NASDAQ: TSLA", price: "$214.50", change: "-4.21%", icon: SpotifyIcon, isGain: false },
      { name: "Google", ticker: "NASDAQ: GOOGL", price: "$168.10", change: "-2.15%", icon: MicrosoftIcon, isGain: false },
      { name: "Meta", ticker: "NASDAQ: META", price: "$482.30", change: "-1.80%", icon: AmazonIcon, isGain: false },
      { name: "Netflix", ticker: "NASDAQ: NFLX", price: "$612.00", change: "-0.95%", icon: NvidiaIcon, isGain: false },
    ],
  };

  // Portfolio mini cards 2x2
  const portfolioAssets = [
    { ticker: "AAPL", price: "$ 1,721.3", delta: "+12.31 (0.7%)", units: 104, icon: AppleIcon },
    { ticker: "AMZN", price: "$ 1,721.3", delta: "+12.31 (0.7%)", units: 12, icon: AmazonIcon },
    { ticker: "MSFT", price: "$ 1,721.3", delta: "+12.31 (0.7%)", units: 41, icon: MicrosoftIcon },
    { ticker: "NVDA", price: "$ 1,721.3", delta: "+12.31 (0.7%)", units: 16, icon: NvidiaIcon },
  ];

  // SVG Chart Geometry
  const svgWidth = 900;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 30;

  const pointsCount = chartPoints.length;
  const stepX = (svgWidth - paddingX * 2) / (pointsCount - 1);

  const coords = chartPoints.map((pt, i) => {
    const x = paddingX + i * stepX;
    const normalized = (pt.val - 10) / (200 - 10);
    const y = svgHeight - paddingY - normalized * (svgHeight - paddingY * 2);
    return { x, y, ...pt };
  });

  function getSplinePath(data: typeof coords) {
    if (data.length === 0) return "";
    let d = `M ${data[0].x},${data[0].y}`;
    for (let i = 0; i < data.length - 1; i++) {
      const p0 = data[i === 0 ? 0 : i - 1];
      const p1 = data[i];
      const p2 = data[i + 1];
      const p3 = data[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  const pathD = getSplinePath(coords);
  const areaD = `${pathD} L ${coords[coords.length - 1].x},${svgHeight} L ${coords[0].x},${svgHeight} Z`;
  const selectedPoint = coords[hoveredMonthIndex];

  // Monochrome colors depending on Day/Night mode
  const splineStroke = isDark ? "#ffffff" : "#09090b";
  const gridStroke = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)";
  const labelColor = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.4)";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Row: 3 Columns matching the screenshot in Pure Black & White */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Column 1 (Left): Total Holding + AI Insights Card (4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-5">
          {/* Total Holding Card */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-xl flex flex-col justify-between group hover:border-black/20 dark:hover:border-white/20 transition-all min-h-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">Total Holding</span>
              <div className="relative">
                <button
                  onClick={() => setTimeRange(timeRange === "6M" ? "1Y" : "6M")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/[0.05] hover:bg-neutral-200 dark:hover:bg-white/[0.1] border border-neutral-200 dark:border-white/10 text-xs text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                >
                  <span className="font-mono font-medium">{timeRange}</span>
                  <ChevronDown className="h-3 w-3 text-neutral-500" />
                </button>
              </div>
            </div>

            <div className="mt-5 mb-1">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white font-sans">
                $ 12,304.11
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
                <span>Holdings across 4 managed portfolios</span>
              </div>
            </div>
          </div>

          {/* Decisions Powered by Data Card with Clean Monochrome Spotlight Dome */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] p-6 shadow-sm dark:shadow-xl flex flex-col justify-between flex-1 group hover:border-black/20 dark:hover:border-white/20 transition-all min-h-[180px]">
            <div>
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white tracking-wide">
                Decisions Powered by Data
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed max-w-[280px]">
                Move beyond guesswork with AI-driven investment insights tailored to your strategy.
              </p>
            </div>

            {/* Bottom Glow Spotlight & Action Pill */}
            <div className="relative mt-8 flex flex-col items-center justify-center pt-2">
              {/* Monochromatic spotlight dome */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-t from-neutral-400/20 dark:from-white/25 via-neutral-300/10 dark:via-white/10 to-transparent blur-xl pointer-events-none rounded-full" />

              <button
                onClick={() => setIsAiModalOpen(true)}
                className="relative z-10 px-7 py-2.5 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-md dark:shadow-[0_0_25px_rgba(255,255,255,0.35)] transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <span>Explore AI Insights</span>
              </button>
            </div>
          </div>
        </div>

        {/* Column 2 (Middle): Watchlist (4 cols) */}
        <div className="md:col-span-4 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/[0.05]">
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white tracking-wide">Watchlist</h3>

              {/* Pill Switcher */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-white/[0.04] p-0.5 rounded-full border border-neutral-200/80 dark:border-white/[0.06]">
                <button
                  onClick={() => setWatchlistTab("MOST_VIEWED")}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    watchlistTab === "MOST_VIEWED"
                      ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Most Viewed
                </button>
                <button
                  onClick={() => setWatchlistTab("GAIN")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    watchlistTab === "GAIN"
                      ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Gain
                </button>
                <button
                  onClick={() => setWatchlistTab("LOSE")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    watchlistTab === "LOSE"
                      ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Lose
                </button>
              </div>
            </div>

            {/* Watchlist Rows */}
            <div className="space-y-3 mt-4">
              {watchlistData[watchlistTab].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 rounded-2xl hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center text-neutral-800 dark:text-neutral-200 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-900 dark:text-white transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">{item.ticker}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-mono font-semibold text-neutral-900 dark:text-white">{item.price}</p>
                      <p className={`text-[10px] font-mono font-medium ${item.isGain ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {item.change}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3 (Right): My Portfolio 2x2 Grid (4 cols) */}
        <div className="md:col-span-4 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/[0.05]">
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white tracking-wide">My Portfolio</h3>
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/[0.04] hover:bg-neutral-200 dark:hover:bg-white/[0.08] border border-neutral-200 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <span>See all</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {/* 2x2 Mini Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {portfolioAssets.map((asset) => {
                const Icon = asset.icon;
                return (
                  <div
                    key={asset.ticker}
                    className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#14141a] border border-neutral-200/80 dark:border-white/[0.06] hover:border-neutral-400 dark:hover:border-white/20 transition-all flex flex-col justify-between shadow-2xs cursor-pointer group"
                  >
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                        {asset.price}
                      </p>
                      <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                        {asset.delta}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-neutral-200/60 dark:border-white/[0.04]">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                        <Icon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                        <span className="font-semibold text-[11px] text-neutral-900 dark:text-white">{asset.ticker}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                        Units <strong className="text-neutral-800 dark:text-neutral-200">{asset.units}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Portfolio Performance Spline Chart Card (Full Width) */}
      <div className="rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] p-6 shadow-sm dark:shadow-2xl relative overflow-hidden">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-950 dark:text-white tracking-wide font-sans">
              Portfolio Performance
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Real-time asset appreciation index · Developed by Miskr Dires
            </p>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-white/[0.04] p-0.5 rounded-full border border-neutral-200 dark:border-white/[0.06]">
            {["1D", "1W", "1M", "6M", "1Y"].map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeTimeframe === tf
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive SVG Area Spline Chart Container */}
        <div className="relative w-full overflow-x-auto select-none pt-8 pb-4">
          {/* Floating Tooltip Card over Selected Point */}
          {selectedPoint && (
            <div
              className="absolute z-20 pointer-events-none transition-all duration-200 ease-out"
              style={{
                left: `${(selectedPoint.x / svgWidth) * 100}%`,
                top: `${(selectedPoint.y / svgHeight) * 100}%`,
                transform: "translate(-50%, -125%)",
              }}
            >
              <div className="rounded-2xl bg-white dark:bg-[#181822] border border-neutral-300 dark:border-white/20 p-3 shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md min-w-[140px]">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 pb-1 border-b border-neutral-100 dark:border-white/[0.06]">
                  <span>1st {selectedPoint.month} 2025</span>
                  <span className="text-neutral-400 font-mono tracking-widest">···</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">{selectedPoint.dollar}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    {selectedPoint.delta}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SVG Canvas */}
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48 sm:h-56 overflow-visible"
          >
            <defs>
              {/* Dark mode gradient */}
              <linearGradient id="areaGradientDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#0c0c10" stopOpacity="0" />
              </linearGradient>

              {/* Light mode gradient */}
              <linearGradient id="areaGradientLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.14" />
                <stop offset="60%" stopColor="#000000" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y-axis labels */}
            {[200, 150, 100, 50, 10].map((tick) => {
              const normalized = (tick - 10) / (200 - 10);
              const y = svgHeight - paddingY - normalized * (svgHeight - paddingY * 2);
              return (
                <g key={tick}>
                  <text
                    x={paddingX - 10}
                    y={y + 3}
                    textAnchor="end"
                    fill={labelColor}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {tick}k
                  </text>
                </g>
              );
            })}

            {/* Gradient Area Fill under spline */}
            <path
              d={areaD}
              fill={isDark ? "url(#areaGradientDark)" : "url(#areaGradientLight)"}
            />

            {/* Smooth Spline Curve */}
            <path
              d={pathD}
              fill="none"
              stroke={splineStroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              className={isDark ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)]"}
            />

            {/* Vertical Guideline to selected point */}
            {selectedPoint && (
              <g>
                <line
                  x1={selectedPoint.x}
                  y1={selectedPoint.y}
                  x2={selectedPoint.x}
                  y2={svgHeight - paddingY}
                  stroke={splineStroke}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity={isDark ? "0.7" : "0.5"}
                />
                {/* Concentric Dot */}
                <circle
                  cx={selectedPoint.x}
                  cy={selectedPoint.y}
                  r="7"
                  fill={isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.15)"}
                />
                <circle
                  cx={selectedPoint.x}
                  cy={selectedPoint.y}
                  r="4"
                  fill={isDark ? "#ffffff" : "#000000"}
                  stroke={isDark ? "#000000" : "#ffffff"}
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Interactive hover targets for all points */}
            {coords.map((pt, idx) => (
              <g
                key={pt.month}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredMonthIndex(idx)}
                onClick={() => setHoveredMonthIndex(idx)}
              >
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                <text
                  x={pt.x}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  fill={
                    hoveredMonthIndex === idx
                      ? isDark ? "#ffffff" : "#000000"
                      : isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)"
                  }
                  fontSize="10"
                  fontWeight={hoveredMonthIndex === idx ? "700" : "400"}
                  className="transition-colors font-mono"
                >
                  {pt.month}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* AI Insights Modal Dialog */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#121217] border border-neutral-200 dark:border-white/10 p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setIsAiModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white bg-neutral-100 dark:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950 dark:text-white">Helios AI Insights</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Autonomous risk analysis & alpha allocation · By Miskr Dires</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#181822] border border-neutral-200/80 dark:border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    Alpha Momentum Detected
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    High Confidence
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Spotify (SPOT) showing 16.31% breakout volume over the 30-day moving average. Projected continuation target: +8.4%.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#181822] border border-neutral-200/80 dark:border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />
                    Hedging Optimization
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200">
                    Balanced
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Reallocating 5% cash reserves into NVDA & MSFT units reduces overall portfolio volatility by 14.2%.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-sm cursor-pointer"
              >
                Apply Rebalance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

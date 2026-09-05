"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Search,
  Check,
  SquareCheck,
  Globe,
  DollarSign,
  BarChart2,
  Clock,
  Shield,
  Plus,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { toTiny } from "@/lib/tiny-text";
import Link from "next/link";

interface HeliosMarketViewProps {
  orgSlug: string;
  projectsCount?: number;
  membersCount?: number;
  recentProjects?: any[];
}

// Inline brand SVGs for pixel-perfect logos
function BitcoinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.6 14.8V18h-1.2v-1.2h-1.6V18H9.6v-1.2H8v-1.6c.44 0 .8-.36.8-.8V9.6c0-.44-.36-.8-.8-.8V7.2h1.6V6h1.2v1.2h1.6V6h1.2v1.2c1.33.15 2.4 1.1 2.4 2.4 0 .9-.54 1.68-1.32 2.06.94.33 1.62 1.23 1.62 2.34 0 1.48-1.12 2.65-2.7 2.8zm-1.8-6.6c0-.55-.45-1-1-1h-1v2h1c.55 0 1-.45 1-1zm.4 4c0-.66-.54-1.2-1.2-1.2h-1.2v2.4h1.2c.66 0 1.2-.54 1.2-1.2z" />
    </svg>
  );
}

function EthereumIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
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

function MicrosoftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 2h9.5v9.5H2V2zm10.5 0H22v9.5h-9.5V2zM2 12.5h9.5V22H2v-9.5zm10.5 0H22V22h-9.5v-9.5z" />
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

export function HeliosMarketView({
  orgSlug,
  projectsCount = 3,
  membersCount = 2,
  recentProjects = [],
}: HeliosMarketViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeCategory, setActiveCategory] = useState<"ALL" | "GAINERS" | "LOSERS" | "EQUITIES" | "CRYPTO">("ALL");
  const [activeTimeframe, setActiveTimeframe] = useState<string>("1D");
  const [selectedAssetForTrade, setSelectedAssetForTrade] = useState<any | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState(false);

  // Market indices summary
  const marketStats = [
    {
      title: "Helios Market Cap",
      val: "$3.48T",
      change: "+3.42%",
      isPositive: true,
      subtext: "24h Volume: $148.6B",
    },
    {
      title: "Greed & Sentiment",
      val: "82 / 100",
      change: "Bullish",
      isPositive: true,
      subtext: "Highest since Q1",
    },
    {
      title: "Edge Network Load",
      val: "2.4M req/s",
      change: "14ms",
      isPositive: true,
      subtext: "99.99% edge uptime",
    },
    {
      title: "Market Dominance",
      val: "BTC 58.4%",
      change: "+0.8%",
      isPositive: true,
      subtext: "ETH 16.2% · SOL 4.8%",
    },
  ];

  // Market spline chart data
  const marketChartPoints = [
    { time: "00:00", val: 120, label: "$3.34T" },
    { time: "04:00", val: 135, label: "$3.38T" },
    { time: "08:00", val: 130, label: "$3.36T" },
    { time: "12:00", val: 155, label: "$3.42T" },
    { time: "16:00", val: 175, label: "$3.46T" },
    { time: "20:00", val: 185, label: "$3.48T" },
  ];

  // Full asset screener data
  const assets = [
    {
      symbol: "BTC",
      name: "Bitcoin Core",
      pair: "BTC/USD",
      price: "$96,420.50",
      change: "+4.82%",
      isGain: true,
      volume: "$48.2B",
      marketCap: "$1.89T",
      category: "CRYPTO",
      icon: BitcoinIcon,
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corp",
      pair: "NASDAQ: NVDA",
      price: "$142.80",
      change: "+6.20%",
      isGain: true,
      volume: "$24.1B",
      marketCap: "$3.51T",
      category: "EQUITIES",
      icon: NvidiaIcon,
    },
    {
      symbol: "ETH",
      name: "Ethereum Network",
      pair: "ETH/USD",
      price: "$3,410.20",
      change: "+3.15%",
      isGain: true,
      volume: "$18.7B",
      marketCap: "$412.5B",
      category: "CRYPTO",
      icon: EthereumIcon,
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corp",
      pair: "NASDAQ: MSFT",
      price: "$448.90",
      change: "+2.45%",
      isGain: true,
      volume: "$11.2B",
      marketCap: "$3.33T",
      category: "EQUITIES",
      icon: MicrosoftIcon,
    },
    {
      symbol: "AMZN",
      name: "Amazon.com Inc",
      pair: "NASDAQ: AMZN",
      price: "$214.30",
      change: "+1.88%",
      isGain: true,
      volume: "$9.8B",
      marketCap: "$2.23T",
      category: "EQUITIES",
      icon: AmazonIcon,
    },
    {
      symbol: "AAPL",
      name: "Apple Inc",
      pair: "NASDAQ: AAPL",
      price: "$238.50",
      change: "-0.45%",
      isGain: false,
      volume: "$14.4B",
      marketCap: "$3.64T",
      category: "EQUITIES",
      icon: AppleIcon,
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc",
      pair: "NASDAQ: TSLA",
      price: "$265.10",
      change: "-1.82%",
      isGain: false,
      volume: "$16.8B",
      marketCap: "$845.2B",
      category: "EQUITIES",
      icon: NvidiaIcon,
    },
  ];

  const filteredAssets = assets.filter((asset) => {
    if (activeCategory === "ALL") return true;
    if (activeCategory === "GAINERS") return asset.isGain;
    if (activeCategory === "LOSERS") return !asset.isGain;
    if (activeCategory === "EQUITIES") return asset.category === "EQUITIES";
    if (activeCategory === "CRYPTO") return asset.category === "CRYPTO";
    return true;
  });

  const handleQuickTrade = (asset: any) => {
    setSelectedAssetForTrade(asset);
    setTradeSuccess(false);
  };

  const executeTrade = () => {
    setTradeSuccess(true);
    setTimeout(() => {
      setSelectedAssetForTrade(null);
      setTradeSuccess(false);
    }, 1800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Stat Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketStats.map((st, i) => (
          <div
            key={i}
            className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 font-sans">
                {st.title}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold ${
                  st.isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {st.change}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono">
                {st.val}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">
                {st.subtext}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global Market Composite Chart & Order Flow */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-950 dark:text-white font-sans">
                Helios Global Market Index
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                ● LIVE FEED
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Aggregated real-time equities, digital assets & sovereign liquidity · Developed by Miskr Dires
            </p>
          </div>

          {/* Timeframe Controls */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-white/[0.05] border border-neutral-200 dark:border-white/[0.08] text-xs">
            {["1H", "1D", "1W", "1M", "1Y", "ALL"].map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeTimeframe === tf
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                    : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Glowing SVG Spline */}
        <div className="relative h-64 sm:h-72 w-full pt-4">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 200">
            <defs>
              <linearGradient id="marketGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={isDark ? "0.25" : "0.15"} />
                <stop offset="100%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Fill */}
            <path
              d="M 0 160 C 180 140, 320 170, 500 110 C 680 50, 840 70, 1000 20 L 1000 200 L 0 200 Z"
              fill="url(#marketGradient)"
            />

            {/* Glowing Spline Line */}
            <path
              d="M 0 160 C 180 140, 320 170, 500 110 C 680 50, 840 70, 1000 20"
              fill="none"
              stroke={isDark ? "#ffffff" : "#000000"}
              strokeWidth="2.75"
              strokeLinecap="round"
              className="transition-all duration-300"
            />

            {/* Active Peak Indicator */}
            <circle cx="1000" cy="20" r="5" fill={isDark ? "#ffffff" : "#000000"} className="animate-ping" />
            <circle cx="1000" cy="20" r="4" fill={isDark ? "#ffffff" : "#000000"} />
            <circle cx="500" cy="110" r="4" fill={isDark ? "#ffffff" : "#000000"} />
          </svg>

          {/* Value Floating Callout */}
          <div className="absolute top-2 right-4 bg-black dark:bg-white text-white dark:text-black px-3.5 py-1.5 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2">
            <span className="text-xs font-mono font-bold">$3,482,910,000,000</span>
            <span className="text-[10px] font-mono font-semibold text-emerald-400 dark:text-emerald-700 bg-emerald-500/20 px-1.5 py-0.2 rounded">
              +3.42%
            </span>
          </div>
        </div>

        {/* X-Axis Ticks */}
        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 border-t border-neutral-100 dark:border-white/[0.05] pt-3">
          <span>00:00 UTC</span>
          <span>04:00 UTC</span>
          <span>08:00 UTC</span>
          <span>12:00 UTC</span>
          <span>16:00 UTC</span>
          <span>20:00 UTC</span>
        </div>
      </div>

      {/* Asset Screener & Real-Time Market Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-950 dark:text-white font-sans">
              Market Assets & Screener
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Live quote feeds, spread analysis, and instant allocation
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-white/[0.05] border border-neutral-200 dark:border-white/[0.08] text-xs">
            {(["ALL", "GAINERS", "LOSERS", "EQUITIES", "CRYPTO"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                    : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-white/[0.05] text-neutral-400 font-mono text-[10px] uppercase">
                <th className="pb-3 font-semibold pl-2">Asset</th>
                <th className="pb-3 font-semibold">Ticker</th>
                <th className="pb-3 font-semibold">Price</th>
                <th className="pb-3 font-semibold">24h Change</th>
                <th className="pb-3 font-semibold hidden sm:table-cell">24h Volume</th>
                <th className="pb-3 font-semibold hidden md:table-cell">Market Cap</th>
                <th className="pb-3 font-semibold text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.05]">
              {filteredAssets.map((asset) => {
                const IconComponent = asset.icon;
                return (
                  <tr
                    key={asset.symbol}
                    className="hover:bg-neutral-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-900 dark:text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-950 dark:text-white font-sans text-xs">
                            {asset.name}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {asset.symbol}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 font-mono text-neutral-600 dark:text-neutral-400 text-[11px]">
                      {asset.pair}
                    </td>

                    <td className="py-4 font-mono font-bold text-neutral-950 dark:text-white text-xs">
                      {asset.price}
                    </td>

                    <td className="py-4">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          asset.isGain
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {asset.isGain ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        <span>{asset.change}</span>
                      </span>
                    </td>

                    <td className="py-4 font-mono text-neutral-500 dark:text-neutral-400 text-[11px] hidden sm:table-cell">
                      {asset.volume}
                    </td>

                    <td className="py-4 font-mono text-neutral-500 dark:text-neutral-400 text-[11px] hidden md:table-cell">
                      {asset.marketCap}
                    </td>

                    <td className="py-4 text-right pr-2">
                      <button
                        onClick={() => handleQuickTrade(asset)}
                        className="px-3 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-sans font-medium text-xs transition-all cursor-pointer shadow-2xs"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workspace Connected Infrastructure & Telemetry Link */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center flex-shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-950 dark:text-white">
              Tenant Microservices & Edge Pipelines ({projectsCount})
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              High-throughput edge proxies routing to workspace {orgSlug}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${orgSlug}/projects`}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-neutral-900 dark:text-white transition-all"
          >
            Manage Services
          </Link>
          <Link
            href={`/${orgSlug}/dashboard`}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs"
          >
            Back to Wallet
          </Link>
        </div>
      </div>

      {/* Quick Trade Confirmation Modal */}
      {selectedAssetForTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121218] border border-neutral-200 dark:border-white/10 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-mono font-bold text-xs">
                  {selectedAssetForTrade.symbol}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Execute Trade: {selectedAssetForTrade.name}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                    {selectedAssetForTrade.pair} · Market Order
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAssetForTrade(null)}
                className="text-neutral-400 hover:text-black dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.06] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Current Price:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  {selectedAssetForTrade.price}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Execution Fee:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  $0.00 (Zero Slippage)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Allocated From:</span>
                <span className="font-mono text-neutral-900 dark:text-white">Helios USD Vault</span>
              </div>
            </div>

            {tradeSuccess ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
                <SquareCheck className="h-4 w-4" />
                <span>Order Filled Instantly at {selectedAssetForTrade.price}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedAssetForTrade(null)}
                  className="flex-1 py-2.5 rounded-full text-xs font-medium text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeTrade}
                  className="flex-1 py-2.5 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs cursor-pointer"
                >
                  Confirm Trade
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Activity, TrendingUp, Clock, Zap, ArrowUpRight } from "lucide-react";

export function TelemetryCharts() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 30 days of realistic tenant API metrics
  const data = [
    { day: "Aug 05", requests: 8420, p99: 22 },
    { day: "Aug 06", requests: 8940, p99: 20 },
    { day: "Aug 07", requests: 9310, p99: 19 },
    { day: "Aug 08", requests: 8750, p99: 21 },
    { day: "Aug 09", requests: 7920, p99: 18 },
    { day: "Aug 10", requests: 7410, p99: 16 },
    { day: "Aug 11", requests: 9650, p99: 21 },
    { day: "Aug 12", requests: 10240, p99: 19 },
    { day: "Aug 13", requests: 11100, p99: 18 },
    { day: "Aug 14", requests: 10890, p99: 20 },
    { day: "Aug 15", requests: 11500, p99: 17 },
    { day: "Aug 16", requests: 8900, p99: 15 },
    { day: "Aug 17", requests: 9200, p99: 16 },
    { day: "Aug 18", requests: 12400, p99: 19 },
    { day: "Aug 19", requests: 12950, p99: 18 },
    { day: "Aug 20", requests: 13200, p99: 17 },
    { day: "Aug 21", requests: 13100, p99: 16 },
    { day: "Aug 22", requests: 13850, p99: 18 },
    { day: "Aug 23", requests: 10200, p99: 15 },
    { day: "Aug 24", requests: 10500, p99: 14 },
    { day: "Aug 25", requests: 13900, p99: 18 },
    { day: "Aug 26", requests: 14200, p99: 17 },
    { day: "Aug 27", requests: 14650, p99: 16 },
    { day: "Aug 28", requests: 14400, p99: 17 },
    { day: "Aug 29", requests: 14980, p99: 15 },
    { day: "Aug 30", requests: 11200, p99: 14 },
    { day: "Aug 31", requests: 11800, p99: 14 },
    { day: "Sep 01", requests: 15120, p99: 16 },
    { day: "Sep 02", requests: 15480, p99: 15 },
    { day: "Sep 03", requests: 16240, p99: 14 },
  ];

  const maxVal = Math.max(...data.map((d) => d.requests));
  const minVal = Math.min(...data.map((d) => d.requests));

  // Compute SVG coordinates
  const width = 800;
  const height = 180;
  const paddingX = 20;
  const paddingY = 20;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((d.requests - minVal) / (maxVal - minVal)) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const activeIndex = hoveredIndex !== null ? hoveredIndex : points.length - 1;
  const activeData = points[activeIndex];

  return (
    <div className="rounded-3xl bg-[#13131b] border border-white/[0.08] shadow-xl p-5 sm:p-6 space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.05] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-fuchsia-400" />
            <h3 className="text-sm font-semibold text-white">Edge Ingress & Latency</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live · us-east-1
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Aggregated traffic volume and p99 latency distribution across edge nodes.
          </p>
        </div>

        {/* Real-time Hover Readout */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span>Date:</span>
            <strong className="text-white">{activeData.day}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span>Throughput:</span>
            <strong className="text-fuchsia-300">{activeData.requests.toLocaleString()} reqs</strong>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span>p99:</span>
            <strong className="text-emerald-400">{activeData.p99}ms</strong>
          </div>
        </div>
      </div>

      {/* SVG Interactive Area Chart */}
      <div className="relative w-full h-[180px] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#e879f9" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(255, 255, 255, 0.04)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="rgba(255, 255, 255, 0.04)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(255, 255, 255, 0.04)"
            strokeDasharray="4 4"
          />

          {/* Area Fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Primary Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#e879f9"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]"
          />

          {/* Active Hover Point Line & Dot */}
          {activeData && (
            <g>
              <line
                x1={activeData.x}
                y1={paddingY}
                x2={activeData.x}
                y2={height}
                stroke="#e879f9"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <circle
                cx={activeData.x}
                cy={activeData.y}
                r="6"
                fill="#ffffff"
                stroke="#e879f9"
                strokeWidth="2.5"
                className="drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]"
              />
            </g>
          )}

          {/* Transparent Overlay Bars for Smooth Hover Detection */}
          {points.map((p, idx) => (
            <rect
              key={p.day}
              x={p.x - width / points.length / 2}
              y={0}
              width={width / points.length}
              height={height}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>
      </div>

      {/* Footer Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/[0.05] text-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-mono">AVG THROUGHPUT</span>
          <p className="font-semibold text-white font-mono">11,940 req/day</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-mono">PEAK VOLUME</span>
          <p className="font-semibold text-white font-mono">16,240 reqs</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-mono">MEDIAN LATENCY</span>
          <p className="font-semibold text-white font-mono">16.4ms</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-mono">EDGE AVAILABILITY</span>
          <p className="font-semibold text-emerald-400 font-mono">99.995%</p>
        </div>
      </div>
    </div>
  );
}

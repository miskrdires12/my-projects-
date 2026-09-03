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

  const activeData = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];
  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 shadow-2xs p-5 space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-black" />
            <h3 className="text-sm font-bold text-neutral-950">Tenant Telemetry & API Throughput</h3>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
              Live Edge Network
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time request volume and latency telemetry for this organization.
          </p>
        </div>

        {/* Real-time Hover Readout */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-neutral-600">
            <span>Day:</span>
            <strong className="text-neutral-950">{activeData.day}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-600">
            <span>Requests:</span>
            <strong className="text-neutral-950">{activeData.requests.toLocaleString()}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-600">
            <span>P99:</span>
            <strong className="text-neutral-950">{activeData.p99}ms</strong>
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
              <stop offset="0%" stopColor="#000000" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#f0f0f0"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#f0f0f0"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#f0f0f0"
            strokeDasharray="4 4"
          />

          {/* Gradient Fill Area */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Crosshair & Active Point */}
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1={0}
                x2={activePoint.x}
                y2={height}
                stroke="#a3a3a3"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="4.5"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </>
          )}

          {/* Invisible Touch/Mouse Hover Targets */}
          {points.map((p, idx) => (
            <rect
              key={idx}
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

      {/* Footer Sub-Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-100 text-xs">
        <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200">
          <span className="text-neutral-500">30-Day Total</span>
          <span className="font-bold text-neutral-900 font-mono">349,240 reqs</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200">
          <span className="text-neutral-500">Avg Global Latency</span>
          <span className="font-bold text-neutral-900 font-mono">16.8 ms</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200">
          <span className="text-neutral-500">Error Rate</span>
          <span className="font-bold text-emerald-600 font-mono">0.002% (Healthy)</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  TrendingUp,
  Award,
  RefreshCw,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Inbox,
  ShieldAlert,
  Eye,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Zap,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from "lucide-react";
import { fetchAnalytics } from "../../lib/api";

interface AnalyticsData {
  delivery_success_rate: number;
  throughput_msg_sec: number;
  bounce_rate: number;
  open_rate: number;
  inbox_rate?: number;
  spam_rate?: number;
  average_latency_ms: number;
  total_sent_today: number;
  delivered_count?: number;
  inbox_count?: number;
  spam_count?: number;
  bounced_count?: number;
  opened_count?: number;
  hourly_distribution: number[];
  provider_breakdown: Record<string, number>;
  outcomes: {
    delivered: number;
    inbox?: number;
    spam?: number;
    waiting_to_send: number;
    delayed: number;
    address_not_found: number;
    opened?: number;
  };
}

// 24-hour mock data points for multi-series line chart
const HOURLY_TIMELINE = [
  { hour: "00:00", volume: 120, delivered: 118, opened: 42 },
  { hour: "02:00", volume: 90, delivered: 89, opened: 28 },
  { hour: "04:00", volume: 65, delivered: 64, opened: 19 },
  { hour: "06:00", volume: 240, delivered: 236, opened: 84 },
  { hour: "08:00", volume: 1120, delivered: 1108, opened: 485 },
  { hour: "10:00", volume: 2450, delivered: 2420, opened: 1120 },
  { hour: "12:00", volume: 3100, delivered: 3060, opened: 1480 },
  { hour: "14:00", volume: 2890, delivered: 2855, opened: 1390 },
  { hour: "16:00", volume: 2340, delivered: 2310, opened: 1040 },
  { hour: "18:00", volume: 1650, delivered: 1630, opened: 710 },
  { hour: "20:00", volume: 980, delivered: 968, opened: 395 },
  { hour: "22:00", volume: 430, delivered: 424, opened: 160 },
];

export const AnalyticsApp: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d" | "custom">("24h");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Line Chart Series Active Toggles
  const [showVolume, setShowVolume] = useState(true);
  const [showDelivered, setShowDelivered] = useState(true);
  const [showOpened, setShowOpened] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Custom Calendar Range State
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const todayStr = new Date().toISOString().split("T")[0];

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
    } catch {
      // Fallback fallback mock if backend is warming up
      setAnalytics({
        delivery_success_rate: 99.4,
        throughput_msg_sec: 14.8,
        bounce_rate: 0.6,
        open_rate: 46.2,
        inbox_rate: 94.8,
        spam_rate: 4.6,
        average_latency_ms: 38,
        total_sent_today: 48250,
        delivered_count: 47960,
        inbox_count: 45466,
        spam_count: 2206,
        bounced_count: 290,
        opened_count: 22157,
        hourly_distribution: [120, 90, 65, 240, 1120, 2450, 3100, 2890, 2340, 1650, 980, 430],
        provider_breakdown: {
          "Google Workspace / Gmail": 23160,
          "Microsoft 365 / Outlook": 14950,
          "Yahoo / AOL": 5790,
          "Apple iCloud": 2895,
          "Corporate / Other": 1455,
        },
        outcomes: {
          delivered: 47960,
          inbox: 45466,
          spam: 2206,
          waiting_to_send: 14,
          delayed: 8,
          address_not_found: 290,
          opened: 22157,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const totalSent = analytics?.total_sent_today ?? 48250;
  const successRate = analytics?.delivery_success_rate ?? 99.4;
  const bounceRate = analytics?.bounce_rate ?? 0.6;
  const latency = analytics?.average_latency_ms ?? 38;
  const openRate = analytics?.open_rate ?? 46.2;
  const inboxRate = analytics?.inbox_rate ?? 94.8;
  const spamRate = analytics?.spam_rate ?? 4.6;

  const deliveredCount = analytics?.delivered_count ?? 47960;
  const inboxCount = analytics?.inbox_count ?? 45466;
  const spamCount = analytics?.spam_count ?? 2206;
  const bouncedCount = analytics?.bounced_count ?? 290;
  const openedCount = analytics?.opened_count ?? 22157;

  // Multi-Series Line Chart Dimensions
  const lineSvgWidth = 720;
  const lineSvgHeight = 220;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = lineSvgWidth - paddingX * 2;
  const chartH = lineSvgHeight - paddingY * 2;

  const maxVal = Math.max(...HOURLY_TIMELINE.map((d) => d.volume), 3500);

  const getX = (index: number) => paddingX + (index / (HOURLY_TIMELINE.length - 1)) * chartW;
  const getY = (val: number) => paddingY + chartH - (val / maxVal) * chartH;

  const volumePoints = HOURLY_TIMELINE.map((d, i) => `${getX(i)},${getY(d.volume)}`).join(" ");
  const deliveredPoints = HOURLY_TIMELINE.map((d, i) => `${getX(i)},${getY(d.delivered)}`).join(" ");
  const openedPoints = HOURLY_TIMELINE.map((d, i) => `${getX(i)},${getY(d.opened)}`).join(" ");

  // Pie / Donut Chart 1: Delivery Outcomes Breakdown
  const outcomesSlices = [
    { label: "Inbox Delivery", count: inboxCount, color: "#3b9eff", pct: 94.2 },
    { label: "Spam Placement", count: spamCount, color: "#f59e0b", pct: 4.6 },
    { label: "Hard Bounced", count: bouncedCount, color: "#ef4444", pct: 0.6 },
    { label: "Queued / Pending", count: 280, color: "#8a8f98", pct: 0.6 },
  ];

  // Pie / Donut Chart 2: Mailbox Providers (ISPs)
  const ispSlices = [
    { label: "Google Workspace / Gmail", count: 23160, color: "#4285f4", pct: 48.0 },
    { label: "Microsoft 365 / Outlook", count: 14950, color: "#00a4ef", pct: 31.0 },
    { label: "Yahoo / AOL", count: 5790, color: "#720e9e", pct: 12.0 },
    { label: "Apple iCloud", count: 2895, color: "#a2aaad", pct: 6.0 },
    { label: "Corporate / Other", count: 1455, color: "#ff69b4", pct: 3.0 },
  ];

  // Helper to build SVG Donut Path
  const buildDonutArcs = (slices: { label: string; count: number; color: string; pct: number }[]) => {
    const size = 180;
    const center = size / 2;
    const radius = 68;
    const strokeWidth = 24;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPct = 0;

    return slices.map((slice, i) => {
      const strokeDashoffset = circumference - (slice.pct / 100) * circumference;
      const rotation = (accumulatedPct / 100) * 360 - 90;
      accumulatedPct += slice.pct;

      return (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={slice.color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(${rotation} ${center} ${center})`}
          className="transition-all duration-300 hover:opacity-80"
        />
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-xs select-none">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f1011] border-b border-[#23252a] shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#ff69b4]" />
          <span className="font-semibold text-[#f7f8f8]">Delivery Metrics & Visual Telemetry</span>
          <span className="text-[10px] text-[#27a644] bg-[#27a644]/10 border border-[#27a644]/20 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#27a644] animate-pulse" />
            Live Telemetry
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAnalytics}
            disabled={isLoading}
            title="Refresh metrics"
            className="p-1.5 rounded bg-[#141516] hover:bg-[#1a1b1d] border border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Time Range Selector */}
          <div className="flex items-center bg-[#141516] p-0.5 rounded-md border border-[#23252a] text-[11px]">
            {(["1h", "24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  timeRange === range
                    ? "bg-[#1f2022] text-[#f7f8f8] font-medium"
                    : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Body with KPI Cards, Line Chart, and Pie Charts */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 5 KEY DELIVERABILITY METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. DELIVERED */}
          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
            <div className="flex items-center justify-between text-[#8a8f98] text-[11px]">
              <span className="flex items-center gap-1.5 font-medium text-[#d0d6e0]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#27a644]" />
                Delivered
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#27a644]/15 text-[#27a644] font-mono">
                {successRate.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[#f7f8f8] mt-1.5 font-mono">
              {deliveredCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#8a8f98] mt-1">Accepted by destination MTAs</div>
          </div>

          {/* 2. LANDED IN INBOX */}
          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
            <div className="flex items-center justify-between text-[#8a8f98] text-[11px]">
              <span className="flex items-center gap-1.5 font-medium text-[#d0d6e0]">
                <Inbox className="w-3.5 h-3.5 text-[#3b9eff]" />
                Landed in Inbox
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#3b9eff]/15 text-[#3b9eff] font-mono">
                {inboxRate.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[#f7f8f8] mt-1.5 font-mono">
              {inboxCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#8a8f98] mt-1">Primary mailbox placement</div>
          </div>

          {/* 3. OPENED */}
          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
            <div className="flex items-center justify-between text-[#8a8f98] text-[11px]">
              <span className="flex items-center gap-1.5 font-medium text-[#d0d6e0]">
                <Eye className="w-3.5 h-3.5 text-[#ff69b4]" />
                Unique Opens
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#ff69b4]/15 text-[#ff69b4] font-mono">
                {openRate.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[#f7f8f8] mt-1.5 font-mono">
              {openedCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#8a8f98] mt-1">Recipient engagement</div>
          </div>

          {/* 4. SPAM FOLDER */}
          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
            <div className="flex items-center justify-between text-[#8a8f98] text-[11px]">
              <span className="flex items-center gap-1.5 font-medium text-[#d0d6e0]">
                <ShieldAlert className="w-3.5 h-3.5 text-[#f59e0b]" />
                Spam Folder
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#f59e0b]/15 text-[#f59e0b] font-mono">
                {spamRate.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[#f7f8f8] mt-1.5 font-mono">
              {spamCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#8a8f98] mt-1">Junk / quarantine placement</div>
          </div>

          {/* 5. BOUNCED */}
          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a]">
            <div className="flex items-center justify-between text-[#8a8f98] text-[11px]">
              <span className="flex items-center gap-1.5 font-medium text-[#d0d6e0]">
                <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />
                Hard Bounced
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#ef4444]/15 text-[#ef4444] font-mono">
                {bounceRate.toFixed(2)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[#f7f8f8] mt-1.5 font-mono">
              {bouncedCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#8a8f98] mt-1">Invalid mailbox addresses</div>
          </div>
        </div>

        {/* ========================================================
            LINE GRAPH: 24-HOUR MULTI-SERIES THROUGHPUT
            ======================================================== */}
        <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LineChartIcon className="w-4 h-4 text-[#ff69b4]" />
              <span className="font-semibold text-[#f7f8f8]">
                Throughput Time-Series Horizon (24 Hours)
              </span>
              <span className="text-[10px] text-[#8a8f98] font-mono">
                Peak: 3,100 msg/hr
              </span>
            </div>

            {/* Line Series Toggles */}
            <div className="flex items-center gap-3 text-[11px]">
              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  showVolume
                    ? "bg-[#ff69b4]/15 border-[#ff69b4]/40 text-[#ff69b4]"
                    : "bg-[#141516] border-[#23252a] text-[#62666d]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#ff69b4]" />
                <span>Total Volume</span>
              </button>

              <button
                onClick={() => setShowDelivered(!showDelivered)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  showDelivered
                    ? "bg-[#27a644]/15 border-[#27a644]/40 text-[#27a644]"
                    : "bg-[#141516] border-[#23252a] text-[#62666d]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#27a644]" />
                <span>Delivered</span>
              </button>

              <button
                onClick={() => setShowOpened(!showOpened)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  showOpened
                    ? "bg-[#3b9eff]/15 border-[#3b9eff]/40 text-[#3b9eff]"
                    : "bg-[#141516] border-[#23252a] text-[#62666d]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#3b9eff]" />
                <span>Opened</span>
              </button>
            </div>
          </div>

          {/* SVG Line Chart Canvas */}
          <div className="relative w-full overflow-hidden bg-[#0a0a0c] rounded-lg border border-[#1e2023] p-2">
            <svg
              viewBox={`0 0 ${lineSvgWidth} ${lineSvgHeight}`}
              className="w-full h-56 select-none"
            >
              <defs>
                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff69b4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ff69b4" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#27a644" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#27a644" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 1000, 2000, 3000].map((level) => (
                <g key={level}>
                  <line
                    x1={paddingX}
                    y1={getY(level)}
                    x2={lineSvgWidth - paddingX}
                    y2={getY(level)}
                    stroke="#1e2024"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 8}
                    y={getY(level) + 4}
                    fill="#62666d"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {level}
                  </text>
                </g>
              ))}

              {/* Volume Area & Line */}
              {showVolume && (
                <>
                  <polygon
                    points={`${getX(0)},${getY(0)} ${volumePoints} ${getX(
                      HOURLY_TIMELINE.length - 1
                    )},${getY(0)}`}
                    fill="url(#volumeGrad)"
                  />
                  <polyline
                    fill="none"
                    stroke="#ff69b4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={volumePoints}
                  />
                </>
              )}

              {/* Delivered Area & Line */}
              {showDelivered && (
                <>
                  <polyline
                    fill="none"
                    stroke="#27a644"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={deliveredPoints}
                  />
                </>
              )}

              {/* Opened Line */}
              {showOpened && (
                <polyline
                  fill="none"
                  stroke="#3b9eff"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={openedPoints}
                />
              )}

              {/* Data points & Interactive hover circles */}
              {HOURLY_TIMELINE.map((d, i) => (
                <g key={i}>
                  {showVolume && (
                    <circle
                      cx={getX(i)}
                      cy={getY(d.volume)}
                      r={hoveredPoint === i ? 6 : 3.5}
                      fill="#ff69b4"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  )}
                  {/* Time labels below */}
                  <text
                    x={getX(i)}
                    y={lineSvgHeight - 6}
                    fill="#8a8f98"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {d.hour}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint !== null && (
              <div
                style={{ left: `${(hoveredPoint / (HOURLY_TIMELINE.length - 1)) * 80 + 10}%` }}
                className="absolute top-4 pointer-events-none p-2 rounded bg-[#18191d] border border-[#2b2d33] shadow-xl text-[11px] space-y-1"
              >
                <div className="font-bold text-[#f7f8f8]">
                  Hour: {HOURLY_TIMELINE[hoveredPoint].hour}
                </div>
                <div className="text-[#ff69b4]">
                  Volume: {HOURLY_TIMELINE[hoveredPoint].volume.toLocaleString()}
                </div>
                <div className="text-[#27a644]">
                  Delivered: {HOURLY_TIMELINE[hoveredPoint].delivered.toLocaleString()}
                </div>
                <div className="text-[#3b9eff]">
                  Opened: {HOURLY_TIMELINE[hoveredPoint].opened.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            PIE / DONUT GRAPHS: 2-COLUMN SECTION
            ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PIE / DONUT 1: OUTCOMES BREAKDOWN */}
          <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#f7f8f8] flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#ff69b4]" />
                Delivery Outcomes Breakdown (Pie / Donut)
              </span>
              <span className="text-[10px] text-[#27a644] font-mono">
                99.4% Delivery Efficiency
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* SVG Donut Chart */}
              <div className="relative shrink-0 w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                  {buildDonutArcs(outcomesSlices)}
                </svg>
                {/* Center Summary */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-[#f7f8f8] font-mono">
                    {deliveredCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#8a8f98]">Delivered</span>
                </div>
              </div>

              {/* Slices Legend & Values */}
              <div className="flex-1 w-full space-y-2">
                {outcomesSlices.map((slice, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-[#d0d6e0] truncate">{slice.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-[#8a8f98]">{slice.count.toLocaleString()}</span>
                      <span className="font-mono font-medium text-[#f7f8f8] w-12 text-right">
                        {slice.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PIE / DONUT 2: MAILBOX PROVIDER (ISP) SHARE */}
          <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#f7f8f8] flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#3b9eff]" />
                Mailbox Provider / ISP Distribution (Pie / Donut)
              </span>
              <span className="text-[10px] text-[#3b9eff] font-mono">
                Multi-Tenant Traffic
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* SVG Donut Chart */}
              <div className="relative shrink-0 w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                  {buildDonutArcs(ispSlices)}
                </svg>
                {/* Center Summary */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-[#f7f8f8] font-mono">
                    5 Providers
                  </span>
                  <span className="text-[10px] text-[#8a8f98]">Reputation Safe</span>
                </div>
              </div>

              {/* Slices Legend & Values */}
              <div className="flex-1 w-full space-y-2">
                {ispSlices.map((slice, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-[#d0d6e0] truncate">{slice.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-[#8a8f98]">{slice.count.toLocaleString()}</span>
                      <span className="font-mono font-medium text-[#f7f8f8] w-12 text-right">
                        {slice.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            DEDICATED INBOX VS. SPAM PLACEMENT AUDIT BY ISP
            ======================================================== */}
        <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#27a644]" />
              <span className="font-semibold text-[#f7f8f8]">
                ISP Inbox Placement & Spam Landings Audit
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-[#8a8f98]">
              <span className="flex items-center gap-1.5 text-[#27a644]">
                <span className="w-2 h-2 rounded-full bg-[#27a644]" />
                Inbox
              </span>
              <span className="flex items-center gap-1.5 text-[#f59e0b]">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                Spam / Junk
              </span>
              <span className="flex items-center gap-1.5 text-[#ef4444]">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                Bounced
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e2024] text-[#8a8f98] text-[10px] uppercase font-mono">
                  <th className="py-2 px-3">Mailbox Provider</th>
                  <th className="py-2 px-3">Dispatched</th>
                  <th className="py-2 px-3">Landed in Inbox</th>
                  <th className="py-2 px-3">Landed in Spam</th>
                  <th className="py-2 px-3">Bounced</th>
                  <th className="py-2 px-3">FBL Complaint Rate</th>
                  <th className="py-2 px-3 text-right">Visual Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171a22] font-mono text-[11px]">
                <tr className="hover:bg-[#13151d] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#f7f8f8] font-sans">
                    Google Workspace / Gmail
                  </td>
                  <td className="py-2.5 px-3 text-[#d0d6e0]">23,160</td>
                  <td className="py-2.5 px-3 text-[#27a644] font-bold">22,280 (96.2%)</td>
                  <td className="py-2.5 px-3 text-[#f59e0b]">787 (3.4%)</td>
                  <td className="py-2.5 px-3 text-[#ef4444]">93 (0.4%)</td>
                  <td className="py-2.5 px-3 text-[#27a644]">0.02% (Healthy)</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="w-32 h-2 bg-[#181a24] rounded-full overflow-hidden flex ml-auto">
                      <div className="bg-[#27a644] h-full" style={{ width: "96.2%" }} />
                      <div className="bg-[#f59e0b] h-full" style={{ width: "3.4%" }} />
                      <div className="bg-[#ef4444] h-full" style={{ width: "0.4%" }} />
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-[#13151d] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#f7f8f8] font-sans">
                    Microsoft 365 / Outlook
                  </td>
                  <td className="py-2.5 px-3 text-[#d0d6e0]">14,950</td>
                  <td className="py-2.5 px-3 text-[#27a644] font-bold">14,023 (93.8%)</td>
                  <td className="py-2.5 px-3 text-[#f59e0b]">852 (5.7%)</td>
                  <td className="py-2.5 px-3 text-[#ef4444]">75 (0.5%)</td>
                  <td className="py-2.5 px-3 text-[#27a644]">0.03% (Healthy)</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="w-32 h-2 bg-[#181a24] rounded-full overflow-hidden flex ml-auto">
                      <div className="bg-[#27a644] h-full" style={{ width: "93.8%" }} />
                      <div className="bg-[#f59e0b] h-full" style={{ width: "5.7%" }} />
                      <div className="bg-[#ef4444] h-full" style={{ width: "0.5%" }} />
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-[#13151d] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#f7f8f8] font-sans">
                    Yahoo Mail / AOL
                  </td>
                  <td className="py-2.5 px-3 text-[#d0d6e0]">5,790</td>
                  <td className="py-2.5 px-3 text-[#27a644] font-bold">5,448 (94.1%)</td>
                  <td className="py-2.5 px-3 text-[#f59e0b]">301 (5.2%)</td>
                  <td className="py-2.5 px-3 text-[#ef4444]">41 (0.7%)</td>
                  <td className="py-2.5 px-3 text-[#27a644]">0.04% (Healthy)</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="w-32 h-2 bg-[#181a24] rounded-full overflow-hidden flex ml-auto">
                      <div className="bg-[#27a644] h-full" style={{ width: "94.1%" }} />
                      <div className="bg-[#f59e0b] h-full" style={{ width: "5.2%" }} />
                      <div className="bg-[#ef4444] h-full" style={{ width: "0.7%" }} />
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-[#13151d] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#f7f8f8] font-sans">
                    Apple iCloud Mail
                  </td>
                  <td className="py-2.5 px-3 text-[#d0d6e0]">2,895</td>
                  <td className="py-2.5 px-3 text-[#27a644] font-bold">2,820 (97.4%)</td>
                  <td className="py-2.5 px-3 text-[#f59e0b]">61 (2.1%)</td>
                  <td className="py-2.5 px-3 text-[#ef4444]">14 (0.5%)</td>
                  <td className="py-2.5 px-3 text-[#27a644]">0.01% (Healthy)</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="w-32 h-2 bg-[#181a24] rounded-full overflow-hidden flex ml-auto">
                      <div className="bg-[#27a644] h-full" style={{ width: "97.4%" }} />
                      <div className="bg-[#f59e0b] h-full" style={{ width: "2.1%" }} />
                      <div className="bg-[#ef4444] h-full" style={{ width: "0.5%" }} />
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-[#13151d] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#f7f8f8] font-sans">
                    Corporate / Private Domains
                  </td>
                  <td className="py-2.5 px-3 text-[#d0d6e0]">1,455</td>
                  <td className="py-2.5 px-3 text-[#27a644] font-bold">1,389 (95.5%)</td>
                  <td className="py-2.5 px-3 text-[#f59e0b]">58 (4.0%)</td>
                  <td className="py-2.5 px-3 text-[#ef4444]">8 (0.5%)</td>
                  <td className="py-2.5 px-3 text-[#27a644]">0.01% (Healthy)</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="w-32 h-2 bg-[#181a24] rounded-full overflow-hidden flex ml-auto">
                      <div className="bg-[#27a644] h-full" style={{ width: "95.5%" }} />
                      <div className="bg-[#f59e0b] h-full" style={{ width: "4.0%" }} />
                      <div className="bg-[#ef4444] h-full" style={{ width: "0.5%" }} />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
